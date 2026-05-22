import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const NOTION_VERSION = "2022-06-28";
const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
const planTag = process.env.NOTION_PLAN_TAG ?? "Recommendation";
const outputPath = resolve("src/data/trip.json");

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
  if (plan.type === "select") return plan.select?.name === planTag;
  if (plan.type === "multi_select") return plan.multi_select?.some((item) => item.name === planTag);
  return propertyText(plan).includes(planTag);
}

function pageToItem(page) {
  const props = page.properties;
  const title = propertyText(findProperty(props, ["Name", "Title", "Place", "Activity"])) || "未命名行程";
  const date = propertyText(findProperty(props, ["Date", "Day", "日期"]));
  const city = propertyText(findProperty(props, ["City", "城市", "Area"])) || "Travel";
  const time = propertyText(findProperty(props, ["Time", "時間"]));
  const location = propertyText(findProperty(props, ["Location", "地點", "Address", "地址"]));
  const summary = propertyText(findProperty(props, ["Summary", "Notes", "Note", "Description", "備註"])) || title;
  const mapsUrl = propertyText(findProperty(props, ["Google Maps", "Maps", "Map", "地圖"]));
  const image = propertyText(findProperty(props, ["Image", "Cover", "Photo", "圖片"]));
  const type = propertyText(findProperty(props, ["Type", "類型"])).toLowerCase();

  return {
    date: date || new Date().toISOString().slice(0, 10),
    city,
    item: {
      id: page.id,
      time,
      title,
      type: normalizeType(type),
      location,
      summary,
      image,
      mapsUrl,
      notionUrl: page.url,
      tags: [planTag],
    },
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

function buildPlanFilter(database) {
  const propertyName = Object.keys(database.properties).find((name) => name.toLowerCase() === "plan");
  if (!propertyName) return undefined;

  const property = database.properties[propertyName];
  if (property.type === "select") {
    return { property: propertyName, select: { equals: planTag } };
  }
  if (property.type === "multi_select") {
    return { property: propertyName, multi_select: { contains: planTag } };
  }
  return undefined;
}

async function main() {
  const database = await notionFetch(`/databases/${databaseId}`);
  const planFilter = buildPlanFilter(database);
  const pages = [];
  let cursor;

  do {
    const body = {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
      ...(planFilter ? { filter: planFilter } : {}),
    };

    const result = await notionFetch(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  const entries = pages.filter(hasPlanTag).map(pageToItem);
  const trip = {
    title: "2026 Sydney x Melbourne",
    subtitle: "Joe Chang 家庭旅遊推薦行程",
    dateRange: "2026",
    source: `Notion database ${databaseId}, plan = ${planTag}`,
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
