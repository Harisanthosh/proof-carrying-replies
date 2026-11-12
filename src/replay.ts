/**
 * Replay real Hari Santhosh posts and drafts against the proof-carrying policy.
 * Numbers are from X at the time each reply was prepared or posted, 11–12 Nov 2026.
 */
import {
  CheckFactsFail,
  CheckFactsPass,
  CheckFreshFail,
  CheckFreshPass,
  HumanConfirms,
  IssueDraft,
  OfferToHuman,
  Publish,
  ScoutFindsFresh,
  ScoutFindsStale,
  initialState,
  type State,
} from "./pipeline.ts";
import { factsOk, isFresh, type Candidate } from "./policy.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export type Case = {
  id: string;
  label: string;
  when: string;
  candidate: Candidate;
  draftText: string;
  actuallyOfferedOrPosted: boolean;
  note: string;
};

export type Verdict = {
  id: string;
  label: string;
  when: string;
  actuallyOfferedOrPosted: boolean;
  fresh: boolean;
  facts: boolean;
  wouldReachDraft: boolean;
  rejectedBy: string | null;
  finalPhase: string;
  note: string;
};

function tryRun(c: Case): Verdict {
  let s: State = initialState();
  const fresh = isFresh(c.candidate);
  const facts = factsOk(c.candidate);
  try {
    s = fresh ? ScoutFindsFresh(s, c.candidate) : ScoutFindsStale(s, c.candidate);
    if (!fresh) {
      s = CheckFreshFail(s);
      return done(c, fresh, facts, s, "freshness");
    }
    s = CheckFreshPass(s);
    if (!facts) {
      s = CheckFactsFail(s);
      return done(c, fresh, facts, s, "unsourced claim");
    }
    s = CheckFactsPass(s);
    s = IssueDraft(s, c.draftText, "2026-11-12T00:00:00Z");
    s = OfferToHuman(s);
    s = HumanConfirms(s);
    s = Publish(s);
    return done(c, fresh, facts, s, null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return done(c, fresh, facts, s, msg);
  }
}

function done(
  c: Case,
  fresh: boolean,
  facts: boolean,
  s: State,
  rejectedBy: string | null,
): Verdict {
  return {
    id: c.id,
    label: c.label,
    when: c.when,
    actuallyOfferedOrPosted: c.actuallyOfferedOrPosted,
    fresh,
    facts,
    wouldReachDraft: s.phase === "posted" || s.phase === "awaiting" || s.phase === "drafted",
    rejectedBy,
    finalPhase: s.phase,
    note: c.note,
  };
}

export function loadCases(): Case[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, "..", "data", "cases.json"), "utf8");
  return JSON.parse(raw) as Case[];
}

export function replay(): Verdict[] {
  return loadCases().map(tryRun);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function main(): void {
  const rows = replay();
  const oldWould = rows.filter((r) => r.actuallyOfferedOrPosted);
  const newRejects = oldWould.filter((r) => r.rejectedBy);
  const newAllows = rows.filter((r) => !r.rejectedBy);

  console.log("Proof-carrying replies — replay of real posts");
  console.log("Policy: age ≤ 30 min, replies < 30, every claim sourced, explicit confirm of this text.");
  console.log("");
  console.log(
    pad("case", 28) +
      pad("then", 12) +
      pad("fresh", 8) +
      pad("facts", 8) +
      pad("now", 22) +
      "note",
  );
  console.log("-".repeat(110));
  for (const r of rows) {
    const then = r.actuallyOfferedOrPosted ? "offered" : "held";
    const now = r.rejectedBy ? `REJECT ${r.rejectedBy}` : "WOULD POST";
    console.log(
      pad(r.label, 28) +
        pad(then, 12) +
        pad(r.fresh ? "yes" : "no", 8) +
        pad(r.facts ? "yes" : "no", 8) +
        pad(now, 22) +
        r.note,
    );
  }
  console.log("");
  console.log(
    `${newRejects.length} of ${oldWould.length} replies we actually offered would be rejected by the proved policy.`,
  );
  console.log(`${newAllows.length} case(s) would still reach a confirmed post.`);
  if (newRejects.length > 0) process.exitCode = 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
