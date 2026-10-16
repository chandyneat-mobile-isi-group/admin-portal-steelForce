# US-13 — View NON-BP depots

**Role:** Administrator, Head of Sales, Sales Manager, Sales Rep Manager (holders of `noncustomers.readall`)

## Story

As a sales manager,
I want to see prospects captured in the field that are not yet SAP business partners,
So that I can judge which ones are worth converting into customers.

## Preconditions

- `noncustomers.readall` (route needs `customers.view`).

## Acceptance criteria

- [x] The list loads from `GET /api/v1/admin/non-bp-depots` with server-side search and paging.
- [x] Each prospect shows name, city/province, code or "No code", status, and details.
- [ ] Filter by status, representative and territory (supported by the API; not in the UI).
- [ ] Approve / reject / convert a prospect from the portal (`TODO - Backend Confirmation Required`, README Q10; only mobile approve/reject exist, conversion does not exist).
- [ ] Users without `noncustomers.readall` do not see the menu item (today they see it and get 403).

## Main scenario

1. Open `/depots/non-bp`. 2. Search "Battambang". 3. Open a prospect.

## Alternative scenarios

- No prospects → "No NON-BP depots".

## Error scenarios

- 403 · network → error state.

## Related

- **Use case:** [UC-15](../usecases/get-non-bp-depots.md)
- **API:** API-21
