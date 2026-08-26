"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { GameState } from "../game/types";
import type { RoomAction } from "../server/rooms";
import { loadSession, type Session } from "./session";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const realtimeAvailable = Boolean(SUPABASE_URL && SUPABASE_ANON);

/** Realtime pushes state instantly; the poll is a safety net for dropped frames. */
const POLL_MS = realtimeAvailable ? 6000 : 1500;

export interface Room {
  state: GameState | null;
  session: Session | null;
  me: string | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  send: (action: RoomAction) => Promise<boolean>;
  dismissError: () => void;
  refresh: () => void;
}

export function useRoom(code: string): Room {
  const [state, setState] = useState<GameState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Realtime and polling can race; never let an older frame overwrite a newer one.
  const seqRef = useRef(-1);
  const accept = useCallback((next: GameState | null) => {
    if (!next) return;
    if (next.seq < seqRef.current) return;
    seqRef.current = next.seq;
    setState(next);
  }, []);

  useEffect(() => {
    // Session lives in localStorage, readable only after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(loadSession(code));
  }, [code]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not reach the room.");
        return;
      }
      const body = (await res.json()) as { state: GameState };
      accept(body.state);
      setError(null);
    } catch {
      setError("Connection lost. Retrying…");
    } finally {
      setLoading(false);
    }
  }, [code, accept]);

  useEffect(() => {
    // Kicks off polling; setState happens in the async callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Live push from Postgres when Supabase is configured.
  useEffect(() => {
    if (!realtimeAvailable) return;
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON!, {
      auth: { persistSession: false },
    });
    const channel: RealtimeChannel = supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `code=eq.${code}` },
        (payload) => accept((payload.new as { state: GameState }).state)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code, accept]);

  const send = useCallback(
    async (action: RoomAction): Promise<boolean> => {
      const s = loadSession(code);
      if (!s) {
        setError("You are not signed in to this room.");
        return false;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/rooms/${code}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ playerId: s.playerId, secret: s.secret, action }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? "That move was rejected.");
          void refresh();
          return false;
        }
        accept(body.state as GameState);
        setError(null);
        return true;
      } catch {
        setError("Connection lost. Retrying…");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, accept, refresh]
  );

  return {
    state,
    session,
    me: session?.playerId ?? null,
    loading,
    error,
    busy,
    send,
    dismissError: () => setError(null),
    refresh: () => void refresh(),
  };
}
