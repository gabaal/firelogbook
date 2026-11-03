import test from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "../src/lib/tokens";

// signingSecret() reads the environment on each call, so setting it here is
// enough; importing the module does not sign anything.
process.env.SESSION_SECRET = "unit-test-secret-".padEnd(48, "x");

test("a signed token round-trips", () => {
  const token = signToken({ s: "site-1", e: 123 });
  assert.deepEqual(verifyToken(token), { s: "site-1", e: 123 });
});

test("a tampered payload is rejected", () => {
  const token = signToken({ s: "site-1" });
  const [, signature] = token.split(".");
  const forged = `${Buffer.from(JSON.stringify({ s: "site-2" })).toString("base64url")}.${signature}`;
  assert.equal(verifyToken(forged), null);
});

test("a tampered signature is rejected", () => {
  const token = signToken({ s: "site-1" });
  const [payload, signature] = token.split(".");
  const forged = `${payload}.${signature.slice(0, -2)}aa`;
  assert.equal(verifyToken(forged), null);
});

test("malformed tokens are rejected", () => {
  assert.equal(verifyToken(""), null);
  assert.equal(verifyToken("no-dot"), null);
  assert.equal(verifyToken("a.b.c"), null);
});

test("a secret shorter than 32 characters is refused in production code paths", () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "too-short";
  assert.throws(() => signToken({ s: "x" }), /at least 32 characters/);
  process.env.SESSION_SECRET = previous;
});
