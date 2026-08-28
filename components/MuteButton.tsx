"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/client/sound";

export function MuteButton() {
  // Read after mount: localStorage isn't available during the server render.
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMuted(sound.isMuted());
    return sound.onChange(setMuted);
  }, []);

  return (
    <button
      type="button"
      className="btn btn-ghost btn-dense px-1.5"
      aria-pressed={muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        const next = !muted;
        sound.setMuted(next);
        if (!next) sound.play("turn");
      }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
