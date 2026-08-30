import { NextResponse } from "next/server";
import { detectCategory, extractStructured, fetchPage, type Category } from "@/lib/scrape";

export async function POST(request: Request) {
  const body = await request.json();
  const { url } = body as { url?: string };

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

  let page;
  try {
    page = await fetchPage(target.toString());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach that URL" },
      { status: 502 }
    );
  }

  let category: Category | null = null;
  let ai: unknown = null;
  let aiError: string | null = null;

  try {
    const detected = await detectCategory(page.bodyText);
    category = detected.category;
    ai = await extractStructured(page.bodyText, detected.category, detected.customFields);
  } catch (err) {
    aiError =
      err instanceof Error
        ? `AI extraction failed: ${err.message}`
        : "AI extraction failed";
  }

  return NextResponse.json({
    title: page.title,
    description: page.description,
    headings: page.headings,
    links: page.links,
    category,
    ai,
    aiError,
  });
}
