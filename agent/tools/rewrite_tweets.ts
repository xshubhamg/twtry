import { defineTool } from "eve/tools";
import { z } from "zod";
import { generateDraft } from "../lib/generate.js";

export default defineTool({
  description:
    "Rewrite kept ideas into original tweet drafts (≤280 chars). Uses DeepSeek Flash when DEEPSEEK_API_KEY is set, templates otherwise. Never copies headlines verbatim.",
  inputSchema: z.object({
    ideas: z
      .array(z.object({ title: z.string(), url: z.string(), topic: z.string() }))
      .min(1)
      .max(40),
  }),
  label: { start: ({ ideas }) => `Rewrite ${ideas.length} tweet drafts` },
  async execute({ ideas }) {
    const drafts = await Promise.all(
      ideas.map(async (i) => {
        const { text, generatedBy } = await generateDraft(`${i.title} (${i.url})`, i.topic);
        return {
          text,
          topic: i.topic,
          sourceUrl: i.url,
          sourceTitle: i.title,
          generatedBy,
        };
      }),
    );
    return { count: drafts.length, drafts };
  },
});
