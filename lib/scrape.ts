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

const CategoryDetectionSchema = z.object({
  category: z.enum(CATEGORIES),
  customFields: z
    .array(z.string())
    .describe(
      'Only used when category is "custom": short field names to extract per item on the page (e.g. ["event name", "date", "venue"]). Leave empty otherwise.'
    ),
});

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

export async function detectCategory(
  bodyText: string
): Promise<{ category: Category; customFields: string[] }> {
  const truncated = bodyText.slice(0, 8000);

  const response = await getOpenAI().responses.parse({
    model: "gpt-5.6",
    input: [
      {
        role: "user",
        content: `Look at this page content and decide which kind of page it is: "shopping" (product listings), "news" (a single article), "jobs" (job listings), or "custom" (anything else). If "custom", pick 2-6 short, sensible field names to extract for each distinct item on the page.\n\n---\n${truncated}\n---`,
      },
    ],
    text: {
      format: zodTextFormat(CategoryDetectionSchema, "category_detection"),
    },
  });

  const result = response.output_parsed;
  if (!result) {
    throw new Error("Category detection returned no result");
  }
  const customFields = result.customFields.map((f) => f.trim()).filter(Boolean);

  return {
    category: result.category,
    customFields:
      result.category === "custom" && customFields.length === 0
        ? ["title", "detail"]
        : customFields,
  };
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

const AnalysisSchema = z.object({
  summary: z
    .string()
    .describe(
      "2-4 sentence plain-language summary of what this data contains and what stands out"
    ),
  highlights: z
    .array(
      z.object({
        label: z
          .string()
          .describe(
            'Short theme or issue name, e.g. "Shipping complaints", "Salary outlier", "Breaking development"'
          ),
        detail: z.string(),
      })
    )
    .describe(
      "Key themes, recurring issues, or standout items drawn from the data - e.g. grouped complaint themes for reviews, notable listings for jobs/products, key facts for an article"
    ),
  sentiment: z
    .object({
      overall: z.enum(["positive", "negative", "mixed", "neutral"]),
      detail: z.string().describe("Why this sentiment was assigned"),
    })
    .nullable()
    .describe(
      "Overall sentiment expressed in the content, only if it expresses opinions, reviews, or feedback (e.g. customer reviews, comments, an opinion piece). Null if not applicable, such as a plain product or job listing page."
    ),
  recommendedActions: z
    .array(z.string())
    .describe(
      "Concrete next steps or actions worth taking based on this data, e.g. 'Address recurring complaints about X', 'This listing is priced well below comparable ones - worth a closer look', 'No action needed - nothing notable'"
    ),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export async function analyzeContent(
  category: Category,
  data: unknown
): Promise<Analysis | null> {
  const prompt = `You are analyzing data extracted from a scraped web page for a user. Interpret it, don't just repeat it: summarize what's there, group any recurring themes or issues (e.g. complaint themes, standout deals or listings, key facts), assess overall sentiment if the content expresses opinions or feedback (otherwise leave sentiment null), and recommend concrete next actions.\n\nCATEGORY: ${category}\n\nDATA:\n${JSON.stringify(
    data
  ).slice(0, 12000)}`;

  const response = await getOpenAI().responses.parse({
    model: "gpt-5.6",
    input: [{ role: "user", content: prompt }],
    text: {
      format: zodTextFormat(AnalysisSchema, "analysis"),
    },
  });

  return response.output_parsed;
}
