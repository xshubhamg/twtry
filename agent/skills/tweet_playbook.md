Use when drafting, judging, or scheduling tweets: virality rubric, voice guide, and queue workflow.

# tweet_playbook

## Virality rubric (tech Twitter, dev audience)

- Hook first: lead with the surprising number, breakage, or take. Never start with "Excited to share".
- Specific > generic: "TS 5.9 cuts build memory 22%" beats "TypeScript is great".
- One idea per tweet. If it needs two ideas, it's two tweets.
- End with an invitation, not bait: "what am I missing?" > "RT if you agree".
- Max 2 hashtags, placed at the end. Max 1 emoji, or none.

## Voice per topic

- AI: practitioner-skeptic. Numbers, evals, failure modes.
- TypeScript/JavaScript: precise, version-pinned, snippet-friendly.
- Software Development: war stories, trade-offs, boring-reliability praise.
- Open Source: contributor-first, credit maintainers, link the repo.

## Judging thresholds (mirror agent/lib/jev.ts)

- keep requires: Jev choice=keep, confidence ≥ 0.60, safe ≥ 0.70.
- Prefer virality ≥ 3 and copyRisk < 0.7.
- Auto-discard: giveaways, airdrops, follower-buying, NSFW-adjacent, pure promo with no technical content.

## Queue workflow reminder

15 posts per 48h, 7 on day 1 + 8 on day 2, slots in agent/lib/topics.ts.
Enqueue exactly 15: if more keepers, drop lowest virality; if fewer, say so
and ship short rather than padding with weak posts.
