/**
 * The safety gates a public reply must pass.
 * Each gate is one indivisible check in formal/ProofCarryingReply.tla.
 *
 * ageMinutes <= MAX_AGE_MINUTES  <->  ageOk
 * replyCount <  MAX_REPLIES      <->  repliesOk
 * every claim sourced            <->  factsOk
 *   (a reply with no factual claims is allowed)
 */

export const POLICY_VERSION = "pcr-v1";
export const MAX_AGE_MINUTES = 30;
export const MAX_REPLIES = 30;

export type Claim = {
  text: string;
  source: string | null;
  verified: boolean;
};

export type Candidate = {
  postId: string;
  author: string;
  ageMinutes: number;
  replyCount: number;
  claims: Claim[];
};

export function ageOk(c: Candidate): boolean {
  return c.ageMinutes <= MAX_AGE_MINUTES;
}

export function repliesOk(c: Candidate): boolean {
  return c.replyCount < MAX_REPLIES;
}

export function isFresh(c: Candidate): boolean {
  return ageOk(c) && repliesOk(c);
}

/** If a reply asserts a fact, that fact must be sourced and verified. Pure opinion is allowed. */
export function factsOk(c: Candidate): boolean {
  return c.claims.every((cl) => cl.verified && Boolean(cl.source));
}
