import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/sites/[id]">
) {
  const { id } = await ctx.params;

  try {
    const prisma = getPrisma();
    await prisma.watchedSite.delete({ where: { id } });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Failed to delete: ${err.message}`
            : "Failed to delete",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
