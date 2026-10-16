# US-09 — Approve depot

**Role:** Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance (holders of `customers.approve`)

## Story

As an approver,
I want to approve a pending depot registration,
So that it becomes an active trading account registered in SAP under its SAP customer number.

## Preconditions

- Depot status `PendingApproval`.
- I hold `customers.approve`.

## Acceptance criteria

- [x] I can see depots awaiting approval (hub count; `/depots` "Awaiting approval" filter).
- [ ] The approval queue page lists real registrations (M-05).
- [x] I can open a depot and view its details, documents and SAP block.
- [x] Approve sends `POST /api/v1/admin/depots/{id}/approve`.
- [x] The backend makes the depot `Active` and pushes it to SAP in the same request.
- [x] On SAP success the depot's code becomes the SAP customer number and the old code moves to previous code.
- [x] The portal re-reads the depot and the queue after approving (never patches its old copy).
- [x] Updated status, code and SAP state are shown.
- [x] If approving fails, the error is shown.
- [ ] The error text is human-readable, not a message key (M-18).
- [ ] If SAP refused the registration, I see that clearly next to "approved" (the decision page shows `sapRegistration.lastError`; the `/depots` toast only says "approved").
- [ ] Approve is offered only where the backend accepts it — not for `RegionManagerApproved` / `SalesManagerApproved` (M-06) — or the backend supports those stages (README Q1).
- [ ] Missing required documents are checked or warned before approval (README Q3).
- [ ] The decision is recorded in the approval history (README Q4).

## Main scenario

1. Open a pending depot. 2. Check documents. 3. Press Approve. 4. See status Active and the new SAP code.

## Alternative scenarios

- SAP not ready or refused → Active, `sapStatus: Rejected`, last error shown; an operator retries (US-12).
- SAP unreachable → Active, `sapStatus: Submitted`; the 15-minute job registers it later.

## Error scenarios

- 422 `Customer.NotAwaitingApproval` (not `PendingApproval`).
- 404 (depot gone / not visible). 403 (no `customers.approve`).

## Related

- **Use case:** [UC-08](../usecases/approve-depot.md)
- **API:** API-09, then API-03
