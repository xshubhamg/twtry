// TypeSafe Jev judging with heuristic fallback.
// Endpoint + primitives per TypeSafe docs: POST /v1/systemone, Choice/Score/Noul.
// Falls back to a transparent heuristic when TYPESAFE_API_KEY is missing or
// the API errors, so harvests keep working offline.

import type { Candidate, JudgedCandidate } from "./topics.js";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

interface JevAnswers {
  keep?: { choice?: string; confidence?: number; probabilities?: Record<string, number> };
  virality?: { score?: number; confidence?: number };
  safe?: { noul?: number; probability?: number };
  copy_risk?: { noul?: number; probability?: number };
  [k: string]: unknown;
}

async function jevCall(state: Record<string, unknown>): Promise<JevAnswers | null> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        model: "jev-latest",
        questions: {
          keep: {
            type: "choice",
            instructions: "Should this be adapted into a tweet for a dev audience?",
            criteria: {
              keep: "Novel, specific, high-signal for AI/TS/JS/dev-tooling/open-source readers",
              discard: "Stale, clickbait, vague, promo-only, or incomprehensible",
            },
          },
          virality: {
            type: "score",
            instructions: "Rate hook strength 1 (weak) to 5 (scroll-stopping) for a tech Twitter audience.",
          },
          safe: { type: "noul", instructions: "Is this safe and appropriate to adapt (no hate, NSFW, scams, giveaways)?" },
          copy_risk: {
            type: "noul",
            instructions: "Is the source text itself the whole value (joke/punchline), so any adaptation risks copying?",
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { answers?: JevAnswers };
    return json.answers ?? null;
  } catch {
    return null;
  }
}

const SPAM = ["giveaway", "airdrop", "100x", "crypto pump", "onlyfans", "nsfw", "buy followers"];

function heuristic(c: Candidate): Omit<JudgedCandidate, keyof Candidate> {
  const title = c.title.toLowerCase();
  const spam = SPAM.some((w) => title.includes(w));
  const engagementBoost = Math.min(1, c.engagement / 500);
  const lengthOk = c.title.length > 25 && c.title.length < 220;
  const confidence = spam ? 0.85 : 0.45 + engagementBoost * 0.3 + (lengthOk ? 0.1 : -0.15);
  const virality = spam ? 1 : Math.max(1, Math.min(5, Math.round(2 + engagementBoost * 2.5)));
  return {
    keep: !spam && confidence >= 0.5,
    confidence: Math.max(0, Math.min(1, confidence)),
    virality,
    safe: spam ? 0.1 : 0.9,
    copyRisk: title.includes("?") ? 0.3 : 0.5,
    judgedBy: "heuristic",
    reason: spam ? "spam/bait pattern" : `engagement=${c.engagement} lengthOk=${lengthOk}`,
  };
}

export async function judgeOne(c: Candidate): Promise<JudgedCandidate> {
  const answers = await jevCall({
    title: c.title,
    url: c.url,
    source: c.source,
    topic: c.topic,
    engagement: c.engagement,
  });
  if (!answers) return { ...c, ...heuristic(c) };

  const keepChoice = answers.keep?.choice ?? "discard";
  const keepConf = answers.keep?.confidence ?? 0.5;
  const virality = Math.max(1, Math.min(5, Math.round(answers.virality?.score ?? 3)));
  const safe = answers.safe?.noul ?? answers.safe?.probability ?? 0.5;
  const copyRisk = answers.copy_risk?.noul ?? answers.copy_risk?.probability ?? 0.5;
  const keep = keepChoice === "keep" && keepConf >= 0.6 && safe >= 0.7;
  return {
    ...c,
    keep,
    confidence: keepConf,
    virality,
    safe,
    copyRisk,
    judgedBy: "jev",
    reason: `jev choice=${keepChoice}`,
  };
}

export async function judgeAll(candidates: Candidate[]): Promise<JudgedCandidate[]> {
  const out: JudgedCandidate[] = [];
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = await Promise.all(candidates.slice(i, i + 5).map(judgeOne));
    out.push(...batch);
  }
  return out.sort((a, b) => Number(b.keep) - Number(a.keep) || b.virality - a.virality);
}
