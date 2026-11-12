---
name: verify-proof-carrying-replies
description: Check that the proof-carrying-replies publish pipeline still keeps its safety promises. Use when changing src/pipeline.ts, src/policy.ts, src/certificate.ts, the TLA+ model, or the replay cases, and before treating the proof as still valid.
---

# Verify proof-carrying replies

This skill checks that the publish pipeline in this repository still keeps its promises. The model in `formal/ProofCarryingReply.tla` matches `src/pipeline.ts`, `src/policy.ts`, and `src/certificate.ts`, action for action. Each TLA+ action has the same name as the TypeScript function it models.

## Promises

These are invariants. Do not weaken them.

1. **FreshWhenOffered.** A reply is only drafted, offered, or posted if the thread is at most 30 minutes old and has fewer than 30 replies.
2. **FactsWhenOffered.** A reply is only drafted, offered, or posted if every factual claim is sourced and verified. A reply with no factual claims is allowed.
3. **CertWhenOffered.** A valid certificate is present while the draft is awaiting confirm and after it is posted. The certificate is bound to this exact text.
4. **PostedRequiresConfirm.** Posting requires an explicit confirm of this exact text, and a still-valid certificate.
5. **AutonomyIsNotConfirm.** A standing "full autonomy" permission is never a substitute for that confirm.
6. **TypeOK** and **NoDeadlock** hold on the model.

A reply reaches `posted` only through:

`Scout → CheckFreshPass → CheckFactsPass → IssueDraft → OfferToHuman → HumanConfirms → Publish`

`GrantAutonomy` never enables `Publish`.

## How to check

1. Run the tests from the repository root:

   `node --test --experimental-strip-types test/pipeline.test.ts`

   Every test must pass. In particular:

   - `Publish` with autonomy and no confirm must throw.
   - An edit must burn the certificate and block `Publish`.
   - The 11–12 November 2026 replay must reject the four stale 11 November replies and the 40-minute 12 November offer, and must allow the two fresh 12 November replies only after confirm.

2. Work in a scratch folder outside this repository. Run `/statechart` on `formal/ProofCarryingReply.tla`, with `formal/ProofCarryingReply.cfg` and the view `formal/view.ts`. All six invariants and NoDeadlock must hold. The chart must not draw an arrow from "Waiting for your confirm (autonomy on)" to "Posted" except through "you confirm this exact text".

3. To see the invariants catch a break, run `/statechart` on the same spec with `formal/ProofCarryingReplyBroken.cfg`. **PostedRequiresConfirm** and **AutonomyIsNotConfirm** must fail. The shortest path has 7 steps and ends: "the bot posts on blanket autonomy." The other invariants must still hold. If this broken specification suddenly holds, the old-policy action was lost; restore it so the next agent can still see the counterexample.

## If a check fails

Do not weaken an invariant. Either the code or the model drifted from a real promise — find the drift and fix it. A unit-test failure names the gate (`explicit confirm`, `ageOk`, `factsOk`, `valid certificate`). A statechart failure names the invariant and a shortest path; "Posted" marked as a break, with a bug-path from Idle through "Waiting for your confirm (autonomy on)", is the expected visual on the broken configuration only.

When the properties or the model need lasting maintenance, follow `/maintain-formal-verification-skill`.
