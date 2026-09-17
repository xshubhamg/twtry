// Offline dry run of the harvest pipeline (no API keys needed).
// Uses heuristic judging + template drafts. Run: bun scripts/dryrun.ts
import scrapeWeb from "../agent/tools/scrape_web.js";
import judgeCandidates from "../agent/tools/judge_candidates.js";
import rewriteTweets from "../agent/tools/rewrite_tweets.js";
import queueStore from "../agent/tools/queue_store.js";
import exportQueue from "../agent/tools/export_queue.js";

const ctx = undefined as never;

const scraped = (await scrapeWeb.execute({ topics: undefined, maxPerTopic: 5 }, ctx)) as {
  count: number;
  candidates: { title: string; url: string; source: string; topic: string; engagement: number }[];
};
console.log(`scraped: ${scraped.count}`);

const judged = (await judgeCandidates.execute({ candidates: scraped.candidates }, ctx)) as {
  keptCount: number;
  kept: { title: string; url: string; topic: string }[];
};
console.log(`kept: ${judged.keptCount}`);

const ideas = judged.kept.slice(0, 15).map((k) => ({ title: k.title, url: k.url, topic: k.topic }));
const rewritten = (await rewriteTweets.execute({ ideas }, ctx)) as {
  drafts: { text: string; topic: string; sourceUrl: string; sourceTitle: string; generatedBy: string }[];
};
console.log(`drafts: ${rewritten.drafts.length}`);

const enqueued = (await queueStore.execute({ action: "enqueue", drafts: rewritten.drafts }, ctx)) as {
  file: string;
  enqueued: number;
};
console.log(`enqueued: ${enqueued.enqueued} -> ${enqueued.file}`);

const exported = (await exportQueue.execute({ format: "both" }, ctx)) as { count: number; files: string[] };
console.log(`exported: ${exported.count} -> ${exported.files.join(", ")}`);
