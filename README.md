# Proof-carrying replies

A Grok Bot publish pipeline that cannot offer a privileged message — a public reply, or a post in a team channel — without a machine-checked certificate.

The certificate is bound to exact text. A standing "full autonomy" permission cannot satisfy the confirm. When the gates fail, the bot stays silent: that is how it flags that it is blocked. Those facts are invariants, not guidelines. They are checked with TLA+ and TLC, and drawn as a statechart.

This is a recipe for **legitimate, slow, high-integrity speech** by an agent that acts on someone's behalf. It is not a guide to engagement farming, and it is not a way to game a social network's ranking. Growth, if it comes, comes because each public act was curated, sourced, and explicitly consented to.

## Two-minute demo

1. The [proved pipeline](demo/01-proved-pipeline.png): a message reaches `posted` only through a certificate and a confirm. `GrantAutonomy` never enables `Publish`.
2. The [old policy, caught](demo/02-old-policy-caught.png): a one-line variant that posts on blanket autonomy breaks in seven steps. The last step is: the bot posts on blanket autonomy.
3. A [self-audit of real public replies](demo/03-replay.png): 5 of 7 actually offered replies would be rejected.
4. The [same gate, on a Teams channel](demo/04-teams.png): the identical invariants decide a team-channel message — certified and posted, refused on autonomy, or silent when a claim is unsourced.

```bash
npm test          # 14 tests, including the three Teams beats
npm run replay    # the self-audit
npm run teams-demo
```

A teammate you cannot inspect is a teammate you cannot trust. The certificate is the opposite of a black box. Silence is how the bot flags that it is blocked.

## The use case

A Grok Bot can draft, and eventually send, messages that go out under someone's name: a public reply, or a post in a Slack or Teams channel. That is a privileged action, closer to a deploy than to a chat completion. The person who will be named on the message needs to know that:

- the thread is still fresh enough to join without shouting over a conversation that has moved on
- every factual claim is sourced and verified, or the reply is clearly opinion
- the exact words about to go out are the words they confirmed, not a later edit and not a blanket "just post it"
- the bot is allowed to stay silent when nothing qualifies

Those are high-fidelity signals: measurable freshness, sourced evidence, and real human intent. Automations enforce the gates. They are not allowed to bypass them in the name of volume, timing, or "the algorithm."

A longer methodology, including what this deliberately leaves out, is in [docs/GROK-BOT-RECIPE.md](docs/GROK-BOT-RECIPE.md).

## What the proof says

| Invariant | Promise |
| --- | --- |
| `FreshWhenOffered` | A reply is only drafted, offered, or posted if the thread is ≤ 30 minutes old and has fewer than 30 replies. |
| `FactsWhenOffered` | Every factual claim is sourced and verified. Pure opinion is allowed. |
| `CertWhenOffered` | A valid certificate, bound to this exact text, is present while awaiting confirm and after posting. |
| `PostedRequiresConfirm` | Posting requires an explicit confirm of this exact text. |
| `AutonomyIsNotConfirm` | Blanket autonomy is not a confirm. |

The real pipeline holds all of them, plus `TypeOK` and `NoDeadlock`. TLC reached 48 states and 94 steps. The formal model was not changed for the Teams walkthrough: a team-channel message is just another candidate, and it is accepted or refused by the same actions.

A one-line old-policy variant — `PublishIfAutonomous`, which posts when autonomy is granted even if this text was never confirmed — breaks `PostedRequiresConfirm` and `AutonomyIsNotConfirm` in seven steps. The shortest path ends: **the bot posts on blanket autonomy.**

![The proved pipeline](formal/charts/safe/chart.svg)

![The old policy, caught](formal/charts/broken/chart.svg)

## A self-audit of real public replies

These are actual replies offered or posted from one account on 11–12 November 2026, replayed against the proved policy. The audit is the point: a pipeline you will not run on yourself is not a pipeline.

```
case                        then        now
@AravSrinivas 11 Nov        offered     REJECT freshness   (97 min, 121 replies)
@DrJimFan 11 Nov            offered     REJECT freshness   (~26 hours)
@robbyant_brain 11 Nov      offered     REJECT freshness   (~47 hours)
@normandipalo 11 Nov        offered     REJECT freshness   (~27 hours, 40 replies)
@TheAhmadOsman 12 Nov       offered     REJECT freshness   (40 min — 10 past the proved gate)
@aakashgupta 12 Nov         offered     WOULD POST         (10 min, 1 reply, claim sourced)
@theo 12 Nov                offered     WOULD POST         (30 min, 21 replies, opinion only)
```

5 of 7 replies actually offered would be rejected. The two that pass still require a confirm of this exact text before they can reach `posted`. The 40-minute offer is itself a counterexample: the informal judgment was looser than the proved gate.

## Demo images

A four-panel walkthrough:

- [The proved pipeline](demo/01-proved-pipeline.png)
- [The old policy, caught](demo/02-old-policy-caught.png)
- [A self-audit of real public replies](demo/03-replay.png)
- [The same gate, on a Teams channel](demo/04-teams.png)

## Run it

```bash
node --test --experimental-strip-types test/pipeline.test.ts
node --experimental-strip-types src/replay.ts
node --experimental-strip-types src/teams-demo.ts
```

To re-check the formal model, follow [`skills/verify-proof-carrying-replies/SKILL.md`](skills/verify-proof-carrying-replies/SKILL.md): work in a scratch folder outside this repository and run `/statechart` on `formal/ProofCarryingReply.tla`. Use `formal/ProofCarryingReplyBroken.cfg` to see the counterexample.

The publishing skill a Grok Bot should load before offering a privileged message is [`skills/proof-carrying-replies/SKILL.md`](skills/proof-carrying-replies/SKILL.md).
