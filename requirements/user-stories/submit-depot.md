# US-07 — Submit depot for approval

**Role:** holders of `customers.update`

## Story

As the user who registered or corrected a depot,
I want to submit it for approval,
So that an approver can decide on it.

## Preconditions

- Depot in `Draft` or `Rejected`.

## Acceptance criteria

- [ ] A Submit action exists for `Draft` and `Rejected` depots (no UI today).
- [ ] Submitting calls `POST /api/v1/customers/{id}/submit`; the depot becomes `PendingApproval` and appears in the approval queue.
- [ ] Submit is not offered for `Active` or `Suspended` depots (the backend currently allows it — `TODO - Backend Confirmation Required`).
- [ ] A missing-documents warning is shown before submitting (`TODO - Backend Confirmation Required`).

## Main scenario

1. Create a depot (US-05). 2. Press Submit. 3. See "Awaiting approval".

## Alternative scenarios

- Re-submitting after rejection moves it back to `PendingApproval`.

## Error scenarios

- 422 `Customer.Closed` · 404 · 403.

## Related

- **Use case:** [UC-07](../usecases/submit-depot.md)
- **API:** API-08
