const NOTION_VERSION = "2026-03-11";

const categoryMap = {
  lodging: "Living",
  attraction: "Attraction",
  transport: "Transportation",
  food: "Food",
  shopping: "Shopping",
  other: "Others",
};

const categoryFilterMap = {
  lodging: ["Living", "Hotel"],
  attraction: ["Attraction"],
  transport: ["Transportation", "Moving"],
  food: ["Food"],
  shopping: ["Shopping"],
  other: ["Others"],
};

const statusMap = {
  paid: "Done",
  confirmed: "Done",
  estimated: "Pending",
  pending: "Not yet",
};

const exchangeRateUrl = "https://api.frankfurter.dev/v2/rate/AUD/TWD";

const categoryFromNotion = {
  Living: "lodging",
  Hotel: "lodging",
  Attraction: "attraction",
  Transportation: "transport",
  Moving: "transport",
  Food: "food",
  Shopping: "shopping",
  Others: "other",
};

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const configuredOrigins = (env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    ...configuredOrigins,
    "https://joechang0603.github.io",
    "http://127.0.0.1:5173",
  ]);
  const origin =
    allowedOrigins.has("*") || allowedOrigins.has(requestOrigin) ? requestOrigin : "";

  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Expense-Pin",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request, env, body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
      ...(init.headers || {}),
    },
  });
}

function richText(content) {
  return {
    rich_text: content ? [{ text: { content } }] : [],
  };
}

function select(name) {
  return name ? { select: { name } } : undefined;
}

function compactProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );
}

function textFromRichText(value) {
  return Array.isArray(value) ? value.map((part) => part.plain_text ?? "").join("") : "";
}

function propertyText(property) {
  if (!property) return "";
  if (property.type === "title") return textFromRichText(property.title);
  if (property.type === "rich_text") return textFromRichText(property.rich_text);
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "number") return property.number?.toString() ?? "";
  if (property.type === "url") return property.url ?? "";
  return "";
}

function relation(pageId) {
  return pageId ? { relation: [{ id: pageId }] } : undefined;
}

function isNotionPageId(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(value)
  );
}

function categoryFilter(category) {
  const notionCategories = categoryFilterMap[category] || [];
  if (!notionCategories.length) return undefined;
  if (notionCategories.length === 1) {
    return { property: "Category", select: { equals: notionCategories[0] } };
  }
  return {
    or: notionCategories.map((notionCategory) => ({
      property: "Category",
      select: { equals: notionCategory },
    })),
  };
}

function activityFromPage(page) {
  const title = propertyText(page.properties?.Task) || propertyText(page.properties?.Name) || "未命名活動";
  const category = propertyText(page.properties?.Category);
  const city = propertyText(page.properties?.City);
  const address = propertyText(page.properties?.Address);
  const location = [city, address].filter(Boolean).join(" - ");

  return {
    id: page.id,
    title,
    location,
    category: categoryFromNotion[category] || "other",
    notionCategory: category,
  };
}

async function notionFetch(path, env, init = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || "Notion API request failed.");
  }

  return body;
}

async function listActivities(env, category) {
  const pages = [];
  let cursor;
  const filter = categoryFilter(category);

  do {
    const result = await notionFetch(`/data_sources/${env.NOTION_SCHEDULE_DATA_SOURCE_ID}/query`, env, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        ...(filter ? { filter } : {}),
      }),
    });

    pages.push(...result.results.filter((item) => item.object === "page"));
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  return pages
    .map(activityFromPage)
    .sort((left, right) => left.title.localeCompare(right.title, "zh-Hant"));
}

async function cachedActivitiesResponse(request, env, category) {
  const requestUrl = new URL(request.url);
  const cacheUrl = new URL(requestUrl.origin);
  cacheUrl.pathname = `/__activity-cache/${category || "all"}/${encodeURIComponent(request.headers.get("Origin") || "")}`;
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cachedResponse = await caches.default.match(cacheKey);
  if (cachedResponse) {
    const body = await cachedResponse.json();
    return jsonResponse(request, env, body, { headers: { "Cache-Control": "no-store" } });
  }

  const body = { activities: await listActivities(env, category) };
  const cacheResponse = jsonResponse(
    request,
    env,
    body,
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
  await caches.default.put(cacheKey, cacheResponse.clone());
  return jsonResponse(request, env, body, { headers: { "Cache-Control": "no-store" } });
}

async function cachedRateResponse(request, env) {
  const requestUrl = new URL(request.url);
  const cacheUrl = new URL(requestUrl.origin);
  cacheUrl.pathname = `/__rate-cache/aud-twd/${encodeURIComponent(request.headers.get("Origin") || "")}`;
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cachedResponse = await caches.default.match(cacheKey);
  if (cachedResponse) {
    const body = await cachedResponse.json();
    return jsonResponse(request, env, body, { headers: { "Cache-Control": "no-store" } });
  }

  const rateResponse = await fetch(exchangeRateUrl, {
    headers: { Accept: "application/json" },
  });
  const rateBody = await rateResponse.json().catch(() => ({}));
  if (!rateResponse.ok || typeof rateBody.rate !== "number") {
    throw new Error(rateBody?.message || "Exchange rate request failed.");
  }

  const body = {
    base: "AUD",
    quote: "TWD",
    rate: rateBody.rate,
    date: rateBody.date,
    fetchedAt: new Date().toISOString(),
    source: "Frankfurter",
  };
  const cacheResponse = jsonResponse(
    request,
    env,
    body,
    { headers: { "Cache-Control": "public, max-age=900, s-maxage=900" } },
  );
  await caches.default.put(cacheKey, cacheResponse.clone());
  return jsonResponse(request, env, body, { headers: { "Cache-Control": "no-store" } });
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function verifyPin(input, expected) {
  const [inputHash, expectedHash] = await Promise.all([sha256(input || ""), sha256(expected)]);
  return constantTimeEqual(inputHash, expectedHash);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    const normalizedPath = url.pathname.replace(/\/$/, "");

    if (request.method === "GET" && normalizedPath.endsWith("/rates")) {
      try {
        return cachedRateResponse(request, env);
      } catch (error) {
        return jsonResponse(
          request,
          env,
          { message: error instanceof Error ? error.message : "Exchange rate request failed." },
          { status: 502 },
        );
      }
    }

    if (request.method === "GET" && normalizedPath.endsWith("/activities")) {
      if (!env.NOTION_TOKEN || !env.NOTION_SCHEDULE_DATA_SOURCE_ID) {
        return jsonResponse(
          request,
          env,
          { message: "Worker is missing Notion activity configuration." },
          { status: 500 },
        );
      }

      try {
        return cachedActivitiesResponse(request, env, url.searchParams.get("category") || "");
      } catch (error) {
        return jsonResponse(
          request,
          env,
          { message: error instanceof Error ? error.message : "Notion activity request failed." },
          { status: 502 },
        );
      }
    }

    if (request.method === "DELETE") {
      if (!env.NOTION_TOKEN || !env.NOTION_EXPENSE_DATA_SOURCE_ID) {
        return jsonResponse(
          request,
          env,
          { message: "Worker is missing Notion configuration." },
          { status: 500 },
        );
      }

      if (env.EXPENSE_WRITE_PIN) {
        const pin = request.headers.get("X-Expense-Pin");
        if (!(await verifyPin(pin, env.EXPENSE_WRITE_PIN))) {
          return jsonResponse(request, env, { message: "Invalid PIN." }, { status: 401 });
        }
      }

      const pathParts = normalizedPath.split("/").filter(Boolean);
      const pageId = pathParts[pathParts.length - 1] || url.searchParams.get("id") || "";
      if (!isNotionPageId(pageId)) {
        return jsonResponse(request, env, { message: "Valid expense page ID is required." }, { status: 400 });
      }

      try {
        await notionFetch(`/pages/${pageId}`, env, {
          method: "PATCH",
          body: JSON.stringify({ in_trash: true }),
        });
      } catch (error) {
        return jsonResponse(
          request,
          env,
          { message: error instanceof Error ? error.message : "Notion delete request failed." },
          { status: 502 },
        );
      }

      return jsonResponse(request, env, { id: pageId, deleted: true });
    }

    if (request.method !== "POST") {
      return jsonResponse(request, env, { message: "Method not allowed" }, { status: 405 });
    }

    if (!env.NOTION_TOKEN || !env.NOTION_EXPENSE_DATA_SOURCE_ID) {
      return jsonResponse(
        request,
        env,
        { message: "Worker is missing Notion configuration." },
        { status: 500 },
      );
    }

    if (env.EXPENSE_WRITE_PIN) {
      const pin = request.headers.get("X-Expense-Pin");
      if (!(await verifyPin(pin, env.EXPENSE_WRITE_PIN))) {
        return jsonResponse(request, env, { message: "Invalid PIN." }, { status: 401 });
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, env, { message: "Invalid JSON body." }, { status: 400 });
    }

    const amount = Number(body.amount);
    const name = String(body.name || "").trim();
    const date = String(body.date || "").trim();
    const currency = body.currency === "AUD" ? "AUD" : "TWD";
    const category = body.notionCategory || categoryMap[body.category] || "Others";
    const status = body.notionStatus || statusMap[body.status] || "Done";
    const schedulePageId = isNotionPageId(body.schedulePageId) ? body.schedulePageId : "";

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
      return jsonResponse(
        request,
        env,
        { message: "Name, positive amount, and date are required." },
        { status: 400 },
      );
    }

    const properties = compactProperties({
      Name: {
        title: [{ text: { content: name } }],
      },
      Amount: { number: amount },
      Currency: select(currency),
      Category: select(category),
      Status: select(status),
      Day: body.day ? select(String(body.day)) : undefined,
      Date: { date: { start: date } },
      Location: richText(String(body.location || "").trim()),
      Source: select("Manual"),
      Travel: select("2026 Sydney x Melbourne"),
      Schedule: relation(schedulePageId),
    });

    let notionBody;
    try {
      notionBody = await notionFetch("/pages", env, {
        method: "POST",
        body: JSON.stringify({
          parent: { data_source_id: env.NOTION_EXPENSE_DATA_SOURCE_ID },
          properties,
        }),
      });
    } catch (error) {
      return jsonResponse(
        request,
        env,
        { message: error instanceof Error ? error.message : "Notion API request failed." },
        { status: 502 },
      );
    }

    return jsonResponse(request, env, {
      id: notionBody.id,
      url: notionBody.url,
      expense: {
        id: notionBody.id,
        title: name,
        amount,
        currency,
        category: body.category || "other",
        status: body.status || "confirmed",
        day: body.day || "",
        date,
        location: String(body.location || "").trim(),
        source: "Manual",
        notionUrl: notionBody.url,
      },
    });
  },
};
