# Fireberry status and student-rating webhook

Use the existing authenticated endpoint:

```text
POST https://<dashboard-domain>/api/webhooks/lead-status
Authorization: Bearer <existing-webhook-secret>
Content-Type: application/json
```

The secret stays in server configuration and the sender's existing connection. Do not place it in examples, URLs or logs.

`LEAD_RATING_WEBHOOK_SECRET` is an additional narrowly scoped credential for Fireberry's new rating-only automation. It can authenticate the same route but cannot send status or payment fields, even null; these requests return 403 before any matching or database access. The original status webhook credential is retained unchanged. Configure the new credential in the server's environment and copy it once to the sender's Authorization header.

## Identify the dashboard lead

Send `leadId` as a string: the verified Meta Lead ID or the dashboard's internal landing-page lead ID. It is **not** a Fireberry contact ID. Alternatively send an Israeli `phone` in a supported format. Names are never used. An ambiguous phone is never guessed: the update is kept for an admin (see "Updates the dashboard cannot place yet").

## Rating-only update

The verified Fireberry field is `pcfsystemfield350`, a Picklist with raw codes:

| Raw code | Flames | Business interpretation |
|---|---:|---|
| 6 | 1 | Legacy cold rating, preserved if received |
| 7 | 2 | Ordinary |
| 8 | 3 | Ordinary |
| 9 | 4 | Excellent |
| 10 | 5 | Excellent |

To store four flames without changing the lead's statuses or payments:

```json
{
  "leadId": "known-dashboard-lead-id",
  "pcfsystemfield350": 9
}
```

Alternatively send the canonical flame count:

```json
{
  "leadId": "known-dashboard-lead-id",
  "studentRating": 4
}
```

Integers and exact digit strings such as `"9"` for the raw field or `"4"` for the canonical field are accepted. When both fields are present, they must resolve to the same rating. A conflict rejects the whole update with HTTP 400.

The raw field also accepts the visible labels from the standard Fireberry field reference, such as `"4 - 🔥🔥🔥🔥"` and `"5 - 🔥🔥🔥🔥🔥 - לוהט"`. The numeral and number of flames must agree; unknown text and contradictory values are rejected. Insert the **דירוג תלמיד** reference with Fireberry's `{ }` picker (`{[!pcfsystemfield350]}`), rather than assuming an undocumented Picklist `-id` suffix. Keep the JSON value quoted so either a raw numeric code or its visible label is valid JSON.

The Fireberry action can send just `phone` (selected with the picker from **טלפון ראשי**) and `pcfsystemfield350`. Use **record created or updated**, with **דירוג תלמיד contains data** and **טלפון ראשי contains data** as the relevant filters. Verify the initial default-2 record and a real subsequent rating change separately. No historical ratings are sent merely by activating this automation.

A missing/undefined rating preserves the stored value. Explicit `null` clears it:

```json
{
  "leadId": "known-dashboard-lead-id",
  "pcfsystemfield350": null
}
```

Empty strings, 0, fractional numbers, booleans, objects and unknown codes are rejected. The webhook never writes a default rating: omission preserves the raw stored value and explicit null remains null.

## Reporting interpretation

The business default for a known missing rating is **two flames (ordinary)**. Reporting uses an effective value of 2 for raw `null` or `undefined` when the lead's status source was successfully read. These leads contribute to ordinary counts, the two-flame count and all reportable-rating percentages. This is a reporting rule only: the database, webhook responses and raw lead facts retain the original null value, so defaulted ratings are not mistaken for ratings received from Fireberry.

An unavailable status read with a missing rating stays technically unavailable; it is not defaulted to 2. An explicit valid rating of 1–5 remains usable independently of lifecycle-status availability. Invalid numeric ratings also stay unavailable rather than becoming ordinary leads. Percentages use all leads in the same entry-date cohort, and partial lead sources withhold percentages and acquisition cost. When the whole cohort is reportable, known ordinary defaults do not prevent calculating spend per excellent lead. Excellent means 4–5 flames and does not itself imply an enrollment or payment.

**Cooperation percentage** is the count of leads rated 3, 4 or 5 divided by **all incoming leads in the same cohort**. Two flames, including known missing ratings reported as the ordinary default of 2, stay in the denominator and are excluded from the numerator. Legacy one-flame and technically unavailable ratings also stay in the cohort denominator. Three flames counts as cooperation while remaining ordinary quality; excellent quality is still only 4–5. Cooperation does not change registration counts or the scale-budget policy. An empty cohort or an unavailable lead source has no published cooperation percentage; observed counts are preserved when a source is partial.

A rating-only write uses a dedicated atomic UPSERT: an existing main status, secondary status and payment amounts remain untouched. If the verified lead has no stored status row yet, its existing implicit dashboard default is `חדש` / `חדש`; creating the first rating row merely persists that default.

## Combined status and rating update

The previous status/payment contract remains supported. Add either rating field when needed:

```json
{
  "leadId": "known-dashboard-lead-id",
  "mainStatus": "בתהליך",
  "secondaryStatus": "בתהליך",
  "pcfsystemfield350": 10
}
```

When sending status fields they must form a valid existing main/secondary pair. Only enrolled main status `נרשם` permits an omitted secondary status. Payment-only changes without status fields remain rejected. Ordinary status updates that omit rating preserve the stored rating, including when a rating write is concurrent.

## Persistence and freshness

The schema change adds nullable `student_rating` with a database check for integer values 1–5. It is additive and idempotent; existing rows remain null until real CRM ratings arrive. Deploying support does not backfill historical Fireberry records: the sender must send current ratings for those existing leads as well as future changes.

`updatedAt` is server receipt time. No verified Fireberry modification timestamp or event sequence is currently part of the payload, so delayed out-of-order CRM events cannot be rejected by source time; the last rating received wins. Repeated delivery of the same update preserves the same business value, while receipt time may advance.

Successful responses include the matched dashboard lead ID, matching method and the persisted `record.studentRating`. The webhook never changes Meta campaigns or budgets, and rating does not itself create an enrollment or a payment.

## Updates the dashboard cannot place yet

An update that cannot be placed yet is kept in the durable queue (table `lead_status_pending`) and answered `200` with `applied: false` and a `reason`, so the automation keeps running:

- `not_found`: no lead has this phone or ID yet.
- `ambiguous`: more than one lead has this phone. Nothing is guessed.
- `unverified_match`: the phone appears only under a custom question. Nothing is applied until an admin chooses the lead.
- `meta_unavailable`: the Meta lead list could not be read. The reply also carries `retryLater: true`.
- `missing_identity`, `invalid_phone`: no usable identifier.

A failed save answers `503`. Contract errors (`400`, `401`, `403`) are never stored.

Held updates are completed through the admin endpoint `/api/admin/lead-status/pending` (bearer `LEAD_STATUS_ADMIN_SECRET`):

- `replay`: matches the held updates again. With `dryRun: true` it reports what would apply, and what each row would queue for Meta, and writes nothing.
- `apply`: applies one held update to a lead the admin chooses (`id`, `leadId`). `GET ?id=<id>&candidates=1` lists the leads that share the phone, by ID and status only.
- `import`: rating records from a Fireberry export. One `exportedAt` (the moment the export was taken) for the whole file. A row with a time field of its own is refused, and so is an empty rating: an import never clears a rating.
- `dismiss`: closes one held update.

Held updates are also retried automatically after each webhook reply, once their last check is more than 10 minutes old. Only one completion run at a time: a replay or an apply answers `409` while another run holds the lock.

A held update keeps the time it was received. An imported rating carries the export time and never queues a Meta event, because its change time is not known.
