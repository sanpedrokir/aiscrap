import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/sites/[id]">
) {
  const { id } = await ctx.params;
  const prisma = getPrisma();

  try {
    await prisma.watchedSite.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
