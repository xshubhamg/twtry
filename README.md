# twtry

[![CI](https://github.com/xshubhamg/twtry/actions/workflows/ci.yml/badge.svg)](https://github.com/xshubhamg/twtry/actions/workflows/ci.yml)

A tweet-idea scheduler built on [eve](https://eve.dev). Every 48 hours it
harvests what's buzzing in your topics, judges what's worth adapting with
[TypeSafe Jev](https://typesafe.ai), rewrites the keepers into original tweets
with DeepSeek, and queues **15 posts into 3PM–3AM IST slots** as a copy-paste
sheet. No X API, no posting costs — you post manually.

## How it works

```
48h cron (harvest_48h) ─▶ scrape_web (HN, Reddit, dev.to — all free)
  ─▶ judge_candidates (Jev Choice/Score/Noul, heuristic fallback)
  ─▶ rewrite_tweets (DeepSeek Flash, template fallback)
  ─▶ queue_store (assigns 15 IST slots: 7 day-one + 8 day-two)
  ─▶ export_queue (queue/YYYY-MM-DD_48h.md + .json for manual posting)
```

Topics: **AI · TypeScript/JavaScript · Software Development · Open Source**

Slots (IST): day one `15:00, 16:42, 18:24, 20:06, 21:48, 23:30, 01:12` ·
day two `15:00, 16:30, 18:00, 19:30, 21:00, 22:30, 00:00, 01:30`.
Cron fires `30 3 */2 * *` (09:00 IST every 2 days). Slot math lives in
`agent/lib/topics.ts` and is covered by `tests/slots.test.ts`.

## Getting started

Prerequisites: [Bun](https://bun.sh) ≥ 1.2, a TypeSafe API key, a DeepSeek API
key (both have generous cheap/free tiers).

```bash
bun install
cp .env.example .env   # fill in TYPESAFE_API_KEY + DEEPSEEK_API_KEY
bun x eve dev --no-ui  # start the dev server
```

Fire the first harvest without waiting 48 hours:

```bash
curl -X POST http://127.0.0.1:2000/eve/v1/dev/schedules/harvest_48h
```

Output lands in `queue/` (gitignored): `queue.json` plus a dated
`YYYY-MM-DD_48h.md` copy-paste sheet and matching `.json`.

Offline check of the whole tool chain (no agent run, no keys needed —
falls back to heuristics + templates):

```bash
bun scripts/dryrun.ts
```

## Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `bun run dev`       | Eve dev server with HMR (`--no-ui` for API)   |
| `bun run typecheck` | `tsc --noEmit`                                |
| `bun test`          | Slot-math + queue unit tests                  |
| `bun scripts/dryrun.ts` | End-to-end tool-chain dry run             |
| `bun run build` / `bun run start` | Production build / serve (runs schedules) |
| `bun x eve deploy`  | Deploy to Vercel (schedules become Cron Jobs) |

## Deployment

- **Local / VPS:** `bun x eve build && bun x eve start` on an always-on
  machine — the Nitro schedule runner fires `harvest_48h` on its cron.
- **Vercel:** `bun x eve deploy`. Each schedule becomes a Vercel Cron Job
  (UTC). Set `TYPESAFE_API_KEY` and `DEEPSEEK_API_KEY` in the project
  environment first.

## Costs (approx, per 48h run)

- Scraping: $0 (public HN/Reddit/dev.to endpoints).
- Jev judging: ~$0.001 ( $0.042 / 1M input tokens, outputs free).
- DeepSeek rewriting: cents (`deepseek-chat` / `deepseek-flash`).
- X API: $0 — nothing is posted programmatically by design.

## Project structure

```
agent/
├── agent.ts            # DeepSeek direct provider (bypasses AI Gateway free-tier limits)
├── instructions.md     # Agent identity + harvest workflow + rules
├── lib/                # topics/slots, JSON queue, Jev client, generator
├── tools/              # scrape_web, judge_candidates, rewrite_tweets, queue_store, export_queue
├── schedules/          # harvest_48h (cron 30 3 */2 * *)
└── skills/             # tweet_playbook (virality rubric, voice, thresholds)
tests/                  # bun:test — slot math
scripts/dryrun.ts       # offline pipeline check
queue/                  # local output (gitignored)
```

## Bun notes

- Bun is the toolchain: installs, scripts, tests. Run Eve commands as
  `bun x eve …`.
- Eve's dev/prod **runtime is Node** — don't run the server itself under
  `bun --bun` (known `crossws` incompatibility), and deploy on the default
  Node runtime.
- The queue is a plain JSON file, not `bun:sqlite`, so tools run identically
  under Node locally and on Vercel.

## Security

- Secrets live only in `.env` (gitignored via `.env*`). Never commit keys,
  tokens, or the `queue/` output.
- The agent never calls the X API and never reproduces source text verbatim;
  drafts are rewrites with linked attribution.

## Contributing

1. Fork, branch off `main`, keep changes scoped.
2. `bun run typecheck && bun test` must pass; `bun x eve info` must report
   0 diagnostics.
3. Open a PR describing behavior change + verification. CI runs the same
   checks.

## License

MIT — see [LICENSE](LICENSE).
