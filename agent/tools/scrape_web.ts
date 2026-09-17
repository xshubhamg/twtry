import { defineTool } from "eve/tools";
import { z } from "zod";
import { TOPIC_SOURCES, isTopic, type Candidate, type Topic } from "../lib/topics.js";

const UA = { "User-Agent": "twtry-scheduler/0.1 (personal project)" };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<unknown>;
}

interface HnHit {
  title?: string;
  url?: string;
  objectID: string;
  points?: number;
}

async function fromHN(query: string, topic: Topic, out: Candidate[]): Promise<void> {
  const [front, search] = await Promise.all([
    getJson("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20"),
    getJson(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=15`),
  ]);
  for (const page of [front, search]) {
    const hits = (page as { hits?: HnHit[] }).hits ?? [];
    for (const h of hits) {
      if (!h.title) continue;
      out.push({
        title: h.title,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: "hackernews",
        topic,
        engagement: h.points ?? 0,
      });
    }
  }
}

interface RedditChild {
  data?: { title?: string; permalink?: string; score?: number; url?: string };
}

async function fromReddit(subs: string[], topic: Topic, out: Candidate[]): Promise<void> {
  for (const sub of subs.slice(0, 2)) {
    const json = await getJson(`https://www.reddit.com/r/${sub}/hot.json?limit=8`);
    const children = (json as { data?: { children?: RedditChild[] } }).data?.children ?? [];
    for (const c of children) {
      const d = c.data;
      if (!d?.title) continue;
      out.push({
        title: d.title,
        url: d.url?.startsWith("http") ? d.url : `https://www.reddit.com${d.permalink ?? ""}`,
        source: `reddit/r/${sub}`,
        topic,
        engagement: d.score ?? 0,
      });
    }
  }
}

interface DevtoArticle {
  title?: string;
  url?: string;
  positive_reactions_count?: number;
}

async function fromDevto(tag: string, topic: Topic, out: Candidate[]): Promise<void> {
  const json = await getJson(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&state=rising&per_page=8`);
  for (const a of (json as DevtoArticle[]).slice(0, 8)) {
    if (!a.title || !a.url) continue;
    out.push({ title: a.title, url: a.url, source: "dev.to", topic, engagement: a.positive_reactions_count ?? 0 });
  }
}

export default defineTool({
  description:
    "Scrape fresh, free web sources (Hacker News, Reddit, dev.to) for tweet-worthy ideas in the user's topics. Returns deduplicated candidates with engagement signals.",
  inputSchema: z.object({
    topics: z.array(z.string()).optional().describe("Subset of topics; default all four"),
    maxPerTopic: z.number().int().min(1).max(40).default(20),
  }),
  label: { start: () => "Scrape web for tweet ideas" },
  async execute({ topics, maxPerTopic }) {
    const wanted = topics?.filter(isTopic) ?? [...TOPIC_SOURCES.map((t) => t.topic)];
    const list = TOPIC_SOURCES.filter((t) => wanted.includes(t.topic));
    const raw: Candidate[] = [];
    for (const t of list) {
      await Promise.allSettled([fromHN(t.hnQuery, t.topic, raw), fromReddit(t.subreddits, t.topic, raw), fromDevto(t.devtoTag, t.topic, raw)]);
    }
    const seen = new Set<string>();
    const deduped = raw.filter((c) => {
      const key = c.url.split("?")[0].toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const byTopic = new Map<string, Candidate[]>();
    for (const c of deduped.sort((a, b) => b.engagement - a.engagement)) {
      const arr = byTopic.get(c.topic) ?? [];
      if (arr.length < maxPerTopic) {
        arr.push(c);
        byTopic.set(c.topic, arr);
      }
    }
    const candidates = [...byTopic.values()].flat();
    return { count: candidates.length, candidates };
  },
});
