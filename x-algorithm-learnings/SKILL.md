---
name: x-algorithm-playbook
description: Use when drafting or reviewing X posts and replies, explaining For You ranking or Original Content Rewards, spotting official X creator or product trends, or appending a new algorithm learning with a date and source.
---

# X algorithm playbook

Reusable notes on how X ranks For You posts, what the open-source code actually scores, and how small accounts should act on it.

Pin every code citation to [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) commit `ed78e06` (full SHA `ed78e0645cfafcd026cfc1fd0da964f630533334`, dated in-repo as the open-source release; the Day 2 cards treated this commit as current on 20 Nov 2026). If the repo has moved, re-check the lines before repeating a number.

**How to read this file**

- Code defaults are not live production values. Feature switches and experiments can override them.
- Weights multiply *predicted* probabilities (or a continuous value such as dwell time), not raw like or reply counts. The code itself warns against reading weight ratios as count equivalences such as "one report cancels N likes" (`home-mixer/params/param.rs` L431–L459; same comment in `xai-value-model/scoring.rs` L30–L40).
- Home Timeline actions are the ones that count for ranking. The published comment says actions from people who navigated straight to a post, including coordination off-platform, have no ranking impact (`home-mixer/params/param.rs` L455–L459).
- Mark new inferences as **Inference**. Do not invent numbers.

Working stance for small accounts, as of 21 Nov 2026: replies are the proven growth engine; original posts should be video-first and written so people stay and read, not scroll past; watch official X creator and product accounts and reply early when a trend is forming.

## How ranking works

A For You candidate roughly follows this path (`home-mixer/candidate_pipeline/phoenix_candidate_pipeline.rs`).

1. **Sourcing.** In-network posts come from Thunder (accounts the viewer follows). Out-of-network posts come from Phoenix retrieval, SimClusters, a popular-posts list, Tweet Mixer, topic and MoE Phoenix sources, SID, and a cached-posts source (source list at L387–L397).
2. **Pre-scoring filters.** The pipeline drops duplicates, posts older than 48 hours, already seen or already served posts, muted-keyword matches, and authors the viewer has blocked or muted, among other filters (filter list at L434–L458). The 48-hour cap is `MAX_POST_AGE = 48 * 60 * 60` (`home-mixer/params/config.rs` L41; applied as `AgeFilter` at `phoenix_candidate_pipeline.rs` L441). **Do this:** treat every post as having a two-day For You window. If a good idea missed, rewrite it and post it fresh later in the week rather than expecting the old post to keep circulating.
3. **Scoring.** Phoenix predicts the chance of each action (like, reply, repost, share, dwell, follow, and negatives such as not interested, mute, block, report). The value model turns those predictions into one score with a weighted sum (`xai-value-model/scoring.rs`, `weighted_terms` starting at L137). VM Ranker, an immersive video scorer, and later rerankers sit in the scorer list (`phoenix_candidate_pipeline.rs` L484–L490).
4. **Visibility filtering.** After ordering, out-of-network posts go through an extra drop list (`visibility-filtering/rules/levels.rs` L215–L220, `OON_POST_DROPS`), which includes `SpamHighRecall`. Spammy-looking posts can still reach followers; strangers may never see them.
5. **Blending.** Ads, Who to Follow, and prompts are mixed in around the ranked posts. There is nothing useful to tune here.

### Code-default action weights

Defaults below are from `home-mixer/params/param.rs` at `ed78e06`. They are starting values in code, not a promise of the live config. A second defaults file, `vm-ranker/params.rs`, disagrees on a few heads (noted under the table).

Positive or near-zero defaults:

| Signal | Default | Param lines |
|---|---:|---|
| Reply | 5.0 | L466 |
| Quote | 5.0 | L515 |
| Share via copy link | 20.0 | L508–L513 |
| Share via DM | 5.0 | L502–L507 |
| Follow author | 4.0 | L528–L533 |
| Share | 2.118 | L501 |
| Repost (retweet) | 1.0 | L479 |
| Like (favorite) | 0.708 | L460–L465 |
| Click | 0.274 | L492 |
| Open link | 0.2 | L493 |
| Continuous click-dwell time | 0.385 | L558–L563 |
| Photo expand | 0.05 | L480–L485 |
| Dwell | 0.05 | L514 |
| Quoted click | 0.05 | L516–L521 |
| Post unexplored | 0.015 | L534–L539 |
| Continuous dwell time | 0.0075 | L552–L557 |
| Video open | 0.0 | L486–L491 |
| Video quality view (VQV) | 0.0 | L500 |
| Profile click | 0.0 | L494–L499 |
| Quoted VQV | 0.0 | L522–L527 |
| Post video | 0.0 | L540–L545 |
| Grok analyze | 0.0 | L546–L551 |

Mutual-follow boost on *original* posts (not replies or reposts) from an author the viewer also follows back (`xai-value-model/inputs.rs` L20–L22; `reply_weight_for` / `dwell_weight_for` in `xai-value-model/weights.rs` L127–L143):

- `BidirectionalFollowReplyWeightBoost` default 15.0 (`param.rs` L467–L472), added on top of the reply weight.
- `BidirectionalFollowDwellWeightBoost` default 0.0 (`param.rs` L473–L478).

Negative defaults:

| Signal | Default | Param lines |
|---|---:|---|
| Report | -234.0 | L583 |
| Mute author | -58.8 | L577–L582 |
| Not interested | -53.07 | L565–L570 |
| Block author | -31.2 | L571–L576 |
| Not dwelled | -0.02 | L584–L589 |

`vm-ranker/params.rs` uses different defaults for a few of the same names: continuous click-dwell time 0.4 (L60–L65), post unexplored 0.02 (L90–L95), not interested -47.52 (L114–L119). If you quote a number, name the file.

**Do not** tell people that a report "is worth 234 likes." The code forbids that reading. Negative weights are large in part because those actions are rare, so the predicted probability needs a larger multiplier to matter at all (`param.rs` L443–L445).

### Engagement-bait labels

On 13 Nov 2026 the repo gained post labels for `SpamPromotesClicks`, `SpamPromotesReplies`, and `SpamPromotesShares`. In the annotation sink, `SpamPromotesShares` sits with engagement baiting and can also receive `SpamHighRecall`; the clicks and replies promote labels do not automatically get that spam label (`grox/flows/ptos/task_write_safety_post_annotations_result_sink.py` L236–L263).

On 19 Nov 2026 those three labels are sent to the ranker as reply, share, and click "ineligible" flags (`home-mixer/scorers/vm_ranker_engagement_labels.rs` L16–L23), behind `VMRankerSendEngagementIneligible`, which defaults to `false` (`home-mixer/params/param.rs` L676–L681).

**Do this:** cut "repost if you agree" and similar share-bait first, because the share label is already hooked to the out-of-network spam drop. Ease off "reply with…" and "click the link" asks before the ineligible-flags switch is turned on.

## Out-of-network scoring

Out-of-network (OON) posts are scored, then usually multiplied by a factor below 1.

- Default `OonWeightFactor` is 0.75 (`vm-ranker/params.rs` L241–L246). The factor is applied in `xai-value-model/scoring.rs` (`oon_applies` at L342–L351; `post_fusion_multipliers` at L381–L415).
- Topic requests use `TopicOonWeightFactor`, default 0.5 (`vm-ranker/params.rs` L235–L240).
- Optional class factors can split the OON multiplier into an engagement piece and a dwell-time piece. Those params default to -1.0, which the code treats as unset, so the single 0.75 factor is used (`vm-ranker/scoring/value_model.rs` `class_factors` at L130–L137; defaults at `vm-ranker/params.rs` L247–L258).
- When `EnableOonRescoreForInNetworkRepliesRetweets` is true (default true, `vm-ranker/params.rs` L218–L222), in-network *replies and reposts* can also receive the OON weight (`oon_applies`, `xai-value-model/scoring.rs` L342–L351).
- After scoring, OON posts can still be dropped for `DoNotAmplify`, `MaliciousUrl`, `SpamHighRecall`, or a Brazil election legal label (`visibility-filtering/rules/levels.rs` L215–L220).

**Retrieval, not just scoring.** Strangers also have to *find* the post.

- **Taste fingerprint.** Phoenix retrieval pulls posts whose embedding sits close to the viewer's. Posting unrelated topics in a short window blurs that fingerprint. **Do this:** pick two or three topics and stay with them for a month.
- **Neighborhoods (SimClusters).** Accounts are grouped by who engages with what. The people who like and reply to you help decide which neighborhood you live in, and therefore whose For You you appear in next. **Do this:** spend reply time with accounts in your own space, including small ones, rather than only in the comment pile under a huge viral post.

### Small-account lift

Fresh original posts from smaller accounts can be lifted in some viewers' feeds. This is bucketed as a test (treatment vs control), so treat it as a bonus, not a guarantee (`home-mixer/scorers/author_cold_start.rs`).

Eligibility, using code defaults:

- Originals only: not a reply and not a repost (`author_cold_start.rs` L188–L193).
- Author followers at or under `ColdStartFollowerCap`, default 50,000 (`home-mixer/params/param.rs` L730–L735).
- Post age at or under `ColdStartMaxPostAgeSecs`, default 7,200 seconds (two hours) (`param.rs` L736–L741).
- Home-feed view count under `ColdStartImpressionThreshold`, default 200 (`param.rs` L712–L717).
- Position cap uses `LowImpressionsMaxPositionRatio`, default 0.97 (`param.rs` L743–L748).

**Do this:** post when your people are actually online, and stay around in the first hour to answer replies. Replies and reposts do not get this lift.

## Dwell and negative signals

Dwell is a first-class signal in both retrieval and ranking.

- In the two-tower retrieval model, a full read (`CLIENT_TWEET_RECAP_DWELLED`) is a positive, and a scroll-past (`CLIENT_TWEET_RECAP_NOT_DWELLED`) is a soft negative (`phoenix/xrex/models/recsys_two_tower_model.py` L2996–L3000 and L3036–L3038). Day 2 dated this retrieval behaviour to October.
- In the ranker, predicted dwell has a small positive default weight (0.05), continuous dwell time is 0.0075, continuous click-dwell time is 0.385, and "not dwelled" is a small negative (-0.02). See the weights table above.
- Hard negatives in retrieval include report, not interested, see fewer, unfollow, block, mute, and not relevant (`recsys_two_tower_model.py` L3019–L3028). The ranker assigns large negative *probability* weights to report, mute, not interested, and block.

**Do this:** put the main point in the first line and delete the warmup. Long posts are fine when people want to keep going. A hot take that makes strangers mute or hit "not interested" is costly, especially out of network, where those people were never followers to begin with.

**Inference, not a measured weight:** paid reach and For You reach both suffer when people scroll past quickly, because "not dwelled" is logged as a soft miss and Original Content Rewards only count impressions with at least half the post on screen (see Monetisation).

## Replies and reply-back

Replies do two different jobs. Keep them straight.

- **Growth.** For small accounts, showing up early in other people's threads, in your own words, is the proven way to get found. A 21 Nov 2026 public comparison (see Changelog) found a 1.4K-follower account out-replied a 3K-follower account by about 13 to 1, and still had a much lower median on its *own* posts. That does not make replies useless. It says outbound replies and original-post quality are different levers. Replies stay the growth engine.
- **Ranking of your own posts.** Predicted replies are one of the highest default positive weights (5.0). Mutual-follow replies on originals can add the +15 boost above. That is a prediction about whether *this viewer* will reply, not a count of replies already received.
- **Reply-back (answering people who replied to you).** The open-source ranker does not publish a dedicated "author replied back" weight on the original post. Day 2's advice to stay and answer in the first hour is operational: it helps people, and it sits inside the two-hour small-account window. **Inference:** answering every comment is good manners and may help a conversation start; it is not, on current evidence, what makes a post break out to strangers.
- **Reply ordering under someone else's post.** When X orders replies, published inputs include whether the reply author is verified, whether the original poster liked the reply, whether the focal author replied, and whether it is a self-reply (`phoenix/crates/common/xai-recsys/src/reply.rs` L62–L69). The code does not publish how much each input weighs. **Do this:** write replies the original poster would genuinely like. Do not buy Premium only for this.
- **Monetisation.** Replies do not count toward Original Content Rewards eligibility or payouts (see Monetisation). When a reply gets traction, write that idea up as its own post the same day.

**Do this:** keep replies early, specific, and in a topical circle. Drop templated "let's grow together" lines. **Inference, not proven:** high-volume, bursty, generic connect replies may look low-quality to spam and engagement-bait systems.

## Video

Cite the reach claim as X's, not as something the open-source defaults prove.

On 20 Nov 2026 at 22:09 Europe/Berlin, [@XCreators](https://x.com/XCreators/status/2123886385828684073) wrote: "Video is the fastest growing format on X. Posts with video get 5x the reach and engagement, and 36% of all impressions now go to video." That is an official creator-account claim. The post had about 1.26 million impressions at the time it was logged for this playbook.

The published ranker defaults do *not* show a 5x video multiplier. At `ed78e06`, `PostVideoWeight`, `VqvWeight`, `VideoOpenWeight`, and the video-continuation weights default to 0.0 in `home-mixer/params/param.rs` and `vm-ranker/params.rs`. `MinVideoDurationMs` defaults to 10,000 (10 seconds) in `vm-ranker/params.rs` L163–L168, which is used when deciding VQV eligibility (`vm-ranker/scoring/value_model.rs` L185). An immersive video scorer is already in the For You scorer list (`phoenix_candidate_pipeline.rs` L477–L487).

**Inference:** the 5x / 36% figures may come from live overrides, a different surface, or from video's effect on dwell and watch time, which the ranker does model. Do not claim the open-source defaults "give video a 5x boost."

**Do this anyway:** make original posts video-first, because X is steering creators there and because dwell is a real ranking and payout signal. A video will not rescue a long lecture people scroll past. Put the point in the first seconds and the first line of the caption, and write a caption people finish.

## Monetisation (Original Content Rewards)

X replaced Creator Revenue Sharing with Original Content Rewards on 8 September 2026. This is product policy, not For You ranking code. Sources: [The Verge, 8 Aug 2026](https://www.theverge.com/tech/977143/x-revenue-sharing-original-content-rewards) and [Posthype](https://www.posthype.news/article/x-original-content-rewards-september).

Eligibility (meeting the numbers does not guarantee acceptance):

- Active Premium, Premium+, or Premium Business.
- At least 500 verified followers.
- At least 500,000 Home Timeline impressions from verified users in the last 90 days. Reply impressions are excluded from this bar.

Payouts are based on *qualified impressions*: unique views from Premium-tier users on the Home Timeline, with at least 50% of the post visible. Replies are not paid. Copied or lightly captioned work, and posts whose main value is someone else's content, do not qualify. Commentary that adds a real point can qualify. X has not published a per-impression rate. Payouts are described as biweekly with a $30 minimum.

**Do this:** big reach only pays when people stop and actually see the post. A viral spike that brings fast scrollers can raise impressions while lowering engagement rate and qualified payouts. When a reply takes off, turn it into an original post the same day so the idea can earn eligibility and payout views.

A 21 Nov 2026 walkthrough of [@vanshu](https://x.com/vanshu)'s own reported numbers is in the Changelog: more reach with a lower engagement rate, consistent with strangers scrolling past and with payouts requiring on-screen visibility.

## Early-reply trend spotting

X tells creators what it wants to amplify on official accounts first. Use those posts as the trend signal, then reply early and publish a stayed-and-read original the same day.

Watch, in order:

1. [@XCreators](https://x.com/XCreators) for format and monetisation guidance (the 20 Nov 2026 video post is the template).
2. Official X product, safety, and engineering accounts when they announce ranking, payout, or format changes.
3. The people in your topical reply circle who are already arguing about that change.

**Do this when a trend appears:**

- Reply in the first wave, in your own words, with one concrete observation. Do not paste a summary of the announcement.
- Same day, ship an original post (video-first) that a stranger can finish. Hook in line one. Make a claim people can agree or argue with.
- Log the official post, the date, and what you did in the Changelog, then follow the Update procedure.

The 48-hour For You window and the two-hour small-account lift both reward being early. Late commentary on a settled thread is mostly talking to people who already saw it.

## Small-account action checklist

1. Spend most X time on early, topical, specific replies. That is the growth engine. Do not replace it with a short-text posting style just because one mid-sized account did well with that style.
2. Ship one sharp original a day (or as often as you can make something people will finish). Video-first, caption that starts with the point, written so people stay and read.
3. Stay in two or three topics for a month so retrieval has a stable fingerprint.
4. Reply inside a relevant circle, not only under huge viral posts, and not with templated connect lines.
5. End originals on a question you actually want answered, or just end them. Skip "repost if you agree," "reply with…," and "click the link" bait.
6. Post when your people are online and answer replies in the first hour.
7. If a reply gets traction, publish it as an original the same day. Replies do not pay and do not count toward the 500K verified Home views bar.
8. Judge a post by whether people finished it, not only by raw impressions. Fast scrollers can inflate reach and still hurt ranking and payouts.
9. When official X accounts ship a format or payout change, reply early and log the learning here.

## Changelog

### 19 Nov 2026

- Day 1 read of the For You path at the then-current repo: sourcing, 48-hour filter, weighted scoring, OON visibility drops, blending. Practical takeaway: write so people stop and read; strangers are where small accounts grow; skip spammy-looking tricks.
- Confirmed the 13 Nov 2026 promote labels (`SpamPromotesClicks` / `Replies` / `Shares`) and the 19 Nov 2026 ranker "ineligible" flags, still behind a flag that defaults to false. Cut share-bait first.

### 20 Nov 2026

- Day 2: OON retrieval via taste fingerprints and SimClusters neighborhoods; read-through vs scroll-past in the two-tower model; small-account lift defaults (50K followers, 2 hours, 200 Home views, originals only, experiment-bucketed); Original Content Rewards rules; verified status found in reply *ordering*, not as a published For You reach boost.
- [@XCreators](https://x.com/XCreators/status/2123886385828684073) claimed posts with video get 5x the reach and engagement, and that 36% of impressions now go to video. Logged as X's claim. Open-source default video head weights at `ed78e06` are 0.0, so this is not copied out of the ranker defaults.

### 21 Nov 2026

- Payout walkthrough from [@vanshu](https://x.com/vanshu)'s own reported figures: engagement rate fell from 3.1% to 1.9% on a larger-reach post. Reading, tied to OCR rules: a viral spike can bring strangers who scroll past, and X only pays unique Premium Home-feed views with at least half the post on screen. Big reach pays only when people stop and read.
- Public seven-day comparison of @ritu_twts (2,960 followers; 55 posts, 84% of them replies; median 4,520 views and 20 replies; median length 102 characters; 87% text-only) against a 1,447-follower builder account (622 posts, 97% replies; median 142 views and 3 replies; median length 302 characters; 29% text-only). The smaller account out-replied her about 13 to 1 and still saw about 0.1 views per follower vs about 1.5 on her posts. Her breakouts were short, same-day, one-claim takes in a tight topical reply circle.
- **Inference, and a limit on that comparison:** thousands of other accounts post short text and go nowhere, so the format alone is not a recipe. Do not swap a proven reply habit for an unproven short-text habit. Take the transferable pieces (topic consistency, early replies in a relevant circle, posts people can finish and react to) and keep replies as the growth engine. Make original posts video-first and dwell-first.
- Decision logged: store algorithm learnings in this skill and commit updates to the public proof repo.

## Update procedure

New learnings get appended, they do not silently overwrite old ones.

1. Confirm the fact from a real source: a file and line at a named x-algorithm commit, an official X post, or a named reporting source. If it is an inference, label it **Inference**.
2. Add a dated Changelog entry (date in Europe/Berlin) with the source link or `path` + line + commit.
3. Patch the relevant section only where the new fact changes advice or a number. Leave superseded numbers visible in the Changelog.
4. If a code citation may have drifted, re-open the file at the latest commit and update the pin at the top of this skill.
5. Commit the change to this repository under `x-algorithm-learnings/` (this `SKILL.md` and, if sources changed, `README.md`). Use a message of the form `Update X algorithm learnings (Mon DD YYYY)`. Push to the default branch when possible; otherwise open a pull request.
6. Do not add private account credentials, employer names, or non-public personal data.
