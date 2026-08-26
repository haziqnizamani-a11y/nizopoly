"use client";

export interface Session {
  playerId: string;
  secret: string;
  name: string;
}

const key = (code: string) => `nizopoly:${code.toUpperCase()}`;

export function loadSession(code: string): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(code));
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s.playerId && s.secret ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(code: string, session: Session): void {
  try {
    window.localStorage.setItem(key(code), JSON.stringify(session));
  } catch {
    // Private browsing with storage disabled — the player just re-joins.
  }
}

export function clearSession(code: string): void {
  try {
    window.localStorage.removeItem(key(code));
  } catch {
    // Ignore.
  }
}

export function rememberName(name: string): void {
  try {
    window.localStorage.setItem("nizopoly:name", name);
  } catch {
    // Ignore.
  }
}

export function recallName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("nizopoly:name") ?? "";
  } catch {
    return "";
  }
}
