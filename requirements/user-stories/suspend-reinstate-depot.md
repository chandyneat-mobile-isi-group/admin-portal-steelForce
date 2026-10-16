# US-11 — Suspend / reinstate depot

**Role:** holders of `customers.approve`

## Story

As an approver,
I want to suspend an active depot and later reinstate it,
So that trading can be paused (for example for overdue payment) without deleting the account.

## Preconditions

- Suspend: `Active`. Reinstate: `Suspended`.

## Acceptance criteria

- [ ] Suspend and Reinstate actions exist (no UI today).
- [ ] Suspend requires a reason (3–512) and calls `POST /api/v1/customers/{id}/suspend`.
- [ ] Reinstate calls `POST /api/v1/customers/{id}/reinstate`.
- [ ] The depot's status and "can trade" flag update after a re-read.
- [ ] `TODO - Backend Confirmation Required`: whether suspension must also block the customer in SAP.

## Main scenario

1. Open an active depot. 2. Suspend with reason "Overdue payment beyond 90 days". 3. Later, reinstate.

## Alternative scenarios

- None.

## Error scenarios

- 422 `Customer.NotActive` / `Customer.NotSuspended` · 400 reason · 404 · 403.

## Related

- **Use case:** [UC-10](../usecases/suspend-reinstate-depot.md)
- **API:** API-11, API-12
