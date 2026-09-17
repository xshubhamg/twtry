import { defineTool } from "eve/tools";
import { z } from "zod";
import { loadQueue, saveQueue, newId, setStatus } from "../lib/db.js";
import { buildSlots, isTopic, POSTS_PER_48H, todayIst, type QueuedPost } from "../lib/topics.js";

const draftSchema = z.object({
  text: z.string().min(1).max(300),
  topic: z.string(),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  generatedBy: z.string(),
});

export default defineTool({
  description:
    "Manage the local tweet queue (queue/queue.json). Actions: enqueue (assigns the 15 IST slots, 7+8 split), list, mark posted/skipped.",
  inputSchema: z.object({
    action: z.enum(["enqueue", "list", "mark"]),
    drafts: z.array(draftSchema).optional(),
    status: z.enum(["ready", "posted", "skipped"]).optional(),
    id: z.string().optional(),
  }),
  label: { start: ({ action }) => `Queue ${action}` },
  async execute({ action, drafts, status, id }) {
    const queue = loadQueue();
    if (action === "list") {
      const rows = status ? queue.filter((q) => q.status === status) : queue;
      return { count: rows.length, posts: rows };
    }
    if (action === "mark") {
      if (!id || !status) throw new Error("mark needs id and status");
      const updated = setStatus(queue, id, status);
      if (!updated) throw new Error(`no post with id ${id}`);
      const file = saveQueue(queue);
      return { ok: true, file, post: updated };
    }
    // enqueue
    const valid = (drafts ?? []).filter((d) => isTopic(d.topic));
    if (valid.length === 0) throw new Error("enqueue needs at least one draft with a known topic");
    const slots = buildSlots(todayIst());
    const take = Math.min(valid.length, POSTS_PER_48H, slots.length);
    const now = new Date().toISOString();
    const rows: QueuedPost[] = valid.slice(0, take).map((d, i) => ({
      id: newId(),
      text: d.text,
      topic: d.topic as QueuedPost["topic"],
      sourceUrl: d.sourceUrl,
      sourceTitle: d.sourceTitle,
      generatedBy: (d.generatedBy === "deepseek" ? "deepseek" : "template") as QueuedPost["generatedBy"],
      slotIst: slots[i].slotIst,
      slotUtc: slots[i].slotUtc,
      status: "ready" as const,
      createdAt: now,
    }));
    const merged = [...queue, ...rows];
    const file = saveQueue(merged);
    return { ok: true, file, enqueued: rows.length, posts: rows };
  },
});
