import { NextResponse } from "next/server";
import { ApiError } from "./rooms";
import { StoreError } from "./store";

/** Uniform error shape; unexpected failures are logged, not leaked. */
export function errorResponse(e: unknown, context: string) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  // Misconfiguration, not a bug: the message tells the operator what to fix, so
  // it is safe and useful to pass through.
  if (e instanceof StoreError) {
    console.error(`${context} store error`, e.message);
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
  console.error(`${context} failed`, e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
