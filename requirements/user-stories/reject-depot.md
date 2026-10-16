# US-10 — Reject depot

**Role:** Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance (holders of `customers.approve`)

## Story

As an approver,
I want to reject a registration with a reason,
So that the representative who captured it knows what to fix.

## Preconditions

- Depot in `Draft`, `PendingApproval`, `RegionManagerApproved` or `SalesManagerApproved`.

## Acceptance criteria

- [x] Reject asks for a reason; confirm is enabled at ≥3 characters; counter shows `n/512`.
- [x] Reject sends `POST /api/v1/admin/depots/{id}/reject` with `{ "reason" }`.
- [x] The depot becomes `Rejected` and leaves the queue; the portal re-reads.
- [ ] I can reject mid-chain depots from the decision page (hidden today — M-07).
- [ ] The stored reason is visible on the depot afterwards (GAP-02).
- [ ] The representative is notified (README Q5).
- [ ] A rejected depot is labelled "Rejected" everywhere, not "Prospect" (M-14).

## Main scenario

1. Open a pending depot. 2. Press Reject. 3. Enter "Storefront photo does not match the registered address." 4. Confirm.

## Alternative scenarios

- Rejected depot is corrected and re-submitted (US-06, US-07).

## Error scenarios

- 400 reason too short/long · 422 `Customer.NotRejectable` · 404 · 403.

## Related

- **Use case:** [UC-09](../usecases/reject-depot.md)
- **API:** API-10, then API-03
