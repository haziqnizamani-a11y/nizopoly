import { NextResponse } from "next/server";
import { getRoom } from "@/lib/server/rooms";
import { errorResponse } from "@/lib/server/respond";
import { parseCode } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const state = await getRoom(parseCode(code));
    return NextResponse.json({ state }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e, "getRoom");
  }
}
