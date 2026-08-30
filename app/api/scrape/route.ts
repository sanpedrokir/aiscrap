import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { z } from "zod";

const CATEGORIES = ["shopping", "news", "jobs", "custom"] as const;
type Category = (typeof CATEGORIES)[number];

const field = () => z.string().nullable();

const SCHEMAS = {
  shopping: z.object({
    products: z.array(
      z.object({
        product: field().describe("Product name"),
        price: field(),
        rating: field().describe("Star rating or review score, as shown"),
        availability: field().describe(
          "e.g. In Stock, Out of Stock, Ships in 2 days"
        ),
      })
    ),
  }),
  news: z.object({
    headline: field(),
    author: field(),
    date: field().describe("Publish date, as shown on the page"),
    article: z
      .string()
      .describe("The article body text, or a summary if it's very long"),
  }),
  jobs: z.object({
    jobs: z.array(
      z.object({
        company: field(),
        location: field(),
        job: field().describe("Job title"),
        salary: field(),
      })
    ),
  }),
} satisfies Record<Exclude<Category, "custom">, z.ZodTypeAny>;

const PROMPTS: Record<Exclude<Category, "custom">, string> = {
  shopping:
    "Extract every product on this page, with its price, rating, and availability. One entry per product.",
  news: "Extract this article's headline, author, publish date, and body text.",
  jobs: "Extract every job listing on this page, with company, location, job title, and salary. One entry per listing.",
};

function buildCustomSchema(fields: string[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f] = field().describe(`Extracted value for "${f}"`);
  }
  return z.object({
    items: z
      .array(z.object(shape))
      .describe("One entry per distinct item found on the page"),
  });
}

const anthropic = new Anthropic();

async function extractWithAI(
  bodyText: string,
  category: Category,
  customFields: string[]
) {
  const truncated = bodyText.slice(0, 15000);

  const schema =
    category === "custom" ? buildCustomSchema(customFields) : SCHEMAS[category];

  const prompt =
    category === "custom"
      ? `Extract every item on this page along with these attributes: ${customFields.join(
          ", "
        )}. One entry per distinct item. If an attribute isn't present for an item, use null.`
      : PROMPTS[category];

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nThe page content may be messy or unstructured - use your judgment.\n\n---\n${truncated}\n---`,
      },
    ],
    output_config: {
      format: zodOutputFormat(schema),
    },
  });

  return response.parsed_output;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { url, category, customFields } = body as {
    url?: string;
    category?: string;
    customFields?: string[];
  };

  if (typeof url !== "string" || url.trim() === "") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http and https URLs are supported" },
      { status: 400 }
    );
  }

  const validCategory: Category | null =
    typeof category === "string" &&
    (CATEGORIES as readonly string[]).includes(category)
      ? (category as Category)
      : null;

  const cleanedCustomFields = Array.isArray(customFields)
    ? customFields.map((f) => f.trim()).filter(Boolean)
    : [];

  if (validCategory === "custom" && cleanedCustomFields.length === 0) {
    return NextResponse.json(
      { error: "List at least one field to extract" },
      { status: 400 }
    );
  }

  let response: Response;
  try {
    response = await fetch(target.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ScrapBot/1.0)" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach that URL" },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Site responded with ${response.status} ${response.statusText}` },
      { status: 502 }
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim() || null;
  const description =
    $('meta[name="description"]').attr("content")?.trim() || null;

  const headings = $("h1, h2, h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 50);

  const links = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (!href) return null;
      try {
        const absolute = new URL(href, target).toString();
        return { text: text || absolute, href: absolute };
      } catch {
        return null;
      }
    })
    .get()
    .filter((link): link is { text: string; href: string } => link !== null)
    .slice(0, 100);

  let ai: unknown = null;
  let aiError: string | null = null;

  if (validCategory) {
    $("script, style, noscript").remove();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    try {
      ai = await extractWithAI(bodyText, validCategory, cleanedCustomFields);
    } catch (err) {
      aiError =
        err instanceof Anthropic.APIError
          ? `AI extraction failed: ${err.message}`
          : "AI extraction failed";
    }
  }

  return NextResponse.json({
    title,
    description,
    headings,
    links,
    category: validCategory,
    ai,
    aiError,
  });
}
