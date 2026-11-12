import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CheckFactsFail,
  CheckFactsPass,
  CheckFreshFail,
  CheckFreshPass,
  Done,
  GrantAutonomy,
  HumanConfirms,
  HumanDeclines,
  HumanEdits,
  IssueDraft,
  OfferToHuman,
  Publish,
  ScoutFindsFresh,
  ScoutFindsStale,
  initialState,
} from "../src/pipeline.ts";
import { factsOk, isFresh, type Candidate } from "../src/policy.ts";
import { replay } from "../src/replay.ts";
import { assertTeamsDemoHolds, runTeamsDemo } from "../src/teams-demo.ts";

const freshSourced: Candidate = {
  postId: "1",
  author: "alice",
  ageMinutes: 10,
  replyCount: 4,
  claims: [{ text: "X happened", source: "https://example.com/x", verified: true }],
};

const stale: Candidate = {
  ...freshSourced,
  postId: "2",
  ageMinutes: 97,
  replyCount: 121,
};

const freshUnsourced: Candidate = {
  ...freshSourced,
  postId: "3",
  claims: [{ text: "X happened", source: null, verified: false }],
};

function happyPath() {
  let s = initialState();
  s = ScoutFindsFresh(s, freshSourced);
  s = CheckFreshPass(s);
  s = CheckFactsPass(s);
  s = IssueDraft(s, "A sourced reply.", "2026-11-12T07:00:00Z");
  s = OfferToHuman(s);
  s = HumanConfirms(s);
  s = Publish(s);
  return s;
}

describe("proof-carrying reply pipeline", () => {
  it("posts only after a valid certificate and a confirm of this exact text", () => {
    const s = happyPath();
    assert.equal(s.phase, "posted");
    assert.ok(s.cert);
    assert.ok(s.confirmHash);
    assert.equal(s.confirmHash, s.cert?.textHash);
  });

  it("rejects a stale or buried thread at the freshness gate", () => {
    let s = ScoutFindsStale(initialState(), stale);
    s = CheckFreshFail(s);
    assert.equal(s.phase, "fresh_fail");
    assert.throws(() => CheckFreshPass(ScoutFindsStale(initialState(), stale)));
    assert.throws(() => ScoutFindsFresh(initialState(), stale));
  });

  it("rejects an unsourced claim at the facts gate", () => {
    let s = ScoutFindsFresh(initialState(), freshUnsourced);
    s = CheckFreshPass(s);
    s = CheckFactsFail(s);
    assert.equal(s.phase, "facts_fail");
    assert.throws(() =>
      CheckFactsPass(CheckFreshPass(ScoutFindsFresh(initialState(), freshUnsourced))),
    );
  });

  it("cannot skip gates: no draft from idle or found", () => {
    assert.throws(() => IssueDraft(initialState(), "nope", "2026-11-12T07:00:00Z"));
    const found = ScoutFindsFresh(initialState(), freshSourced);
    assert.throws(() => IssueDraft(found, "nope", "2026-11-12T07:00:00Z"));
  });

  it("cannot publish with blanket autonomy and no confirm", () => {
    let s = initialState();
    s = ScoutFindsFresh(s, freshSourced);
    s = CheckFreshPass(s);
    s = CheckFactsPass(s);
    s = IssueDraft(s, "A sourced reply.", "2026-11-12T07:00:00Z");
    s = OfferToHuman(s);
    s = GrantAutonomy(s);
    assert.equal(s.autonomy, true);
    assert.equal(s.confirmHash, null);
    assert.throws(() => Publish(s), /explicit confirm/);
  });

  it("cannot publish after the text is edited — the certificate is burned", () => {
    let s = initialState();
    s = ScoutFindsFresh(s, freshSourced);
    s = CheckFreshPass(s);
    s = CheckFactsPass(s);
    s = IssueDraft(s, "A sourced reply.", "2026-11-12T07:00:00Z");
    s = OfferToHuman(s);
    s = HumanConfirms(s);
    s = HumanEdits(s, "A different reply.");
    assert.equal(s.phase, "dropped");
    assert.equal(s.cert, null);
    assert.equal(s.confirmHash, null);
    assert.throws(() => Publish(s));
  });

  it("cannot publish if the human declines, even with autonomy", () => {
    let s = initialState();
    s = ScoutFindsFresh(s, freshSourced);
    s = CheckFreshPass(s);
    s = CheckFactsPass(s);
    s = IssueDraft(s, "A sourced reply.", "2026-11-12T07:00:00Z");
    s = OfferToHuman(s);
    s = GrantAutonomy(s);
    s = HumanDeclines(s);
    assert.equal(s.phase, "dropped");
    assert.throws(() => Publish(s));
  });

  it("Done stutters only in a terminal phase", () => {
    const posted = happyPath();
    assert.equal(Done(posted).phase, "posted");
    assert.throws(() => Done(initialState()));
  });
});

describe("replay of real 11–12 Nov posts", () => {
  it("rejects every 11 Nov reply we actually posted, and the 40-minute 12 Nov offer", () => {
    const rows = replay();
    const nov11 = rows.filter((r) => r.id.endsWith("2026-11-11"));
    assert.equal(nov11.length, 4);
    for (const r of nov11) {
      assert.equal(r.actuallyOfferedOrPosted, true);
      assert.equal(r.fresh, false);
      assert.equal(r.rejectedBy, "freshness");
      assert.equal(r.finalPhase, "fresh_fail");
    }
    const ahmad = rows.find((r) => r.id === "ahmad-2026-11-12");
    assert.ok(ahmad);
    assert.equal(ahmad?.actuallyOfferedOrPosted, true);
    assert.equal(ahmad?.rejectedBy, "freshness");
  });

  it("allows the two 12 Nov replies that were still fresh, once confirmed", () => {
    const rows = replay();
    const aakash = rows.find((r) => r.id === "aakash-2026-11-12");
    const theo = rows.find((r) => r.id === "theo-2026-11-12");
    assert.equal(aakash?.rejectedBy, null);
    assert.equal(aakash?.finalPhase, "posted");
    assert.equal(aakash?.facts, true);
    assert.equal(theo?.rejectedBy, null);
    assert.equal(theo?.finalPhase, "posted");
  });

  it("holds back the unsourced-claim scratch case", () => {
    const row = replay().find((r) => r.id === "invented-claim");
    assert.equal(row?.fresh, true);
    assert.equal(row?.facts, false);
    assert.equal(row?.rejectedBy, "unsourced claim");
    assert.equal(isFresh(row ? { ...freshUnsourced } : freshUnsourced), true);
    assert.equal(factsOk(freshUnsourced), false);
  });
});

describe("the same pipeline on a Teams channel message", () => {
  it("posts a sourced Teams standup after a certificate and a confirm", () => {
    const r = runTeamsDemo();
    assertTeamsDemoHolds(r);
    assert.equal(r.certified.phase, "posted");
    assert.ok(r.certified.textHash);
  });

  it("refuses Publish on blanket autonomy, even in a Teams channel", () => {
    const r = runTeamsDemo();
    assert.equal(r.autonomy.refused, true);
    assert.equal(r.autonomy.phase, "awaiting");
    assert.equal(
      r.autonomy.refuseReason,
      "Publish requires an explicit confirm of this exact text",
    );
  });

  it("stays silent when a Teams draft asserts an unsourced fact", () => {
    const r = runTeamsDemo();
    assert.equal(r.silence.phase, "facts_fail");
    assert.equal(r.silence.textHash, null);
  });
});
