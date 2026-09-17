import { defineTool } from "eve/tools";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadQueue } from "../lib/db.js";

function outDir(): string {
  const dir = resolve(process.cwd(), process.env.QUEUE_DIR ?? "./queue");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export default defineTool({
  description:
    "Export ready queue posts as a copy-paste sheet (markdown and/or JSON) under queue/. This is how the user posts manually — no X API involved.",
  inputSchema: z.object({ format: z.enum(["markdown", "json", "both"]).default("both") }),
  label: { start: () => "Export posting sheet" },
  async execute({ format }) {
    const ready = loadQueue().filter((q) => q.status === "ready");
    const stamp = new Date().toISOString().slice(0, 10);
    const dir = outDir();
    const files: string[] = [];
    let preview = "";
    if (format === "markdown" || format === "both") {
      const md = [
        `# twtry — ${stamp} (48h, ${ready.length} posts, 3PM–3AM IST)`,
        "",
        ...ready.flatMap((p, i) => [
          `## ${i + 1}. ${p.slotIst}  (${p.slotUtc})`,
          "",
          p.text,
          "",
          `- topic: ${p.topic} · source: [${p.sourceTitle}](${p.sourceUrl})`,
          "",
        ]),
      ].join("\n");
      const mdPath = join(dir, `${stamp}_48h.md`);
      writeFileSync(mdPath, md);
      files.push(mdPath);
      preview = md.slice(0, 1200);
    }
    if (format === "json" || format === "both") {
      const jsonPath = join(dir, `${stamp}_48h.json`);
      writeFileSync(jsonPath, JSON.stringify(ready, null, 2) + "\n");
      files.push(jsonPath);
    }
    return { count: ready.length, files, preview };
  },
});
