import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  CATEGORIES,
  analyzeSnapshot,
  extractStructured,
  fetchPage,
  type Category,
} from "@/lib/scrape";

export async function GET() {
  let sites;
  try {
    const prisma = getPrisma();
    sites = await prisma.watchedSite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Database error: ${err.message}`
            : "Database error",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sites: sites.map((site) => ({
      id: site.id,
      url: site.url,
      category: site.category,
      customFields: site.customFields,
      createdAt: site.createdAt,
      latest: site.snapshots[0] ?? null,
    })),
  });
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

  const validCategory =
    typeof category === "string" &&
    (CATEGORIES as readonly string[]).includes(category)
      ? (category as Category)
      : null;

  if (!validCategory) {
    return NextResponse.json(
      { error: "A valid category is required" },
      { status: 400 }
    );
  }

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
  } catch {
    return NextResponse.json(
      { error: "Failed to reach that URL" },
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = await extractStructured(page.bodyText, validCategory, cleanedCustomFields);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `AI extraction failed: ${err.message}`
            : "AI extraction failed",
      },
      { status: 502 }
    );
  }

  let report = null;
  try {
    report = await analyzeSnapshot(validCategory, data, null);
  } catch {
    // Baseline snapshot still gets saved even if the analysis step fails
  }

  let site;
  try {
    const prisma = getPrisma();
    site = await prisma.watchedSite.create({
      data: {
        url: target.toString(),
        category: validCategory,
        customFields: cleanedCustomFields,
        snapshots: {
          create: {
            data: data as object,
            summary: report?.summary ?? null,
            changes: report?.changes ?? [],
            flagged: report?.flagged ?? [],
          },
        },
      },
      include: { snapshots: true },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Database error: ${err.message}`
            : "Database error",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: site.id,
    url: site.url,
    category: site.category,
    customFields: site.customFields,
    createdAt: site.createdAt,
    latest: site.snapshots[0],
  });
}
