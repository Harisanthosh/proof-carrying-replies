---- MODULE ProofCarryingReply ----
\* A formal model of src/pipeline.ts, src/policy.ts, and src/certificate.ts.
\* Each action has the same name as the TypeScript function it models.
\* A reply reaches "posted" only through:
\*   Scout → CheckFreshPass → CheckFactsPass → IssueDraft → OfferToHuman
\*         → HumanConfirms → Publish
\* GrantAutonomy never enables Publish.

EXTENDS Naturals

VARIABLES
  phase,        \* Phase in src/pipeline.ts
  ageOk,        \* policy.ts ageOk
  repliesOk,    \* policy.ts repliesOk
  factsOk,      \* policy.ts factsOk
  certValid,    \* certificate.ts certificateValid
  textHash,     \* 0 = none, 1 = the issued draft
  confirmHash,  \* 0 = none, 1 = human confirmed this draft
  autonomy      \* standing "just post it" permission; never a substitute for confirm

vars == <<phase, ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

Phases == {
  "idle", "found", "fresh_ok", "fresh_fail",
  "facts_ok", "facts_fail", "drafted", "awaiting",
  "posted", "dropped"
}

TypeOK ==
  /\ phase \in Phases
  /\ ageOk \in BOOLEAN
  /\ repliesOk \in BOOLEAN
  /\ factsOk \in BOOLEAN
  /\ certValid \in BOOLEAN
  /\ textHash \in {0, 1}
  /\ confirmHash \in {0, 1}
  /\ autonomy \in BOOLEAN

Offered == phase \in {"drafted", "awaiting", "posted"}

\* A reply is only drafted, offered, or posted if the thread is still fresh and not buried.
FreshWhenOffered == Offered => (ageOk /\ repliesOk)

\* A reply is only drafted, offered, or posted if every factual claim is sourced.
FactsWhenOffered == Offered => factsOk

\* A certificate must be valid while we wait for confirm and after we post.
CertWhenOffered == phase \in {"awaiting", "posted"} => certValid

\* Posting requires an explicit confirm of this exact text, never autonomy alone.
PostedRequiresConfirm ==
  phase = "posted" => (confirmHash # 0 /\ confirmHash = textHash /\ certValid)

\* Blanket autonomy is not a confirm.
AutonomyIsNotConfirm ==
  (autonomy /\ confirmHash = 0) => phase # "posted"

Init ==
  /\ phase = "idle"
  /\ ageOk = FALSE
  /\ repliesOk = FALSE
  /\ factsOk = FALSE
  /\ certValid = FALSE
  /\ textHash = 0
  /\ confirmHash = 0
  /\ autonomy = FALSE

ScoutFindsFresh ==
  /\ phase = "idle"
  /\ phase' = "found"
  /\ ageOk' = TRUE
  /\ repliesOk' = TRUE
  /\ factsOk' \in BOOLEAN
  /\ certValid' = FALSE
  /\ textHash' = 0
  /\ confirmHash' = 0
  /\ UNCHANGED autonomy

ScoutFindsStale ==
  /\ phase = "idle"
  /\ phase' = "found"
  /\ ageOk' \in BOOLEAN
  /\ repliesOk' \in BOOLEAN
  /\ factsOk' \in BOOLEAN
  /\ (~ageOk' \/ ~repliesOk')
  /\ certValid' = FALSE
  /\ textHash' = 0
  /\ confirmHash' = 0
  /\ UNCHANGED autonomy

CheckFreshPass ==
  /\ phase = "found"
  /\ ageOk
  /\ repliesOk
  /\ phase' = "fresh_ok"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

CheckFreshFail ==
  /\ phase = "found"
  /\ (~ageOk \/ ~repliesOk)
  /\ phase' = "fresh_fail"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

CheckFactsPass ==
  /\ phase = "fresh_ok"
  /\ factsOk
  /\ phase' = "facts_ok"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

CheckFactsFail ==
  /\ phase = "fresh_ok"
  /\ ~factsOk
  /\ phase' = "facts_fail"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

IssueDraft ==
  /\ phase = "facts_ok"
  /\ factsOk
  /\ ageOk
  /\ repliesOk
  /\ phase' = "drafted"
  /\ certValid' = TRUE
  /\ textHash' = 1
  /\ confirmHash' = 0
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, autonomy>>

OfferToHuman ==
  /\ phase = "drafted"
  /\ certValid
  /\ phase' = "awaiting"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

HumanConfirms ==
  /\ phase = "awaiting"
  /\ certValid
  /\ textHash # 0
  /\ confirmHash = 0
  /\ confirmHash' = textHash
  /\ UNCHANGED <<phase, ageOk, repliesOk, factsOk, certValid, textHash, autonomy>>

HumanEdits ==
  /\ phase = "awaiting"
  /\ phase' = "dropped"
  /\ certValid' = FALSE
  /\ textHash' = 0
  /\ confirmHash' = 0
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, autonomy>>

HumanDeclines ==
  /\ phase = "awaiting"
  /\ phase' = "dropped"
  /\ certValid' = FALSE
  /\ textHash' = 0
  /\ confirmHash' = 0
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, autonomy>>

Publish ==
  /\ phase = "awaiting"
  /\ certValid
  /\ confirmHash # 0
  /\ confirmHash = textHash
  /\ phase' = "posted"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

\* Standing permission. Deliberately does not appear in Publish's guard.
GrantAutonomy ==
  /\ autonomy = FALSE
  /\ autonomy' = TRUE
  /\ UNCHANGED <<phase, ageOk, repliesOk, factsOk, certValid, textHash, confirmHash>>

Done ==
  /\ phase \in {"posted", "dropped", "fresh_fail", "facts_fail"}
  /\ UNCHANGED vars

Next ==
  \/ ScoutFindsFresh
  \/ ScoutFindsStale
  \/ CheckFreshPass
  \/ CheckFreshFail
  \/ CheckFactsPass
  \/ CheckFactsFail
  \/ IssueDraft
  \/ OfferToHuman
  \/ HumanConfirms
  \/ HumanEdits
  \/ HumanDeclines
  \/ Publish
  \/ GrantAutonomy
  \/ Done

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
\* The old policy, used only to show the invariants catch it.
\* "Full autonomy" lets the bot post without a confirm of this exact text.

PublishIfAutonomous ==
  /\ phase = "awaiting"
  /\ autonomy
  /\ certValid
  /\ confirmHash = 0
  /\ phase' = "posted"
  /\ UNCHANGED <<ageOk, repliesOk, factsOk, certValid, textHash, confirmHash, autonomy>>

NextBroken == Next \/ PublishIfAutonomous

SpecBroken == Init /\ [][NextBroken]_vars
====
