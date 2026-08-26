import { NextResponse } from "next/server";
import { createRoom } from "@/lib/server/rooms";
import { errorResponse } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = await createRoom((body as { name?: string }).name ?? "");
    return NextResponse.json(room);
  } catch (e) {
    return errorResponse(e, "createRoom");
  }
}
