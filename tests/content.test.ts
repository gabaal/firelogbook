import test from "node:test";
import assert from "node:assert/strict";
import { CHECKLIST, FREQUENCIES, ITEMS_BY_KEY } from "../src/lib/checklist";
import { CHECK_SEO, FREQUENCY_NOTE } from "../src/lib/check-seo";

test("checklist keys are unique", () => {
  const keys = CHECKLIST.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.length, 13);
});

test("every check has public landing-page content", () => {
  for (const item of CHECKLIST) {
    const seo = CHECK_SEO[item.key];
    assert.ok(seo, `missing SEO copy for ${item.key}`);
    assert.ok(seo.why.length > 60, `why copy too short for ${item.key}`);
    assert.ok(seo.record.length >= 3, `record bullets missing for ${item.key}`);
    assert.ok(FREQUENCIES[item.frequency], `bad frequency for ${item.key}`);
    assert.ok(item.ref.length > 0, `missing reference for ${item.key}`);
  }
});

test("every frequency has a scheduling note", () => {
  for (const frequency of Object.keys(FREQUENCIES) as Array<
    keyof typeof FREQUENCIES
  >) {
    assert.ok(FREQUENCY_NOTE[frequency].length > 10);
  }
});

test("ITEMS_BY_KEY contains every checklist item", () => {
  for (const item of CHECKLIST) {
    assert.equal(ITEMS_BY_KEY[item.key]?.title, item.title);
  }
});
