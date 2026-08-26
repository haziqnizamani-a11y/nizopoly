/**
 * Verifies a Supabase project is wired up correctly for Nizopoly.
 *
 *   npm run check:supabase
 *
 * Checks connectivity, both tables, that player secrets are NOT readable with
 * the public key, the optimistic-concurrency write, and a live Realtime push.
 * Cleans up the room it creates.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// tsx doesn't load .env.local the way `next` does.
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
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadEnv(".env.local");

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let failures = 0;
const pass = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string, detail?: unknown) => {
  failures++;
  console.log(`  FAIL  ${m}`);
  if (detail) console.log(`        ${String(detail).slice(0, 300)}`);
};

function requireEnv(): { url: string; anon: string; service: string } {
  const missing = [
    !URL_ && "NEXT_PUBLIC_SUPABASE_URL",
    !ANON && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !SERVICE && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length) {
    console.log("\nMissing from .env.local:\n");
    for (const m of missing) console.log(`  - ${m}`);
    console.log("\nCopy .env.local.example to .env.local and fill it in.\n");
    process.exit(1);
  }
  if (ANON === SERVICE) {
    console.log("\nThe anon key and service role key are identical — you have pasted the");
    console.log("same value twice. They are two different keys in the dashboard.\n");
    process.exit(1);
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(URL_!)) {
    console.log(`\nNEXT_PUBLIC_SUPABASE_URL looks wrong: ${URL_}`);
    console.log("It should look like https://abcdefgh.supabase.co\n");
    process.exit(1);
  }
  return { url: URL_!, anon: ANON!, service: SERVICE! };
}

async function main() {
  const { url, anon, service } = requireEnv();
  console.log(`\nChecking ${url}\n`);

  const admin: SupabaseClient = createClient(url, service, { auth: { persistSession: false } });
  const pub: SupabaseClient = createClient(url, anon, { auth: { persistSession: false } });

  // 1. Tables exist and the service role can reach them. Distinguish the three
  // ways this fails, because the fix is different for each.
  for (const table of ["games", "game_players"]) {
    const { error } = await admin.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (!error) {
      pass(`table "${table}" exists`);
      continue;
    }

    const msg = error.message ?? "";
    fail(`table "${table}" is reachable`, msg);

    if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) {
      console.log("\nCould not reach the project at all. Check that:");
      console.log("  - NEXT_PUBLIC_SUPABASE_URL is the right project");
      console.log("  - the project isn't paused (free projects sleep after inactivity)");
      console.log("  - this machine has internet access\n");
    } else if (/JWT|api key|Invalid|401|unauthor/i.test(msg)) {
      console.log("\nThe project answered but rejected the key. Re-copy");
      console.log("SUPABASE_SERVICE_ROLE_KEY from Settings → API → service_role.\n");
    } else if (/does not exist|42P01|schema cache/i.test(msg)) {
      console.log("\nThe project is reachable but the tables are missing.");
      console.log("Paste supabase/schema.sql into the SQL editor and run it.\n");
    }
    process.exit(1);
  }

  const code = `T${randomBytes(2).toString("hex").toUpperCase().slice(0, 3)}`;
  const secret = randomBytes(16).toString("base64url");
  let created = false;

  try {
    // 2. Service role can create a room.
    const seed = { version: 1, seq: 0, marker: "check" };
    const ins = await admin.from("games").insert({ code, state: seed });
    if (ins.error) {
      fail("service role can insert a room", ins.error.message);
      return;
    }
    created = true;
    pass("service role can insert a room");

    const sec = await admin
      .from("game_players")
      .insert({ code, player_id: "checker", secret });
    if (sec.error) fail("service role can store a player secret", sec.error.message);
    else pass("service role can store a player secret");

    // 3. The public key must read game state...
    const anonRead = await pub.from("games").select("state").eq("code", code).maybeSingle();
    if (anonRead.error || !anonRead.data) {
      fail("anon key can read game state (needed for Realtime)", anonRead.error?.message);
    } else {
      pass("anon key can read game state");
    }

    // 4. ...but must NOT be able to read secrets. This is the important one.
    const leak = await pub.from("game_players").select("secret").eq("code", code);
    if (leak.error || (leak.data?.length ?? 0) === 0) {
      pass("anon key CANNOT read player secrets");
    } else {
      fail(
        "anon key CANNOT read player secrets — RLS is not protecting game_players",
        `got ${leak.data!.length} row(s); re-run supabase/schema.sql`
      );
    }

    // 5. Optimistic concurrency: the seq-guarded update must land once only.
    const good = await admin
      .from("games")
      .update({ state: { version: 1, seq: 1, marker: "check" } })
      .eq("code", code)
      .eq("state->>seq", "0")
      .select("code");
    if (good.error || (good.data?.length ?? 0) !== 1) {
      fail("seq-guarded write succeeds on a fresh read", good.error?.message);
    } else {
      pass("seq-guarded write succeeds on a fresh read");
    }

    const stale = await admin
      .from("games")
      .update({ state: { version: 1, seq: 99, marker: "stale" } })
      .eq("code", code)
      .eq("state->>seq", "0") // seq is 1 now, so this must match nothing
      .select("code");
    if (stale.error || (stale.data?.length ?? 0) !== 0) {
      fail("stale write is rejected (two players acting at once)", stale.error?.message);
    } else {
      pass("stale write is rejected");
    }

    // 6. Realtime: subscribe with the public key, write with the service key.
    const gotPush = await new Promise<boolean>((resolve) => {
      const channel = pub
        .channel(`check:${code}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "games", filter: `code=eq.${code}` },
          () => {
            void pub.removeChannel(channel);
            resolve(true);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void admin
              .from("games")
              .update({ state: { version: 1, seq: 2, marker: "push" } })
              .eq("code", code);
          }
        });
      setTimeout(() => {
        void pub.removeChannel(channel);
        resolve(false);
      }, 12_000);
    });

    if (gotPush) pass("Realtime pushes state changes to players");
    else
      fail(
        "Realtime pushes state changes",
        "no event within 12s — check that schema.sql added `games` to the supabase_realtime publication"
      );
  } finally {
    if (created) await admin.from("games").delete().eq("code", code);
  }

  console.log("");
  if (failures === 0) {
    console.log("All checks passed. Run `npm run dev` and start a game.\n");
  } else {
    console.log(`${failures} check(s) failed — see above.\n`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("\nUnexpected error:", e instanceof Error ? e.message : e, "\n");
  process.exitCode = 1;
});
