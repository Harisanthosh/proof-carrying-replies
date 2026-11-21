# X algorithm learnings

Public, source-backed notes on how X's For You ranking and Original Content Rewards work, maintained as a reusable skill.

- Playbook: [SKILL.md](./SKILL.md)
- Use it when drafting or reviewing X posts and replies, explaining For You ranking or payouts, spotting official X creator or product trends, or appending a new learning with a date and source.

## Sources

Code citations are pinned to [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) commit [`ed78e06`](https://github.com/xai-org/x-algorithm/commit/ed78e0645cfafcd026cfc1fd0da964f630533334) (full SHA `ed78e0645cfafcd026cfc1fd0da964f630533334`) unless a Changelog entry names a newer commit.

Official and reporting sources used in the 19–21 Nov 2026 entries:

- [@XCreators on video reach, 20 Nov 2026](https://x.com/XCreators/status/2123886385828684073) (X's claim: posts with video get 5x the reach and engagement; 36% of impressions go to video)
- [The Verge, 8 Aug 2026: Original Content Rewards](https://www.theverge.com/tech/977143/x-revenue-sharing-original-content-rewards)
- [Posthype: Original Content Rewards eligibility and qualified impressions](https://www.posthype.news/article/x-original-content-rewards-september)

Section-level walkthroughs that led to the first version of this playbook (19–20 Nov 2026) were written from the repo paths cited in `SKILL.md`, especially:

- `home-mixer/candidate_pipeline/phoenix_candidate_pipeline.rs`
- `home-mixer/params/param.rs` and `vm-ranker/params.rs`
- `xai-value-model/scoring.rs`
- `visibility-filtering/rules/levels.rs`
- `phoenix/xrex/models/recsys_two_tower_model.py`
- `home-mixer/scorers/author_cold_start.rs`
- `phoenix/crates/common/xai-recsys/src/reply.rs`

## Update rule

Append a dated Changelog entry with the source, update the relevant section, and commit to this folder. Full steps live in the "Update procedure" section of `SKILL.md`.
