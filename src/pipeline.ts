/**
 * The publish pipeline. Each exported action is one TLA+ action of
 * the same name in formal/ProofCarryingReply.tla.
 *
 * A reply reaches "posted" only through:
 *   Scout → CheckFreshPass → CheckFactsPass → IssueDraft → OfferToHuman
 *         → HumanConfirms → Publish
 *
 * GrantAutonomy never enables Publish. That is the point.
 */
import {
  factsOk as factsHold,
  isFresh,
  type Candidate,
} from "./policy.ts";
import {
  certificateValid,
  hashText,
  issueCertificate,
  type Certificate,
} from "./certificate.ts";

export type Phase =
  | "idle"
  | "found"
  | "fresh_ok"
  | "fresh_fail"
  | "facts_ok"
  | "facts_fail"
  | "drafted"
  | "awaiting"
  | "posted"
  | "dropped";

export type State = {
  phase: Phase;
  candidate: Candidate | null;
  draftText: string;
  cert: Certificate | null;
  /** SHA-256 of the text the human confirmed, or null. */
  confirmHash: string | null;
  autonomy: boolean;
};

export function initialState(): State {
  return {
    phase: "idle",
    candidate: null,
    draftText: "",
    cert: null,
    confirmHash: null,
    autonomy: false,
  };
}

function requirePhase(s: State, ...allowed: Phase[]): void {
  if (!allowed.includes(s.phase)) {
    throw new Error(`action not enabled in phase ${s.phase}`);
  }
}

/** ScoutFindsFresh: a thread that is still young and not buried. */
export function ScoutFindsFresh(s: State, c: Candidate): State {
  requirePhase(s, "idle");
  if (!isFresh(c)) {
    throw new Error("ScoutFindsFresh requires a fresh, unburied thread");
  }
  return { ...s, phase: "found", candidate: c };
}

/** ScoutFindsStale: a thread that is too old or already buried. */
export function ScoutFindsStale(s: State, c: Candidate): State {
  requirePhase(s, "idle");
  if (isFresh(c)) {
    throw new Error("ScoutFindsStale requires a stale or buried thread");
  }
  return { ...s, phase: "found", candidate: c };
}

/** CheckFreshPass: only when age and reply-count gates both hold. */
export function CheckFreshPass(s: State): State {
  requirePhase(s, "found");
  if (!s.candidate || !isFresh(s.candidate)) {
    throw new Error("CheckFreshPass requires ageOk and repliesOk");
  }
  return { ...s, phase: "fresh_ok" };
}

/** CheckFreshFail: stale or buried threads are rejected here, not later. */
export function CheckFreshFail(s: State): State {
  requirePhase(s, "found");
  if (!s.candidate || isFresh(s.candidate)) {
    throw new Error("CheckFreshFail requires a stale or buried thread");
  }
  return { ...s, phase: "fresh_fail" };
}

/** CheckFactsPass: only when every claim is sourced and verified. */
export function CheckFactsPass(s: State): State {
  requirePhase(s, "fresh_ok");
  if (!s.candidate || !factsHold(s.candidate)) {
    throw new Error("CheckFactsPass requires factsOk");
  }
  return { ...s, phase: "facts_ok" };
}

/** CheckFactsFail: a reply with an unsourced claim is never drafted. */
export function CheckFactsFail(s: State): State {
  requirePhase(s, "fresh_ok");
  if (!s.candidate || factsHold(s.candidate)) {
    throw new Error("CheckFactsFail requires a claim that is not sourced");
  }
  return { ...s, phase: "facts_fail" };
}

/** IssueDraft: mint a certificate bound to this exact text. */
export function IssueDraft(s: State, text: string, issuedAt: string): State {
  requirePhase(s, "facts_ok");
  if (!s.candidate || !isFresh(s.candidate) || !factsHold(s.candidate)) {
    throw new Error("IssueDraft requires freshness and sourced facts");
  }
  const cert = issueCertificate(s.candidate, text, issuedAt);
  return {
    ...s,
    phase: "drafted",
    draftText: text,
    cert,
    confirmHash: null,
  };
}

/** OfferToHuman: the draft is shown, not posted. */
export function OfferToHuman(s: State): State {
  requirePhase(s, "drafted");
  if (!s.cert || !s.candidate || !certificateValid(s.cert, s.draftText, s.candidate)) {
    throw new Error("OfferToHuman requires a valid certificate");
  }
  return { ...s, phase: "awaiting" };
}

/** HumanConfirms: binds confirmHash to the current text hash. */
export function HumanConfirms(s: State): State {
  requirePhase(s, "awaiting");
  if (!s.cert || !s.candidate || !certificateValid(s.cert, s.draftText, s.candidate)) {
    throw new Error("HumanConfirms requires a valid certificate for this text");
  }
  return { ...s, confirmHash: hashText(s.draftText) };
}

/**
 * HumanEdits: changing the text burns the certificate and the confirm.
 * The next agent must re-issue a draft; there is no path from here to posted.
 */
export function HumanEdits(s: State, newText: string): State {
  requirePhase(s, "awaiting");
  return {
    ...s,
    draftText: newText,
    cert: null,
    confirmHash: null,
    phase: "dropped",
  };
}

/** HumanDeclines: the human says no. */
export function HumanDeclines(s: State): State {
  requirePhase(s, "awaiting");
  return { ...s, phase: "dropped", cert: null, confirmHash: null, draftText: "" };
}

/**
 * Publish: only this exact text, with a live certificate and a matching confirm.
 * autonomy is deliberately unused. GrantAutonomy does not enable this action.
 */
export function Publish(s: State): State {
  requirePhase(s, "awaiting");
  if (!s.cert || !s.candidate || !certificateValid(s.cert, s.draftText, s.candidate)) {
    throw new Error("Publish requires a valid certificate");
  }
  if (!s.confirmHash || s.confirmHash !== hashText(s.draftText)) {
    throw new Error("Publish requires an explicit confirm of this exact text");
  }
  return { ...s, phase: "posted" };
}

/** GrantAutonomy: a standing "just post it" permission. Never enables Publish. */
export function GrantAutonomy(s: State): State {
  return { ...s, autonomy: true };
}

/** Terminal stutter, for the model and for callers that poll a finished run. */
export function Done(s: State): State {
  if (!["posted", "dropped", "fresh_fail", "facts_fail"].includes(s.phase)) {
    throw new Error("Done is only enabled in a terminal phase");
  }
  return s;
}
