import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const NOTION_VERSION = "2022-06-28";
const token = process.env.NOTION_TOKEN;
const inputPath = resolve("src/data/trip.json");
const menuOutputDir = resolve("public/notion-menus");
const menuPublicPath = "/notion-menus";

if (!token) {
  console.error("Missing NOTION_TOKEN.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "Notion-Version": NOTION_VERSION,
};

async function notionFetch(path, init = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Notion ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchBlockChildren(blockId) {
  const children = [];
  let cursor;

  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (cursor) params.set("start_cursor", cursor);
    const result = await notionFetch(`/blocks/${blockId}/children?${params.toString()}`);
    children.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  return children;
}

async function fetchBlockTree(blockId) {
  const children = await fetchBlockChildren(blockId);
  const descendants = [];

  for (const child of children) {
    descendants.push(child);
    if (child.has_children) descendants.push(...(await fetchBlockTree(child.id)));
  }

  return descendants;
}

function textFromRichText(value) {
  return Array.isArray(value) ? value.map((part) => part.plain_text ?? "").join("") : "";
}

function propertyText(property) {
  if (!property) return "";
  if (property.type === "title") return textFromRichText(property.title);
  if (property.type === "rich_text") return textFromRichText(property.rich_text);
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "multi_select") return property.multi_select?.map((item) => item.name).join(", ") ?? "";
  if (property.type === "date") return property.date?.start ?? "";
  if (property.type === "url") return property.url ?? "";
  if (property.type === "email") return property.email ?? "";
  if (property.type === "phone_number") return property.phone_number ?? "";
  if (property.type === "number") return property.number?.toString() ?? "";
  return "";
}

function relationPageIds(property) {
  if (!property || property.type !== "relation") return [];
  return property.relation?.map((page) => page.id).filter(Boolean) ?? [];
}

function findProperty(properties, candidates) {
  const entries = Object.entries(properties);
  for (const candidate of candidates) {
    const match = entries.find(([name]) => name.toLowerCase() === candidate.toLowerCase());
    if (match) return match[1];
  }
  return undefined;
}

function pageIdFromNotionUrl(url) {
  const match = url?.match(/[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  return match?.[0] ?? "";
}

function sanitizeFilePart(value) {
  return (value || "menu")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase() || "menu";
}

function fileExtensionFromUrl(url, fallback = "pdf") {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase();
    if (extension && extension.length <= 6) return extension;
  } catch {
    // Keep the fallback for Notion signed URLs that are not valid URL strings.
  }
  return fallback;
}

function blockCaption(block) {
  const value = block[block.type];
  return textFromRichText(value?.caption).trim();
}

function pdfSourceFromBlock(block) {
  const value = block[block.type];
  if (!value) return null;

  if (block.type === "pdf" || block.type === "file") {
    const url = value.type === "external" ? value.external?.url : value.file?.url;
    if (!url) return null;

    const label = blockCaption(block) || value.name || "Menu PDF";
    return {
      label,
      url,
      shouldDownload: value.type === "file",
      skipOnDownloadFailure: value.type === "file",
      extension: fileExtensionFromUrl(value.name || url, "pdf"),
    };
  }

  if ((block.type === "embed" || block.type === "bookmark") && /\.pdf($|[?#])/i.test(value.url ?? "")) {
    return {
      label: blockCaption(block) || "Menu PDF",
      url: value.url,
      shouldDownload: true,
      skipOnDownloadFailure: false,
      extension: "pdf",
    };
  }

  return null;
}

async function downloadMenuFile(source, itemTitle, blockId) {
  await mkdir(menuOutputDir, { recursive: true });

  const extension = source.extension || "pdf";
  const filename = `${sanitizeFilePart(itemTitle)}-${blockId.replaceAll("-", "").slice(0, 10)}.${extension}`;
  const outputFile = resolve(menuOutputDir, filename);
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(`Menu PDF download failed ${response.status}: ${source.url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputFile, buffer);
  return `${menuPublicPath}/${filename}`;
}

async function collectMenuEmbedsFromPage(page, itemTitle) {
  const blocks = await fetchBlockTree(page.id);
  const embeds = [];
  const seenUrls = new Set();

  for (const block of blocks) {
    const source = pdfSourceFromBlock(block);
    if (!source || seenUrls.has(source.url)) continue;

    let url = source.url;
    if (source.shouldDownload) {
      try {
        url = await downloadMenuFile(source, itemTitle, block.id);
      } catch (error) {
        console.warn(error.message);
        if (source.skipOnDownloadFailure) continue;
      }
    }

    embeds.push({
      label: source.label,
      url,
    });
    seenUrls.add(source.url);
  }

  return embeds;
}

function isFoodItem(item, relatedPages) {
  if (item.type === "food" || item.restaurantGuide) return true;

  return relatedPages.some((page) => {
    const category = propertyText(findProperty(page.properties, ["Type", "類型", "Category"])).toLowerCase();
    return category.includes("food") || category.includes("restaurant") || category.includes("餐");
  });
}

async function notionPagesForItem(item) {
  const itemPageId = pageIdFromNotionUrl(item.notionUrl);
  if (!itemPageId) return [];

  const itemPage = await notionFetch(`/pages/${itemPageId}`);
  const relationIds = new Set();

  for (const propertyName of ["Schedule", "Activity", "Spot", "Restaurant", "餐廳"]) {
    for (const pageId of relationPageIds(findProperty(itemPage.properties, [propertyName]))) {
      relationIds.add(pageId);
    }
  }

  const relatedPages = [];
  for (const pageId of relationIds) {
    relatedPages.push(await notionFetch(`/pages/${pageId}`));
  }

  return [itemPage, ...relatedPages];
}

async function main() {
  const trip = JSON.parse(await readFile(inputPath, "utf8"));
  let updatedItems = 0;
  let addedEmbeds = 0;

  for (const day of trip.days) {
    for (const item of day.items) {
      if (!item.notionUrl) continue;

      const pages = await notionPagesForItem(item);
      if (!pages.length || !isFoodItem(item, pages.slice(1))) continue;

      const existingEmbeds = item.restaurantGuide?.menuEmbeds ?? [];
      const seenUrls = new Set(existingEmbeds.map((embed) => embed.url));
      const nextEmbeds = [...existingEmbeds];

      for (const page of pages) {
        const embeds = await collectMenuEmbedsFromPage(page, item.title);
        for (const embed of embeds) {
          if (seenUrls.has(embed.url)) continue;
          nextEmbeds.push(embed);
          seenUrls.add(embed.url);
          addedEmbeds += 1;
        }
      }

      if (nextEmbeds.length === existingEmbeds.length) continue;

      item.restaurantGuide ??= {
        intro: item.summary,
        menuLinks: [],
        recommendations: [],
      };
      item.restaurantGuide.menuEmbeds = nextEmbeds;
      updatedItems += 1;
    }
  }

  await mkdir(dirname(inputPath), { recursive: true });
  await writeFile(inputPath, `${JSON.stringify(trip, null, 2)}\n`);
  console.log(`Updated ${updatedItems} item(s), added ${addedEmbeds} menu embed(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
