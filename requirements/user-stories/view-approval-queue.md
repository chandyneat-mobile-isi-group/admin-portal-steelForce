# US-08 — Review the approval queue

**Role:** approvers — Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance

## Story

As an approver,
I want to see every depot registration waiting for a decision,
So that nothing waits longer than it should.

## Preconditions

- `customers.manage` (route) and `customers.readall` (API).

## Acceptance criteria

- [x] The approval hub shows the number of depots awaiting a decision from `GET /api/v1/admin/depots/pending-approval`.
- [ ] `/approval/depots` lists the real queue from the same endpoint (today hard-coded `MOCK_DEPOTS` — M-05).
- [ ] The queue includes `PendingApproval`, `RegionManagerApproved` and `SalesManagerApproved` with their stage shown.
- [ ] Each row links to `/approval/depots/{GUID}`.
- [ ] Rows show representative, submitted date and document completeness (needs GAP-03, GAP-04, GAP-05).
- [ ] Search and paging are server-side.
- [x] Empty state: "No pending depot requests require your approval."

## Main scenario

1. Open `/approval`. 2. See "3 depots". 3. Open the depot queue. 4. Open the oldest registration.

## Alternative scenarios

- No pending registrations → empty state.

## Error scenarios

- 403 → the depot card is hidden. Network → error state.

## Related

- **Use case:** [UC-02](../usecases/get-pending-depots.md)
- **API:** API-02
