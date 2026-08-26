import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/server/rooms";
import { errorResponse } from "@/lib/server/respond";
import { parseCode } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const creds = await joinRoom(parseCode(code), body.name ?? "");
    return NextResponse.json(creds);
  } catch (e) {
    return errorResponse(e, "joinRoom");
  }
}
