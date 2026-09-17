// Shared topics, schedule slots, and types for twtry.
// Slots are (dayOffset, HH:MM) in Asia/Kolkata; UTC derived with a fixed +5:30.

export const TOPICS = [
  "AI",
  "TypeScript/JavaScript",
  "Software Development",
  "Open Source",
] as const;

export type Topic = (typeof TOPICS)[number];

export interface TopicSource {
  topic: Topic;
  hnQuery: string;
  subreddits: string[];
  devtoTag: string;
}

export const TOPIC_SOURCES: TopicSource[] = [
  {
    topic: "AI",
    hnQuery: "AI agents LLM",
    subreddits: ["artificial", "MachineLearning", "LocalLLaMA"],
    devtoTag: "ai",
  },
  {
    topic: "TypeScript/JavaScript",
    hnQuery: "TypeScript JavaScript",
    subreddits: ["typescript", "javascript", "webdev"],
    devtoTag: "typescript",
  },
  {
    topic: "Software Development",
    hnQuery: "software engineering developer",
    subreddits: ["programming", "softwaredevelopment", "ExperiencedDevs"],
    devtoTag: "programming",
  },
  {
    topic: "Open Source",
    hnQuery: "open source",
    subreddits: ["opensource", "github", "selfhosted"],
    devtoTag: "opensource",
  },
];

export interface Candidate {
  title: string;
  url: string;
  source: string;
  topic: Topic;
  engagement: number;
}

export interface JudgedCandidate extends Candidate {
  keep: boolean;
  confidence: number;
  virality: number; // 1-5
  safe: number; // 0-1
  copyRisk: number; // 0-1
  judgedBy: "jev" | "heuristic";
  reason: string;
}

export interface Draft {
  text: string;
  topic: Topic;
  sourceUrl: string;
  sourceTitle: string;
  generatedBy: "deepseek" | "template";
}

export type PostStatus = "ready" | "posted" | "skipped";

export interface QueuedPost extends Draft {
  id: string;
  slotIst: string; // "2026-09-18 15:00 IST"
  slotUtc: string; // ISO string
  status: PostStatus;
  createdAt: string;
}

interface Slot {
  dayOffset: number;
  time: string;
}

// 7 posts day 1 (~102 min apart), 8 posts day 2 (90 min apart).
// All inside the 15:00–03:00 IST window.
export const DAY1_SLOTS: Slot[] = [
  { dayOffset: 0, time: "15:00" },
  { dayOffset: 0, time: "16:42" },
  { dayOffset: 0, time: "18:24" },
  { dayOffset: 0, time: "20:06" },
  { dayOffset: 0, time: "21:48" },
  { dayOffset: 0, time: "23:30" },
  { dayOffset: 1, time: "01:12" },
];

export const DAY2_SLOTS: Slot[] = [
  { dayOffset: 1, time: "15:00" },
  { dayOffset: 1, time: "16:30" },
  { dayOffset: 1, time: "18:00" },
  { dayOffset: 1, time: "19:30" },
  { dayOffset: 1, time: "21:00" },
  { dayOffset: 1, time: "22:30" },
  { dayOffset: 2, time: "00:00" },
  { dayOffset: 2, time: "01:30" },
];

export const POSTS_PER_48H = DAY1_SLOTS.length + DAY2_SLOTS.length; // 15

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

export function todayIst(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // YYYY-MM-DD
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function istToUtc(ymd: string, dayOffset: number, hhmm: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const ms = Date.UTC(y, m - 1, d + dayOffset, hh, mm) - IST_OFFSET_MS;
  return new Date(ms).toISOString();
}

/** 15 dated slots for a harvest starting on runDate (YYYY-MM-DD IST). */
export function buildSlots(runDateIst: string): { slotIst: string; slotUtc: string }[] {
  return [...DAY1_SLOTS, ...DAY2_SLOTS].map((s) => {
    const date = addDays(runDateIst, s.dayOffset);
    return {
      slotIst: `${date} ${s.time} IST`,
      slotUtc: istToUtc(runDateIst, s.dayOffset, s.time),
    };
  });
}

export function isTopic(t: string): t is Topic {
  return (TOPICS as readonly string[]).includes(t);
}
