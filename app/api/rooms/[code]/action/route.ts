import { NextResponse } from "next/server";
import { actOnRoom } from "@/lib/server/rooms";
import { errorResponse } from "@/lib/server/respond";
import { parseAction, parseCode } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      playerId?: string;
      secret?: string;
      action?: unknown;
    };
    const state = await actOnRoom(
      parseCode(code),
      { playerId: String(body.playerId ?? ""), secret: String(body.secret ?? "") },
      parseAction(body.action)
    );
    return NextResponse.json({ state }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e, "actOnRoom");
  }
}
