// Tweet-draft generation: DeepSeek Flash (OpenAI-compatible) when configured,
// deterministic templates otherwise. Always returns original phrasing ideas for
// the agent to finalize — never copies source text.

export const MAX_TWEET = 280;

const SYSTEM = `You rewrite tech news into original tweets for a developer audience.
Rules: under 280 characters, no copying the headline verbatim, max 2 hashtags,
no emojis spam (max 1), no engagement bait, no invented personal experience.
Return ONLY the tweet text, nothing else.`;

export function fitTweet(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= MAX_TWEET) return t;
  return t.slice(0, MAX_TWEET - 1).split(" ").slice(0, -1).join(" ") + "…";
}

async function viaDeepseek(idea: string, topic: string): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const base = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    const model = process.env.GENERATION_MODEL ?? "deepseek-flash";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Topic: ${topic}\nIdea: ${idea}\nWrite the tweet:` },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text ? fitTweet(text) : null;
  } catch {
    return null;
  }
}

function viaTemplate(idea: string, topic: string): string {
  const short = idea.length > 140 ? idea.slice(0, 137).trimEnd() + "…" : idea;
  const tag = topic === "TypeScript/JavaScript" ? "#TypeScript" : topic === "AI" ? "#AI" : topic === "Open Source" ? "#OpenSource" : "#Dev";
  return fitTweet(`Worth knowing (${tag}): ${short}\n\nMy take below — what am I missing?`);
}

/** Returns { text, generatedBy } for one idea. */
export async function generateDraft(
  idea: string,
  topic: string,
): Promise<{ text: string; generatedBy: "deepseek" | "template" }> {
  const llm = await viaDeepseek(idea, topic);
  if (llm) return { text: llm, generatedBy: "deepseek" };
  return { text: viaTemplate(idea, topic), generatedBy: "template" };
}
