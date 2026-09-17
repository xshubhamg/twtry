import { defineTool } from "eve/tools";
import { z } from "zod";
import { judgeAll } from "../lib/jev.js";

const candidateSchema = z.object({
  title: z.string(),
  url: z.string(),
  source: z.string(),
  topic: z.string(),
  engagement: z.number(),
});

export default defineTool({
  description:
    "Judge scraped candidates with TypeSafe Jev (Choice/Score/Noul in parallel; heuristic fallback without key). Returns keepers sorted by virality with reasons.",
  inputSchema: z.object({ candidates: z.array(candidateSchema).min(1).max(150) }),
  label: { start: ({ candidates }) => `Judge ${candidates.length} candidates` },
  async execute({ candidates }) {
    const valid = candidates.filter(
      (c): c is typeof c & { topic: "AI" | "TypeScript/JavaScript" | "Software Development" | "Open Source" } =>
        ["AI", "TypeScript/JavaScript", "Software Development", "Open Source"].includes(c.topic),
    );
    const judged = await judgeAll(valid);
    const kept = judged.filter((j) => j.keep);
    return {
      total: judged.length,
      keptCount: kept.length,
      judgedByJev: judged.filter((j) => j.judgedBy === "jev").length,
      kept,
      discarded: judged.filter((j) => !j.keep).map((j) => ({ title: j.title, reason: j.reason })),
    };
  },
});
