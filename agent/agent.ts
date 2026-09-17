import { defineAgent } from "eve";
import { createDeepSeek } from "@ai-sdk/deepseek";

// Direct DeepSeek provider via DEEPSEEK_API_KEY — bypasses the Vercel
// AI Gateway free tier (rate-limited / model-unavailable on this account).
// Gateway fallback if you ever want it: model: "openai/gpt-5.6-luna-fast".
// Env override: GENERATION_MODEL=deepseek-flash (V4 Flash) — defaults to
// deepseek-chat, the stable cheap chat model.
const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

export default defineAgent({
  model: deepseek("deepseek-chat"),
  // Context-window escape hatch: direct (non-Gateway) models have no catalog
  // metadata, and compaction needs a window size. 64K is conservative for
  // deepseek-chat; harvest turns are far smaller so compaction never triggers.
  modelContextWindowTokens: 64000,
});
