/**
 * Focused Realtime diagnostic. Reports the channel's status transitions and
 * waits longer than the main check, to tell "never connected" apart from
 * "connected but no events arrived".
 *
 *   npm run diagnose:realtime
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file: string) {
  let raw = "";
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL_ || !ANON || !SERVICE) {
  console.log("Fill in .env.local first.");
  process.exit(1);
}

async function main() {
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const pub = createClient(URL_, ANON, { auth: { persistSession: false } });

  const code = `D${randomBytes(2).toString("hex").toUpperCase().slice(0, 3)}`;
  console.log(`\nUsing scratch room ${code}\n`);

  const ins = await admin.from("games").insert({ code, state: { version: 1, seq: 0 } });
  if (ins.error) {
    console.log("Could not create the scratch room:", ins.error.message);
    return;
  }

  let sawStatus = "";
  let events = 0;
  let filtered = 0;

  // Unfiltered: does Realtime publish this table at all?
  const channel = pub
    .channel(`diag:${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "games" }, (payload) => {
      events++;
      console.log(`  EVENT (no filter)  ${payload.eventType} on ${(payload.new as { code?: string })?.code}`);
    })
    .subscribe((status, err) => {
      sawStatus = status;
      console.log(`  status (no filter): ${status}${err ? ` — ${err.message}` : ""}`);
    });

  // Filtered exactly the way the app subscribes. This is the one that matters.
  const filteredChannel = pub
    .channel(`diag-filtered:${code}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "games", filter: `code=eq.${code}` },
      () => {
        filtered++;
        console.log(`  EVENT (filtered)   UPDATE on ${code}`);
      }
    )
    .subscribe((status, err) => {
      console.log(`  status (filtered):  ${status}${err ? ` — ${err.message}` : ""}`);
    });

  // Give the socket time, then write a few times.
  await new Promise((r) => setTimeout(r, 4000));

  for (let i = 1; i <= 3; i++) {
    const { error } = await admin
      .from("games")
      .update({ state: { version: 1, seq: i } })
      .eq("code", code);
    console.log(`  wrote seq=${i}${error ? ` (error: ${error.message})` : ""}`);
    await new Promise((r) => setTimeout(r, 2500));
  }

  await new Promise((r) => setTimeout(r, 4000));

  console.log("\n--- result ---");
  console.log(`last channel status      : ${sawStatus || "(never reported)"}`);
  console.log(`events, NO filter        : ${events}`);
  console.log(`events, WITH code filter : ${filtered}   <-- what the app uses`);

  if (events > 0) {
    console.log("\nRealtime is working. The main check may just have been impatient.");
  } else if (sawStatus === "SUBSCRIBED") {
    console.log(
      [
        "",
        "The websocket connected fine, but no row events arrived. That means the",
        "`games` table is not being published. In the Supabase dashboard go to",
        "Database -> Publications -> supabase_realtime and switch on `games`,",
        "or run this in the SQL editor:",
        "",
        "  alter publication supabase_realtime add table games;",
        "",
      ].join("\n")
    );
  } else {
    console.log(
      [
        "",
        "The websocket never subscribed, so this is a connection problem rather",
        "than a publication one. Check that Realtime is enabled for the project",
        "(Project Settings -> Realtime) and that nothing local is blocking",
        "websockets.",
        "",
      ].join("\n")
    );
  }

  await pub.removeChannel(channel);
  await pub.removeChannel(filteredChannel);
  await admin.from("games").delete().eq("code", code);
  process.exit(0);
}

main().catch((e) => {
  console.error("Unexpected error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
