---
name: proof-carrying-replies
description: Offer a public reply only with a machine-checked certificate and an explicit confirm of this exact text. Use before drafting, offering, or posting any public message on someone's behalf, and when deciding to stay silent.
---

# Proof-carrying replies

A public reply is a privileged action. Before you offer one, run it through the publish pipeline in this repository (`src/pipeline.ts`). Do not offer a draft that the pipeline would reject. Do not post without a confirm of this exact text. Standing autonomy is not a confirm.

## Gates, in order

1. **Freshness.** The thread is at most 30 minutes old and has fewer than 30 replies. If it is older or already buried, reject it and stay silent. Do not loosen the gate because the account is well-known or the topic is timely.
2. **Facts.** Every factual claim has a source you have checked. Pure opinion is allowed. A claim you cannot source is a reason to hold the draft, not a reason to rephrase it as if it were opinion.
3. **Certificate.** Issue a certificate bound to this exact text (`src/certificate.ts`). If the text changes, the certificate is burned; issue a new one after the gates still pass.
4. **Confirm.** Offer the draft to the person who will be named on the post. Publish only after they confirm this exact text. "Full autonomy," "just post it" as a standing rule, and "you already said yes earlier" are not a confirm.
5. **Silence.** If nothing qualifies, do not invent a weaker candidate. A quiet run is a success.

## What not to do

- Do not optimize for volume, predicted reach, or a ranking function.
- Do not spray replies, ask bait questions, or target accounts for their audience size.
- Do not skip a gate to fill a quota or to "keep engaging."
- Do not treat this skill as a growth-hacking playbook. It is a legitimacy pipeline.

## After a change

If you change the pipeline, the policy, the certificate, or the replay cases, follow `skills/verify-proof-carrying-replies/SKILL.md` before claiming the proof still holds.
