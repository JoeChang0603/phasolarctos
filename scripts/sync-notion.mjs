import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const NOTION_VERSION = "2022-06-28";
const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
const planTags = (process.env.NOTION_PLAN_TAG ?? "Recommendation,Recommandation")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);
const planTag = planTags[0] ?? "Recommendation";
const outputPath = resolve("src/data/trip.json");
const menuOutputDir = resolve("public/notion-menus");
const menuPublicPath = "/notion-menus";

if (!token || !databaseId) {
  console.error("Missing NOTION_TOKEN or NOTION_DATABASE_ID.");
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

function propertyUrl(property) {
  if (!property) return "";
  if (property.type === "url") return property.url ?? "";
  if (property.type === "files") {
    const file = property.files?.[0];
    if (!file) return "";
    if (file.type === "external") return file.external?.url ?? "";
    if (file.type === "file") return file.file?.url ?? "";
    return "";
  }
  if (property.type === "rich_text") {
    const linkedPart = property.rich_text?.find((part) => part.href);
    return linkedPart?.href ?? propertyText(property);
  }
  return propertyText(property);
}

function relationPageIds(property) {
  if (!property || property.type !== "relation") return [];
  return property.relation?.map((page) => page.id).filter(Boolean) ?? [];
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

async function downloadMenuFile(source, pageTitle, blockId) {
  await mkdir(menuOutputDir, { recursive: true });

  const extension = source.extension || "pdf";
  const filename = `${sanitizeFilePart(pageTitle)}-${blockId.replaceAll("-", "").slice(0, 10)}.${extension}`;
  const outputFile = resolve(menuOutputDir, filename);
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(`Menu PDF download failed ${response.status}: ${source.url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputFile, buffer);
  return `${menuPublicPath}/${filename}`;
}

async function collectMenuEmbeds(page, pageTitle) {
  const blocks = await fetchBlockTree(page.id);
  const embeds = [];
  const seenUrls = new Set();

  for (const block of blocks) {
    const source = pdfSourceFromBlock(block);
    if (!source || seenUrls.has(source.url)) continue;

    let url = source.url;
    if (source.shouldDownload) {
      try {
        url = await downloadMenuFile(source, pageTitle, block.id);
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

function findProperty(properties, candidates) {
  const entries = Object.entries(properties);
  for (const candidate of candidates) {
    const match = entries.find(([name]) => name.toLowerCase() === candidate.toLowerCase());
    if (match) return match[1];
  }
  return undefined;
}

function hasPlanTag(page) {
  const plan = findProperty(page.properties, ["plan", "Plan", "tag", "Tag", "tags", "Tags"]);
  if (!plan) return true;
  if (plan.type === "select") return planTags.includes(plan.select?.name ?? "");
  if (plan.type === "multi_select") return plan.multi_select?.some((item) => planTags.includes(item.name));
  const text = propertyText(plan);
  return planTags.some((tag) => text.includes(tag));
}

async function pageToItem(page) {
  const props = page.properties;
  const title = propertyText(findProperty(props, ["Name", "Title", "Place", "Activity"])) || "未命名行程";
  const date = propertyText(findProperty(props, ["Date", "Day", "日期"]));
  const city = propertyText(findProperty(props, ["City", "城市", "Area"])) || "Travel";
  const time = propertyText(findProperty(props, ["Time", "時間"]));
  const location = propertyText(findProperty(props, ["Location", "地點", "Address", "地址"]));
  const summary = propertyText(findProperty(props, ["Summary", "Notes", "Note", "Description", "備註"])) || title;
  const mapsUrl = propertyText(findProperty(props, ["Google Maps", "Maps", "Map", "地圖"]));
  const schedulePageIds = relationPageIds(findProperty(props, ["Schedule", "Activity", "Spot"]));
  const relatedPages = [];
  let bookingInfoUrl = propertyUrl(
    findProperty(props, [
      "Booking Info",
      "Booking",
      "Booking Link",
      "Booking URL",
      "Reservation",
      "Reservation Info",
      "訂票資訊",
      "訂房資訊",
      "訂位資訊",
      "訂票連結",
      "訂房連結",
      "證明連結",
    ]),
  );
  for (const schedulePageId of schedulePageIds) {
    const schedulePage = await notionFetch(`/pages/${schedulePageId}`);
    relatedPages.push(schedulePage);
    if (!bookingInfoUrl) {
      bookingInfoUrl = propertyUrl(findProperty(schedulePage.properties, ["Booking Info"]));
    }
  }
  const image = propertyText(findProperty(props, ["Image", "Cover", "Photo", "圖片"]));
  const type = [
    propertyText(findProperty(props, ["Type", "類型", "Category"])),
    ...relatedPages.map((relatedPage) =>
      propertyText(findProperty(relatedPage.properties, ["Type", "類型", "Category"])),
    ),
  ]
    .join(" ")
    .toLowerCase();
  const normalizedType = normalizeType(type);
  const menuEmbeds = [];

  if (normalizedType === "food") {
    const seenMenuUrls = new Set();
    for (const menuPage of [page, ...relatedPages]) {
      const embeds = await collectMenuEmbeds(menuPage, title);
      for (const embed of embeds) {
        if (seenMenuUrls.has(embed.url)) continue;
        menuEmbeds.push(embed);
        seenMenuUrls.add(embed.url);
      }
    }
  }

  const item = {
    id: page.id,
    time,
    title,
    type: normalizedType,
    location,
    summary,
    image,
    mapsUrl,
    bookingInfoUrl,
    notionUrl: page.url,
    tags: [planTag],
  };

  if (menuEmbeds.length) {
    item.restaurantGuide = {
      intro: summary,
      menuLinks: [],
      menuEmbeds,
      recommendations: [],
    };
  }

  return {
    date: date || new Date().toISOString().slice(0, 10),
    city,
    item,
  };
}

function normalizeType(type) {
  if (["flight", "food", "hotel", "landmark", "museum", "shopping", "walk", "transit", "note"].includes(type)) {
    return type;
  }
  if (type.includes("food") || type.includes("restaurant") || type.includes("餐")) return "food";
  if (type.includes("hotel") || type.includes("住宿")) return "hotel";
  if (type.includes("walk") || type.includes("散步")) return "walk";
  if (type.includes("train") || type.includes("bus") || type.includes("交通")) return "transit";
  return "landmark";
}

function groupDays(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const existing = grouped.get(entry.date) ?? {
      id: `day-${entry.date}`,
      date: entry.date,
      city: entry.city,
      title: `${entry.city} 推薦行程`,
      summary: "來自 Notion 的 Recommendation 行程。",
      coverImage: entry.item.image || "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1800&q=85",
      mapsEmbedUrl: entry.item.location
        ? `https://www.google.com/maps?q=${encodeURIComponent(entry.item.location)}&output=embed`
        : undefined,
      accent: pickAccent(grouped.size),
      items: [],
    };
    existing.items.push(entry.item);
    grouped.set(entry.date, existing);
  }

  return [...grouped.values()]
    .map((day) => ({
      ...day,
      items: day.items.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function pickAccent(index) {
  return ["#1f9fb6", "#ef7d57", "#7a6ff0", "#3f8f5f", "#c27a2c"][index % 5];
}

async function main() {
  const pages = [];
  let cursor;

  do {
    const body = {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    };

    const result = await notionFetch(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  const entries = await Promise.all(pages.filter(hasPlanTag).map(pageToItem));
  const trip = {
    title: "2026 Sydney x Melbourne",
    subtitle: "Joe Chang 家庭旅遊推薦行程",
    dateRange: "2026",
    source: `Notion database ${databaseId}, plan = ${planTags.join(", ")}`,
    generatedAt: new Date().toISOString(),
    days: groupDays(entries),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(trip, null, 2)}\n`);
  console.log(`Wrote ${trip.days.length} day(s) to ${outputPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
