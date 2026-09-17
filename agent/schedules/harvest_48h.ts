import { defineSchedule } from "eve/schedules";

// Fires 03:30 UTC (= 09:00 IST) every 2 days — before the 3PM IST window opens.
// Task mode: runs the harvest, writes queue + export files, no channel delivery.
export default defineSchedule({
  cron: "30 3 */2 * *",
  markdown: [
    "Run the 48-hour tweet harvest.",
    "1. Call scrape_web for all four topics (maxPerTopic 20).",
    "2. Call judge_candidates on the result.",
    "3. Load the tweet_playbook skill, then call rewrite_tweets for up to 20 keepers (top by virality).",
    "4. Review and lightly edit drafts for voice and originality, then call queue_store action=enqueue with exactly 15 drafts (drop the weakest).",
    "5. Call export_queue with format=both.",
    "6. Reply with a short summary: counts per topic, drops with reasons, export file paths.",
  ].join(" "),
});
