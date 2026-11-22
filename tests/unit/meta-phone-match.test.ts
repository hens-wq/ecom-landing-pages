import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLeadContact } from "@/lib/leads/meta/field-data";
import { mapMetaLeadgenNode } from "@/lib/leads/meta/mapper";
import type { MetaFieldDataEntry } from "@/lib/leads/meta/types";

const field = (name: string, value: string): MetaFieldDataEntry => ({ name, values: [value] });

test("a standard phone question is unchanged: the display phone and the matching phone are the same", () => {
  const contact = parseLeadContact([field("full_name", "דנה לוי"), field("phone_number", "052-867-8178")]);
  assert.equal(contact.phone, "052-867-8178");
  assert.equal(contact.matchPhone, "052-867-8178");
  assert.equal(contact.name, "דנה לוי");
});

test("a custom-worded phone question still matches the lead, while the displayed phone stays as it was", () => {
  const contact = parseLeadContact([field("full_name", "דנה לוי"), field("what_is_your_phone", "+972 52-867-8178")]);
  assert.equal(contact.phone, null, "the display phone is not changed by the fallback");
  assert.equal(contact.matchPhone, "+972 52-867-8178");
});

test("the standard phone question wins over a phone-shaped answer to another question, whatever the order", () => {
  const contact = parseLeadContact([field("other_number", "0501234567"), field("phone_number", "052-867-8178")]);
  assert.equal(contact.matchPhone, "052-867-8178");
});

test("names, emails, bare digit runs and ID-like numbers never match as a phone", () => {
  for (const value of ["יוסי 0501234567", "yossi@example.com", "521234567", "123456789", "0123456789", "1500", "0123456"]) {
    const contact = parseLeadContact([field("question_1", value)]);
    assert.equal(contact.matchPhone, null, `"${value}" must not match`);
  }
});

test("a mobile in any explicit form is accepted when it is the only phone-shaped answer", () => {
  for (const value of ["0528678178", "+972528678178", "972528678178", "00972528678178"]) {
    assert.equal(parseLeadContact([field("question_1", value)]).matchPhone, value, value);
  }
});

test("the mapped lead carries the matching phone in its own field, and its display phone stays null", () => {
  const lead = mapMetaLeadgenNode({
    id: "120210000000001111",
    created_time: "2026-11-20T10:00:00+0000",
    field_data: [field("what_is_your_phone", "052-867-8178")],
  } as never);
  assert.equal(lead.phone, null);
  assert.equal(lead.normalizedPhone, null);
  assert.equal(lead.matchNormalizedPhone, "0528678178");
});

test("the mapped lead with a standard phone question has the same phone in both fields", () => {
  const lead = mapMetaLeadgenNode({
    id: "120210000000002222",
    created_time: "2026-11-20T10:00:00+0000",
    field_data: [field("phone_number", "p:+972528678178")],
  } as never);
  assert.equal(lead.normalizedPhone, "0528678178");
  assert.equal(lead.matchNormalizedPhone, "0528678178");
});
