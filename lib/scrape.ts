import * as cheerio from "cheerio";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const CATEGORIES = ["shopping", "news", "jobs", "custom"] as const;
export type Category = (typeof CATEGORIES)[number];

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

function schemaFor(category: Category, customFields: string[]) {
  return category === "custom" ? buildCustomSchema(customFields) : SCHEMAS[category];
}

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI();
  }
  return openai;
}

export type PageContent = {
  title: string | null;
  description: string | null;
  headings: string[];
  links: { text: string; href: string }[];
  bodyText: string;
};

export async function fetchPage(url: string): Promise<PageContent> {
  const target = new URL(url);
  const response = await fetch(target.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ScrapBot/1.0)" },
  });

  if (!response.ok) {
    throw new Error(`Site responded with ${response.status} ${response.statusText}`);
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

  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  return { title, description, headings, links, bodyText };
}

export async function extractStructured(
  bodyText: string,
  category: Category,
  customFields: string[]
): Promise<unknown> {
  const truncated = bodyText.slice(0, 15000);
  const schema = schemaFor(category, customFields);

  const prompt =
    category === "custom"
      ? `Extract every item on this page along with these attributes: ${customFields.join(
          ", "
        )}. One entry per distinct item. If an attribute isn't present for an item, use null.`
      : PROMPTS[category];

  const response = await getOpenAI().responses.parse({
    model: "gpt-5.6",
    input: [
      {
        role: "user",
        content: `${prompt}\n\nThe page content may be messy or unstructured - use your judgment.\n\n---\n${truncated}\n---`,
      },
    ],
    text: {
      format: zodTextFormat(schema, "extraction"),
    },
  });

  return response.output_parsed;
}

const ChangeReportSchema = z.object({
  summary: z
    .string()
    .describe(
      "2-4 sentence human-readable summary of the current state, or of what changed since the last check"
    ),
  changes: z.array(
    z.object({
      type: z.enum(["added", "removed", "updated"]),
      description: z.string(),
    })
  ),
  flagged: z.array(
    z.object({
      reason: z
        .string()
        .describe("Why this item is worth the user's attention"),
      detail: z.string(),
    })
  ),
});

export type ChangeReport = z.infer<typeof ChangeReportSchema>;

export async function analyzeSnapshot(
  category: Category,
  currentData: unknown,
  previousData: unknown | null
): Promise<ChangeReport | null> {
  const prompt = previousData
    ? `You are monitoring this page for a user. Compare the PREVIOUS extracted snapshot to the CURRENT one below. Identify what was added, removed, or updated. Write a short summary of what changed, and flag anything that seems worth the user's attention (e.g. a steep price drop, a new listing matching common criteria, an urgent or breaking item, a significant shift). If nothing meaningfully changed, say so plainly and leave changes/flagged empty.\n\nPREVIOUS:\n${JSON.stringify(
        previousData
      ).slice(0, 8000)}\n\nCURRENT:\n${JSON.stringify(currentData).slice(0, 8000)}`
    : `You are setting up monitoring for this page for a user. This is the first check, so there's nothing to compare against yet. Summarize what was found, and flag anything immediately notable (e.g. a deal, an urgent listing, a striking figure).\n\nCURRENT:\n${JSON.stringify(
        currentData
      ).slice(0, 8000)}`;

  const response = await getOpenAI().responses.parse({
    model: "gpt-5.6",
    input: [{ role: "user", content: prompt }],
    text: {
      format: zodTextFormat(ChangeReportSchema, "change_report"),
    },
  });

  return response.output_parsed;
}
