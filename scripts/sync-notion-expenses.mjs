import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const NOTION_VERSION = "2022-06-28";
const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
const planTags = (process.env.NOTION_PLAN_TAG ?? "Recommendation,Recommandation")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);
const inputPath = resolve("src/data/trip.json");

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
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "date") return property.date?.start ?? "";
  if (property.type === "url") return property.url ?? "";
  if (property.type === "email") return property.email ?? "";
  if (property.type === "phone_number") return property.phone_number ?? "";
  if (property.type === "number") return property.number?.toString() ?? "";
  if (property.type === "formula") return property.formula?.number?.toString() ?? property.formula?.string ?? "";
  return "";
}

function propertyNumber(property) {
  if (!property) return undefined;
  if (property.type === "number") return property.number ?? undefined;
  if (property.type === "formula" && typeof property.formula?.number === "number") return property.formula.number;
  if (property.type === "rollup") {
    if (typeof property.rollup?.number === "number") return property.rollup.number;
    const firstNumber = property.rollup?.array?.find((item) => item.type === "number" && typeof item.number === "number");
    return firstNumber?.number;
  }

  const text = propertyText(property).replace(/,/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function propertyDateStart(property) {
  if (!property) return "";
  if (property.type === "date") return property.date?.start ?? "";
  return propertyText(property);
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

function hasPlanTag(page) {
  const plan = findProperty(page.properties, ["plan", "Plan", "tag", "Tag", "tags", "Tags"]);
  if (!plan) return true;
  if (plan.type === "select") return planTags.includes(plan.select?.name ?? "");
  if (plan.type === "multi_select") return plan.multi_select?.some((item) => planTags.includes(item.name));
  const text = propertyText(plan);
  return planTags.some((tag) => text.includes(tag));
}

async function queryPlanPages() {
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

  return pages.filter(hasPlanTag);
}

function normalizeDate(value) {
  if (!value) return "";
  return value.slice(0, 10);
}

function dayLabelFromPage(page) {
  return propertyText(findProperty(page.properties, ["Day", "day", "日期", "Date"]));
}

function dateFromPage(page) {
  return normalizeDate(
    propertyDateStart(findProperty(page.properties, ["Duration", "Date", "日期", "Day"])),
  );
}

function titleFromPage(page) {
  return (
    propertyText(findProperty(page.properties, ["Task", "Name", "Title", "Place", "Activity"])) ||
    "未命名花費"
  );
}

function locationFromPage(page) {
  return propertyText(findProperty(page.properties, ["Location", "Address", "地點", "地址", "City"]));
}

function categoryForPage(page, parentPage) {
  const value = [
    propertyText(findProperty(page.properties, ["Category", "Type", "類型"])),
    parentPage ? propertyText(findProperty(parentPage.properties, ["Category", "Type", "類型"])) : "",
  ]
    .join(" ")
    .toLowerCase();

  if (value.includes("living") || value.includes("hotel") || value.includes("住宿")) return "lodging";
  if (value.includes("transport") || value.includes("transportation") || value.includes("drive") || value.includes("transit")) return "transport";
  if (value.includes("food") || value.includes("restaurant") || value.includes("餐")) return "food";
  if (value.includes("shopping")) return "shopping";
  if (value.includes("landmark") || value.includes("museum") || value.includes("景點") || value.includes("activity")) return "attraction";
  return "other";
}

function expenseFromPage(page, parentPage) {
  const props = page.properties;
  const payment = propertyNumber(findProperty(props, ["Payment", "Paid", "Actual Payment", "付款", "花費", "費用"]));
  const expectedPayment = propertyNumber(findProperty(props, ["Expect Payment", "Expected Payment", "Estimate", "Estimated Payment", "預估費用", "預計花費"]));
  const amount = payment ?? expectedPayment;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return undefined;

  const parentDay = parentPage ? dayLabelFromPage(parentPage) : "";
  const parentDate = parentPage ? dateFromPage(parentPage) : "";
  const booked = propertyText(findProperty(props, ["Booked", "Status", "預訂狀態"])).toLowerCase();

  return {
    id: page.id,
    title: titleFromPage(page),
    amount,
    currency: "TWD",
    category: categoryForPage(page, parentPage),
    status: payment ? (booked.includes("done") ? "confirmed" : "paid") : "estimated",
    day: parentDay || dayLabelFromPage(page),
    date: parentDate || dateFromPage(page),
    location: locationFromPage(page),
    source: page.id === parentPage?.id ? "Notion 行程頁" : "Notion relation 頁",
    notionUrl: page.url,
  };
}

async function relatedPagesForPlanPage(page) {
  const relationIds = new Set();

  for (const propertyName of ["Schedule", "Activity", "Spot", "Restaurant", "Hotel", "餐廳", "住宿", "景點"]) {
    for (const pageId of relationPageIds(findProperty(page.properties, [propertyName]))) {
      relationIds.add(pageId);
    }
  }

  const relatedPages = [];
  for (const pageId of relationIds) {
    relatedPages.push(await notionFetch(`/pages/${pageId}`));
  }

  return relatedPages;
}

function sortExpenses(expenses) {
  return expenses.sort((a, b) => {
    const dateCompare = (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99");
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });
}

async function main() {
  const trip = JSON.parse(await readFile(inputPath, "utf8"));
  const planPages = await queryPlanPages();
  const expensesByPageId = new Map();

  for (const page of planPages) {
    const ownExpense = expenseFromPage(page, page);
    if (ownExpense) expensesByPageId.set(ownExpense.id, ownExpense);

    const relatedPages = await relatedPagesForPlanPage(page);
    for (const relatedPage of relatedPages) {
      const expense = expenseFromPage(relatedPage, page);
      if (!expense) continue;

      const existing = expensesByPageId.get(expense.id);
      if (!existing || (!existing.date && expense.date)) {
        expensesByPageId.set(expense.id, expense);
      }
    }
  }

  trip.expenses = sortExpenses([...expensesByPageId.values()]);

  await mkdir(dirname(inputPath), { recursive: true });
  await writeFile(inputPath, `${JSON.stringify(trip, null, 2)}\n`);
  console.log(`Synced ${trip.expenses.length} expense record(s) from Notion.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
