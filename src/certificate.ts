/**
 * A proof certificate is bound to exact reply text.
 * Editing the text invalidates the certificate (certValid becomes false).
 * A human confirm is bound to the same hash: confirmHash must equal textHash.
 *
 * Maps to TLA+ variables certValid, textHash, confirmHash.
 *
 * A reply with no factual claims can still have a valid certificate:
 * the certificate records that there were no claims to source.
 */
import { createHash } from "node:crypto";
import { POLICY_VERSION, type Candidate, type Claim } from "./policy.ts";

export type Certificate = {
  policyVersion: string;
  postId: string;
  author: string;
  ageMinutes: number;
  replyCount: number;
  claims: { text: string; source: string }[];
  text: string;
  textHash: string;
  issuedAt: string;
};

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function sourcedClaims(claims: Claim[]): { text: string; source: string }[] {
  return claims
    .filter((cl) => cl.verified && Boolean(cl.source))
    .map((cl) => ({ text: cl.text, source: cl.source as string }));
}

export function issueCertificate(c: Candidate, text: string, issuedAt: string): Certificate {
  if (!text.trim()) {
    throw new Error("cannot issue a certificate for empty text");
  }
  return {
    policyVersion: POLICY_VERSION,
    postId: c.postId,
    author: c.author,
    ageMinutes: c.ageMinutes,
    replyCount: c.replyCount,
    claims: sourcedClaims(c.claims),
    text,
    textHash: hashText(text),
    issuedAt,
  };
}

export function certificateValid(cert: Certificate, currentText: string, c: Candidate): boolean {
  const expected = sourcedClaims(c.claims);
  const claimsMatch =
    cert.claims.length === expected.length &&
    cert.claims.every((cl, i) => cl.text === expected[i].text && cl.source === expected[i].source);
  return (
    cert.policyVersion === POLICY_VERSION &&
    cert.postId === c.postId &&
    cert.author === c.author &&
    cert.textHash === hashText(currentText) &&
    cert.text === currentText &&
    cert.ageMinutes === c.ageMinutes &&
    cert.replyCount === c.replyCount &&
    claimsMatch
  );
}
