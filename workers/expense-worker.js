const NOTION_VERSION = "2026-03-11";

const categoryMap = {
  lodging: "Living",
  attraction: "Attraction",
  transport: "Transportation",
  food: "Food",
  shopping: "Shopping",
  other: "Others",
};

const statusMap = {
  paid: "Done",
  confirmed: "Done",
  estimated: "Pending",
  pending: "Not yet",
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    });

    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { data_source_id: env.NOTION_EXPENSE_DATA_SOURCE_ID },
        properties,
      }),
    });

    const notionBody = await notionResponse.json().catch(() => ({}));
    if (!notionResponse.ok) {
      return jsonResponse(
        request,
        env,
        { message: notionBody?.message || "Notion API request failed." },
        { status: notionResponse.status },
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
