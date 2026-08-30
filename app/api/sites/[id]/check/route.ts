import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { analyzeSnapshot, extractStructured, fetchPage, type Category } from "@/lib/scrape";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/sites/[id]/check">
) {
  const { id } = await ctx.params;
  const prisma = getPrisma();

  const site = await prisma.watchedSite.findUnique({
    where: { id },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const previousSnapshot = site.snapshots[0] ?? null;

  let page;
  try {
    page = await fetchPage(site.url);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach that URL" },
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = await extractStructured(
      page.bodyText,
      site.category as Category,
      site.customFields
    );
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
    report = await analyzeSnapshot(
      site.category as Category,
      data,
      previousSnapshot?.data ?? null
    );
  } catch {
    // New snapshot still gets saved even if the analysis step fails
  }

  const snapshot = await prisma.snapshot.create({
    data: {
      siteId: site.id,
      data: data as object,
      summary: report?.summary ?? null,
      changes: report?.changes ?? [],
      flagged: report?.flagged ?? [],
    },
  });

  return NextResponse.json(snapshot);
}
