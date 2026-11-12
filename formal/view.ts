/** Reader-facing labels for the proof-carrying-reply statechart. */

export const title = "Proof-carrying reply";

type Vars = {
  phase: string;
  ageOk: boolean;
  repliesOk: boolean;
  confirmHash: number;
  autonomy: boolean;
};

export function state(v: Vars): string {
  if (v.phase === "found") {
    return v.ageOk && v.repliesOk ? "Fresh thread found" : "Stale or buried thread found";
  }
  if (v.phase === "awaiting" && v.confirmHash !== 0) {
    return "Confirmed, ready to post";
  }
  if (v.phase === "awaiting") {
    return v.autonomy ? "Waiting for your confirm (autonomy on)" : "Waiting for your confirm";
  }
  const phases: Record<string, string> = {
    idle: "Idle",
    fresh_fail: "Rejected: too old or buried",
    fresh_ok: "Still fresh",
    facts_fail: "Rejected: unsourced claim",
    facts_ok: "Claims sourced",
    drafted: "Certificate issued",
    posted: "Posted",
    dropped: "Dropped",
  };
  return phases[v.phase] ?? v.phase;
}

export function step(action: string): string | null {
  const labels: Record<string, string | null> = {
    ScoutFindsFresh: "a fresh thread appears",
    ScoutFindsStale: "a stale or buried thread appears",
    CheckFreshPass: "freshness passes",
    CheckFreshFail: "freshness fails",
    CheckFactsPass: "every claim is sourced",
    CheckFactsFail: "a claim has no source",
    IssueDraft: "issue a certificate for this text",
    OfferToHuman: "offer the draft, do not post",
    HumanConfirms: "you confirm this exact text",
    HumanEdits: "you edit the text, certificate burns",
    HumanDeclines: "you decline",
    Publish: "post the confirmed text",
    PublishIfAutonomous: "the bot posts on blanket autonomy",
    GrantAutonomy: "you grant blanket autonomy",
    Done: null,
  };
  return labels[action] === undefined ? action : labels[action];
}

export function group(v: Vars): string {
  if (v.phase === "idle" || v.phase === "found") return "hunting";
  if (v.phase === "fresh_fail" || v.phase === "facts_fail" || v.phase === "dropped") {
    return "rejected";
  }
  if (v.phase === "fresh_ok" || v.phase === "facts_ok") return "checking";
  if (v.phase === "drafted" || v.phase === "awaiting") return "offering";
  if (v.phase === "posted") return "done";
  return "other";
}

export const colors = {
  hunting: "blue",
  checking: "teal",
  offering: "purple",
  rejected: "orange",
  done: "yellow",
};
