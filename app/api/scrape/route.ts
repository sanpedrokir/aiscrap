import { NextResponse } from "next/server";
import { CATEGORIES, extractStructured, fetchPage, type Category } from "@/lib/scrape";

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

  let page;
  try {
    page = await fetchPage(target.toString());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach that URL" },
      { status: 502 }
    );
  }

  let ai: unknown = null;
  let aiError: string | null = null;

  if (validCategory) {
    try {
      ai = await extractStructured(page.bodyText, validCategory, cleanedCustomFields);
    } catch (err) {
      aiError =
        err instanceof Error
          ? `AI extraction failed: ${err.message}`
          : "AI extraction failed";
    }
  }

  return NextResponse.json({
    title: page.title,
    description: page.description,
    headings: page.headings,
    links: page.links,
    category: validCategory,
    ai,
    aiError,
  });
}
