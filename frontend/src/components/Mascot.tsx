import * as React from "react";

export type MascotMood = "happy" | "sad" | "thinking" | "stressed" | "neutral";

interface MascotProps {
  mood: MascotMood;
  description?: string;
}

const moodConfig: Record<MascotMood, { emoji: string; title: string; label: string; tone: string }> = {
  happy: {
    emoji: "😄",
    title: "Feeling great!",
    label: "Money is coming in",
    tone: "from-emerald-500 to-teal-500"
  },
  sad: {
    emoji: "😢",
    title: "Feeling low",
    label: "Losses are hurting",
    tone: "from-slate-600 to-slate-800"
  },
  thinking: {
    emoji: "🤔",
    title: "Thinking hard",
    label: "Searching for the next trade",
    tone: "from-sky-500 to-indigo-500"
  },
  stressed: {
    emoji: "😰",
    title: "Feeling stressed",
    label: "Pressure is rising",
    tone: "from-orange-500 to-rose-500"
  },
  neutral: {
    emoji: "🙂",
    title: "Standing by",
    label: "Watching the market",
    tone: "from-slate-500 to-slate-700"
  }
};

export function Mascot({ mood, description }: MascotProps) {
  const config = moodConfig[mood];

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
      <div className={`inline-flex items-center justify-center rounded-3xl bg-gradient-to-br ${config.tone} p-4 text-4xl shadow-[0_10px_40px_rgba(0,0,0,0.2)]`}>{config.emoji}</div>
      <div className="mt-4 space-y-2">
        <h3 className="text-sm uppercase tracking-[0.24em] text-slate-400">Mascot mood</h3>
        <p className="text-xl font-semibold text-slate-100">{config.title}</p>
        <p className="text-sm text-slate-400">{description ?? config.label}</p>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${config.tone} animate-pulse`} />
      </div>
    </div>
  );
}
