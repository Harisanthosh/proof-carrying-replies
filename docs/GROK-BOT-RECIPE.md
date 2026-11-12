# A Grok Bot recipe for proof-carrying public speech

This is a methodology for a Grok Bot that may speak on someone's behalf — in public, or in a team channel. It is written so the next agent, and the person it represents, can follow it. It is not a growth-hacking playbook.

## The premise

If a teammate can post under your name, every privileged act should be closer to a deploy than to a suggestion. Volume is not a virtue. Silence is a valid result. The bot earns the right to offer a draft only when the signals are high-fidelity: the conversation is still live, the facts are sourced, and the human has confirmed these exact words.

Automations belong here. They should enforce the gates, keep watch, and stay quiet when nothing qualifies. They should never invent urgency, spray replies, or optimize for a ranking function.

## The recipe

### 1. Treat public speech — and team-channel speech — as a privileged action

Separate "thinking" from "offering to publish." A scout may read widely. A draft is a different state, and it requires a certificate. Posted is a third state, and it requires a confirm of this exact text. Standing permission to work is not permission to speak. A message in Slack or Teams that goes out under someone's name is the same kind of act as a public reply: the channel changes, the invariants do not.

In this repository that separation is executable: see `src/pipeline.ts`. A reply reaches `posted` only through

`Scout → CheckFreshPass → CheckFactsPass → IssueDraft → OfferToHuman → HumanConfirms → Publish`

`GrantAutonomy` never enables `Publish`.

The same path is exercised on a Teams-shaped candidate by `npm run teams-demo`: a sourced standup posts after confirm, blanket autonomy is refused, and an unsourced claim ends in silence. The formal model is unchanged; a team-channel message is just another candidate.

### 2. Bind the draft to a proof certificate

The certificate records the policy version, the thread, the measured freshness, every sourced claim, and a hash of the exact text. Editing the text burns the certificate and the confirm. There is no path from an edited draft to `posted` without issuing a new certificate.

This is the "proof-carrying" part: the bot cannot honestly say a draft is ready if the certificate is missing or stale. Implementation: `src/certificate.ts`.

### 3. Formalize the policy, and prove a broken variant fails

Write the promises as invariants, in a model that is true to the code, action for action. Do not weaken an invariant to make a check pass. Show each property failing on a broken variant of the code it guards.

Here, TLA+ in `formal/ProofCarryingReply.tla` is checked with TLC and drawn with `/statechart`. The real pipeline holds six invariants across 48 states. A one-line old-policy variant, `PublishIfAutonomous`, breaks two of them in seven steps. The last step is: the bot posts on blanket autonomy.

The project-local check a later agent should follow is `skills/verify-proof-carrying-replies/SKILL.md`. When the model or the promises need lasting maintenance, follow `/maintain-formal-verification-skill`. The model was produced with `/create-formal-verification-skill` and `/statechart`.

### 4. Audit yourself with real cases

A policy you will not run on your own past posts is theater. This repo replays seven actual offered or posted replies from 11–12 November 2026. Five would be rejected for freshness, including a 40-minute offer that missed the proved 30-minute gate by ten minutes. Two would still be allowed, and only after a confirm.

The numbers in `data/cases.json` are the observations at the time, not a scoreboard. They exist to show the old informal judgment admitting work the proved policy refuses.

### 5. Let automation be slow, curated, and allowed to be silent

Routines and watches are useful: they can notice a fresh thread, assemble evidence, and prepare a certificate. The recipe for those automations is:

- Curate. Prefer fewer, better-supported drafts over a full queue.
- Require real interest from the person named on the post — a confirm of this text, not a standing "keep going."
- Stay silent when the gates fail. A quiet run is a success, not a miss.
- Never use a ranking function, a like-count target, or a "reply to large accounts" rule as a reason to skip a gate.

High-fidelity signals are things you can point to: age in minutes, reply count, a source URL, a hash, a confirm. Low-fidelity signals are vibes, predicted reach, and "this will do well."

### 6. Grow, if at all, from legitimacy

A public presence can grow slowly when people trust that what appears under a name was meant, checked, and timely. That is the only growth this recipe is willing to aim at. It will lose to a spray-and-hope strategy on raw volume, and that is acceptable.

## What this deliberately leaves out

- Advice on how a social network ranks posts, and any tactic whose purpose is to exploit that ranking.
- Engagement farming: reply spray, bait questions, volume quotas, or "be early on famous accounts" as a goal.
- A path from blanket autonomy to a public post.
- Weakening an invariant to admit a draft you already wanted to send.

## For a Grok Bot that adopts this

1. Load `skills/proof-carrying-replies/SKILL.md` before offering a public reply or a team-channel message.
2. Load `skills/verify-proof-carrying-replies/SKILL.md` before treating the proof as still valid, and after any change to the pipeline, the model, or the cases.
3. Keep the human confirm in the loop, even when they have said "just handle it." If they want a different policy, change the model, the code, and the proof together — and show the new broken variant.
