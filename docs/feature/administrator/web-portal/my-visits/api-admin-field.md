# Field & Visits — Web Admin Portal Integration Guide

**Audience:** web admin portal developers building `/field` and `/planning`.
**Scope:** the admin read surface over visits, telemetry, fraud and proof photos, plus
route publishing.
**Status:** Active · **Last updated:** 2026-09-17

**Implementation:** `src/ISI.Api/Controllers/Visits/` ·
`src/ISI.Application/Features/Visits/Admin/` ·
`src/ISI.Domain/Modules/Visits/FieldFraudPolicy.cs` ·
`src/ISI.Api/Realtime/FieldTrackingHub.cs`

**Addresses:** every item in
[webportal-requiremnet-visits-bakend-misiising-feature.md](webportal-requiremnet-visits-bakend-misiising-feature.md).

---

## What changed

None of this data is new. The handset has always captured check-ins, photographs,
telemetry, fraud flags and stock counts, and the domain has always modelled the full
`pending → enRoute → arrived → checkedIn → checkedOut → missed` state machine. What was
missing was **any admin read surface at all** — the portal had no endpoint to call, so
`/field` and `/planning` were static.

| Requirement | Endpoint |
|---|---|
| §1 Visit proof photos | `GET /admin/visits/{visitId}/photos` + `.../content` |
| §2 Telemetry & tracking | `GET /admin/telemetry/reps/{repId}` + `/hubs/admin/field-tracking` |
| §3 Fraud detection | `GET /admin/field/fraud-alerts` + `fraudSeverity` on every visit row |
| §4 Route publishing | `POST /admin/routes/publish` |
| §5 Depot stock audit | `GET /admin/visits/{visitId}/inventory` |
| §6 Granular status | `status` on every visit row — the real six-state machine |

---

## The identity model

**A "visit" is a route stop.** The mobile app, the domain and these routes all use that
identity, so `visitId` everywhere below is a route stop's identifier. A `routeId` is the
day's plan that holds them.

---

## 1. Daily Activities board

`GET /api/v1/admin/visits` — `visits.read`

Query: `pageNumber`, `pageSize`, `search`, `date`, `from`, `to`, `repId`, `customerId`,
`status`, `flaggedOnly`.

### `status` is the state machine, not a boolean

| Value | Meaning |
|---|---|
| `pending` | Not started. |
| `enRoute` | Travelling to the stop. |
| `arrived` | **At the stop but not checked in** — often parked outside the geofence. |
| `checkedIn` | Geofenced check-in captured. |
| `checkedOut` | Call complete. |
| `missed` | Terminal failure. |

**Render from `status`.** Do not infer state by testing whether `checkedInAt` is null:
`arrived` and `enRoute` are both null there and they mean very different things. The
whole point of `/field/check-in` is distinguishing a rep on the road from one standing
outside a geofence, and only `status` carries that.

### Fraud is on every row

`fraudSeverity` is `none` | `low` | `medium` | `high` | `critical`. `fraudCodes` carries
stable codes — `MOCK_LOCATION`, `IMPOSSIBLE_SPEED`, `VPN_DETECTED`, `POOR_ACCURACY`,
`OUTSIDE_GEOFENCE`, `DISTANCE_MISMATCH` — for the portal to localise. Render the red
warning strip from these; no second call is needed.

`hasOverride: true` means the rep checked in outside the geofence **and wrote a reason**.
Show the reason (from the detail endpoint) rather than just the warning — an override
with a good explanation is not the same as one without.

> `flaggedOnly=true` filters the composed page, so a page can come back shorter than
> `pageSize` while `totalCount` still reflects the unfiltered set. Severity spans three
> tables and is a domain rule, so it is not expressible in SQL without a second copy of
> the policy. For a purely fraud-driven view use `/admin/field/fraud-alerts`, which
> pages properly.

### Scoping

Every route here is scoped by `visits.readall`. Without it a caller sees only their own
stops, and another rep's visit answers **404, not 403** — so these routes cannot be used
to discover which stops exist.

---

## 2. Visit detail

`GET /api/v1/admin/visits/{visitId}` — `visits.read`

One call for the detail drawer: the board row, the geofence outcome, every fraud flag,
the photographs, the stock counted, the notes, plus order-line count, collection total
and return count.

### Reading `geofence` when adjudicating a dispute

It reports **two distances, and they are not the same number**:

- `reportedDistanceMetres` — what the handset calculated.
- `verifiedDistanceMetres` — what the server recomputed from the customer's stored
  coordinates. Null when the customer has no coordinates.

A wide gap means either the customer is pinned wrongly or the reported position is not
where the rep stood. You need both figures to tell which, which is why both are on the
wire. Show them side by side rather than picking one.

---

## 3. Proof photos (§1)

```
GET /api/v1/admin/visits/{visitId}/photos                        visits.read
GET /api/v1/admin/visits/{visitId}/photos/{photoId}/content      visits.read
```

`contentUrl` is an **authenticated** address — send the bearer token as for any other
portal call. Unlike the public customer shopfront route, a check-in proof photograph is
evidence about a named employee's movements and is never given a forwardable capability
URL.

`contentUrl` is **null while `uploadState` is `pendingUpload`**. The JSON batch cannot
carry binary, so a photo's record and its bytes travel separately and the record almost
always wins the race — a rep syncing from a village with no signal can be hours behind.
Render a placeholder, not a broken image.

`hasProofPhoto` is false when the only images are signatures.

---

## 4. Telemetry & live tracking (§2)

### History

`GET /api/v1/admin/telemetry/reps/{repId}` — `visits.read`

Query: `from`, `to`, `maxSamples`. Defaults to midnight UTC today through now.

**This is the actual path, not the planned one.** Plot it against the route's stops from
`/admin/visits` to show where a rep really went against where they were due.

**Gaps prove nothing.** The handset buffers fixes while offline and pushes them in
batches, so a stretch with no samples almost always means no signal rather than no
movement. Compare `sampleCount` against the window length before drawing any conclusion
from a gap.

**Bounded on purpose:** at most 7 days and 5,000 fixes. A full day at one fix every five
seconds is over 17,000 points, which no map can usefully draw. A wider window is
**refused rather than silently truncated** — a map quietly showing four days of a
fortnight is worse than an error, because nothing on screen says the path is incomplete.

Reading another rep's track needs `visits.readall`; a rep may always retrace their own day.

### Live

SignalR hub at **`/hubs/admin/field-tracking`** — requires `visits.readall`.

```js
const conn = new signalR.HubConnectionBuilder()
  .withUrl("/hubs/admin/field-tracking", { accessTokenFactory: () => token })
  .withAutomaticReconnect()
  .build();

conn.on("repPositionMoved", e => moveMarker(e.repId, e.sample));
```

A WebSocket handshake cannot carry an `Authorization` header, so the token goes in the
query string — `accessTokenFactory` handles that and the server moves it into the header.

**One fix per batch, not every fix.** A handset that was offline uploads hundreds of
samples at once; replaying them all would animate a rep retracing their morning at speed
across every supervisor's map. Only the newest position is pushed. Use the history
endpoint for the path.

`sample.capturedAt` may be well behind the moment the event arrives. **Label the marker
with that time** rather than implying the rep is there right now. `samplesInBatch` tells
you how far behind the device was.

**There is no replay buffer.** A client that reconnects must re-fetch before trusting
incoming events again — otherwise the marker sits wherever it was when the socket
dropped and looks like a stationary rep.

The hub requires `visits.readall` rather than `visits.read` because a broadcast socket
cannot filter per connection without a group per representative. Own-track access stays
on the REST endpoint, which scopes properly.

---

## 5. Fraud alerts (§3)

`GET /api/v1/admin/field/fraud-alerts` — `visits.read`

Query: `from`, `to`, `repId`, `minimumSeverity`, `blockedOnly`. Defaults to the last
seven days at `minimumSeverity=high`.

| Condition | Severity | Why |
|---|---|---|
| `MOCK_LOCATION` | `critical` | The device says its own position is fabricated. |
| `IMPOSSIBLE_SPEED` | `high` | The rep could not have travelled that far that fast. |
| `VPN_DETECTED` | `medium` | Common and innocent on its own; a VPN moves nobody. |
| `POOR_ACCURACY` | `low` | An urban canyon or a metal roof produces it honestly. |

**Filtered to `high` by default on purpose.** Poor GPS accuracy under a warehouse roof
happens honestly every day, and a board that lists it is a board nobody reads. Pass
`minimumSeverity=low` for the full picture.

`blocked: true` means the handset refused to let the rep proceed — they already know
something happened and may be disputing it. Those sort first.

The gap between `capturedAt` and `receivedAt` is sync latency, not delay in raising the
alarm.

> **Every signal here is self-reported by the handset.** A rooted device running a
> patched build can report a clean check-in from anywhere and nothing on this board
> would show it. What it does catch is the ordinary case. Treat a row as a prompt to
> look, never as proof of intent.

---

## 6. Depot stock audit (§5)

`GET /api/v1/admin/visits/{visitId}/inventory` — `visits.read`

**These are observations, not inventory.** A rep counting shelves during a call records
a band — `low`, `medium`, `high` — not a quantity, and the reading is only as good as
the moment it was taken. Useful as a demand signal for forecasting; not a substitute for
the depot's own stock figures.

`lowStockCount` lets a board flag a call that found empty shelves without walking the
item list.

---

## 7. Route publishing (§4)

`POST /api/v1/admin/routes/publish` — **`routes.manage`**

```json
{
  "repId": "0199a1b2-...",
  "visitDate": "2026-09-18",
  "name": "Kandal Monday",
  "territory": "PP-NORTH",
  "plannedStart": "2026-09-18T01:00:00Z",
  "plannedEnd": "2026-09-18T10:00:00Z",
  "stops": [
    { "customerId": "...", "sequence": 1,
      "plannedArrival": "2026-09-18T02:00:00Z",
      "plannedDeparture": "2026-09-18T02:30:00Z" }
  ]
}
```

**Publishing is what makes a route visible to the handset.** A route that has only been
planned does not sync. This call creates the stops and publishes them in one
transaction, so a half-built route never reaches a rep's phone mid-edit.

**Saving repeatedly is safe.** Re-publishing for the same `repId` and `visitDate`
replaces the existing route rather than creating a second one, so a drag-and-drop board
can save on every change. `replacedExistingDraft` tells you which happened.

**A route the rep has already started is not replaced** — `409`
`Visit.RouteAlreadyStarted`. Their completed check-ins, photographs and stock counts
hang off that route's stops, and replacing it would orphan a morning's fieldwork.
Publish to a different date, or close the current route first.

`sequence` must be unique within the request and 1-based; the server orders by it
regardless of array order. Every `customerId` must exist. At most 100 stops.

Requires `routes.manage`, not `routes.read` — a route determines where somebody spends
their working day.

---

## Errors

| Status | Code | Meaning |
|---|---|---|
| `404` | `Visit.StopNotFound` | No such visit, **or** one outside your scope. |
| `404` | `Visit.PhotoNotFound` | No such photo, wrong visit, or upload incomplete. |
| `400` | `Visit.TelemetryWindowInverted` | `to` is before `from`. |
| `400` | `Visit.TelemetryWindowTooWide` | Window over 7 days. |
| `400` | `Visit.RouteRepUnknown` | No active user with that id. |
| `400` | `Visit.RouteCustomerUnknown` | A stop names a customer that does not exist. |
| `400` | `Visit.StopSequenceDuplicated` | Two stops share a `sequence`. |
| `400` | `Visit.RouteHasNoStops` | Nothing to publish. |
| `409` | `Visit.RouteAlreadyStarted` | The rep has begun that day's route. |

---

## Limitations

- **The field record is read-only.** Check-ins are geofenced and photographed at the
  moment they happen; letting the portal edit them afterwards would destroy the only
  thing that makes them evidence. There is no endpoint to correct a visit. If the
  business needs supervisor adjudication, it should be a **separate reviewed decision
  recorded alongside** the capture, not a mutation of it — that needs a requirement.
- **`flaggedOnly` filters after paging.** See the note in §1.
- **Live tracking is broadcast, not per-rep.** All supervisors with `visits.readall` see
  all reps. Territory-scoped groups would need a group per territory and a rule for who
  belongs to which.
- **The live position is published before the transaction commits.** A commit that then
  failed would leave supervisors looking at a position that was never stored. Acceptable
  here and nowhere else: the marker is advisory, labelled with its own capture time, and
  the next batch corrects it. Nothing is decided from it.
- **No integration tests.** These endpoints have unit coverage for the fraud policy and
  the publish validator only. The scoping rules, the 404-not-403 behaviour and the
  route-replacement transaction need the `ISI.Api.IntegrationTests` harness, which does
  not exist yet — see `docs/qa/qa-implementation-plan.md` Stage 3.

---

## Related

- [webportal-requiremnet-visits-bakend-misiising-feature.md](webportal-requiremnet-visits-bakend-misiising-feature.md) — the requirements this implements
- [../../../../my-visits/](../../../../my-visits/) — the mobile side of the same data
- [../../../../../qa/](../../../../../qa/) — QA discovery and test plan
