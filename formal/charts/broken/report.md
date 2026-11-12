# ProofCarryingReply

TLC reached 49 states and 96 steps. The chart draws 13 states and 18 arrows.
The chart does not draw 22 steps that stay in one chart state.
The view hides 19 steps, so the chart does not draw them.

## PostedRequiresConfirm breaks
The shortest path has 7 steps:
0. Idle
1. you grant blanket autonomy: Idle
2. a fresh thread appears: Fresh thread found
3. freshness passes: Still fresh
4. every claim is sourced: Claims sourced
5. issue a certificate for this text: Certificate issued
6. offer the draft, do not post: Waiting for your confirm (autonomy on)
7. the bot posts on blanket autonomy: Posted

## AutonomyIsNotConfirm breaks
The shortest path has 7 steps:
0. Idle
1. you grant blanket autonomy: Idle
2. a fresh thread appears: Fresh thread found
3. freshness passes: Still fresh
4. every claim is sourced: Claims sourced
5. issue a certificate for this text: Certificate issued
6. offer the draft, do not post: Waiting for your confirm (autonomy on)
7. the bot posts on blanket autonomy: Posted

## Rules that hold
TypeOK, FreshWhenOffered, FactsWhenOffered, CertWhenOffered, NoDeadlock
