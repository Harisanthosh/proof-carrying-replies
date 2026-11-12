/**
 * The same proved publish pipeline, applied to a Teams channel message.
 *
 * Privileged speech is not only a public post. A message that goes out
 * under someone's name in a team channel is a deploy, too. The
 * invariants do not change: a certificate bound to exact text, an
 * explicit confirm of that text, and silence when the gates fail.
 * GrantAutonomy never enables Publish.
 *
 * Three beats:
 *   1. Certificate + confirm → posted
 *   2. Blanket autonomy, no confirm → Publish refused
 *   3. An unsourced claim → silence (facts_fail)
 *
 * Run: npm run teams-demo
 */
import {
  CheckFactsFail,
  CheckFactsPass,
  CheckFreshPass,
  GrantAutonomy,
  HumanConfirms,
  IssueDraft,
  OfferToHuman,
  Publish,
  ScoutFindsFresh,
  initialState,
  type State,
} from "./pipeline.ts";
import { type Candidate } from "./policy.ts";

export const STANDUP_TEXT =
  "Standup: TLC reached 48 states on the real pipeline; all six invariants hold.";

export const STANDUP_SOURCE = "formal/charts/safe/report.md";

/** A live Teams thread: eight minutes old, three replies, sourced claim. */
export const teamsLive: Candidate = {
  postId: "teams:general:standup-2026-11-12",
  author: "teammate",
  ageMinutes: 8,
  replyCount: 3,
  claims: [
    {
      text: "TLC reached 48 states on the real pipeline; all six invariants hold.",
      source: STANDUP_SOURCE,
      verified: true,
    },
  ],
};

/** Same thread, but the draft asserts an unsourced fact. */
export const teamsUnsourced: Candidate = {
  ...teamsLive,
  postId: "teams:general:unsourced-2026-11-12",
  claims: [
    {
      text: "The model is already used in production by a dozen teams.",
      source: null,
      verified: false,
    },
  ],
};

export const UNSOURCED_TEXT =
  "The model is already used in production by a dozen teams.";

export type BeatResult = {
  name: string;
  phase: State["phase"];
  textHash: string | null;
  autonomy: boolean;
  refused: boolean;
  refuseReason: string | null;
};

function certifiedPublish(): BeatResult {
  let s = initialState();
  s = ScoutFindsFresh(s, teamsLive);
  s = CheckFreshPass(s);
  s = CheckFactsPass(s);
  s = IssueDraft(s, STANDUP_TEXT, "2026-11-12T11:00:00Z");
  s = OfferToHuman(s);
  s = HumanConfirms(s);
  s = Publish(s);
  return {
    name: "certified",
    phase: s.phase,
    textHash: s.cert?.textHash ?? null,
    autonomy: s.autonomy,
    refused: false,
    refuseReason: null,
  };
}

function autonomyRefused(): BeatResult {
  let s = initialState();
  s = ScoutFindsFresh(s, teamsLive);
  s = CheckFreshPass(s);
  s = CheckFactsPass(s);
  s = IssueDraft(s, STANDUP_TEXT, "2026-11-12T11:00:00Z");
  s = OfferToHuman(s);
  s = GrantAutonomy(s);
  let refused = false;
  let refuseReason: string | null = null;
  try {
    Publish(s);
  } catch (err) {
    refused = true;
    refuseReason = err instanceof Error ? err.message : String(err);
  }
  return {
    name: "autonomy",
    phase: s.phase,
    textHash: s.cert?.textHash ?? null,
    autonomy: s.autonomy,
    refused,
    refuseReason,
  };
}

function unsourcedSilence(): BeatResult {
  let s = initialState();
  s = ScoutFindsFresh(s, teamsUnsourced);
  s = CheckFreshPass(s);
  s = CheckFactsFail(s);
  return {
    name: "silence",
    phase: s.phase,
    textHash: null,
    autonomy: false,
    refused: false,
    refuseReason: null,
  };
}

export function runTeamsDemo(): {
  certified: BeatResult;
  autonomy: BeatResult;
  silence: BeatResult;
} {
  return {
    certified: certifiedPublish(),
    autonomy: autonomyRefused(),
    silence: unsourcedSilence(),
  };
}

function shortHash(hash: string | null): string {
  return hash ? `${hash.slice(0, 12)}…` : "—";
}

function printDemo(r: ReturnType<typeof runTeamsDemo>): void {
  const lines = [
    "Proof-carrying Teams speech",
    "The same proved pipeline. A team-channel message is a privileged act.",
    "",
    "1. CERTIFIED",
    `   Thread: 8 min, 3 replies. Draft: “${STANDUP_TEXT}”`,
    `   Source: ${STANDUP_SOURCE}`,
    `   Certificate: pcr-v1, text hash ${shortHash(r.certified.textHash)}, bound.`,
    "   Confirm of this exact text: yes.",
    `   Result: ${r.certified.phase === "posted" ? "POSTED" : r.certified.phase}`,
    "",
    "2. AUTONOMY REFUSED",
    "   Same draft, GrantAutonomy, no confirm of this text.",
    `   Publish threw: ${r.autonomy.refuseReason}`,
    `   Phase stayed ${r.autonomy.phase}. autonomy=${r.autonomy.autonomy}.`,
    "   The broken one-line variant, PublishIfAutonomous, posts in seven steps.",
    `   Result: ${r.autonomy.refused ? "REFUSED" : "UNEXPECTED PASS"}`,
    "",
    "3. SILENCE",
    `   Draft: “${UNSOURCED_TEXT}”`,
    "   The facts gate fails. No certificate is issued. The bot stays silent.",
    `   Result: ${r.silence.phase === "facts_fail" ? "SILENCE (facts_fail)" : r.silence.phase}`,
    "",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

export function assertTeamsDemoHolds(r: ReturnType<typeof runTeamsDemo>): void {
  if (r.certified.phase !== "posted" || !r.certified.textHash) {
    throw new Error("certified path must post with a certificate");
  }
  if (!r.autonomy.refused || r.autonomy.phase !== "awaiting" || !r.autonomy.autonomy) {
    throw new Error("autonomy path must refuse Publish and stay awaiting");
  }
  if (r.autonomy.refuseReason !== "Publish requires an explicit confirm of this exact text") {
    throw new Error(`unexpected refuse reason: ${r.autonomy.refuseReason}`);
  }
  if (r.silence.phase !== "facts_fail") {
    throw new Error("unsourced path must end in facts_fail (silence)");
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const result = runTeamsDemo();
  assertTeamsDemoHolds(result);
  printDemo(result);
}
