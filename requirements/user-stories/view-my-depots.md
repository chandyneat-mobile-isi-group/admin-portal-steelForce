# US-02 — View my depots

**Role:** any portal user who owns depots (`assignedSalesRepId` = the user) and holds `customers.readall` for the list endpoint

## Story

As a sales manager with my own accounts,
I want to see only the depots assigned to me, with filters and sorting,
So that I can plan follow-ups for my territory.

## Preconditions

- Signed in; `customers.view` (route) and `customers.readall` (API).

## Acceptance criteria

- [x] The list requests `GET /api/v1/admin/depots?assignedSalesRepId={me}`.
- [ ] **All** my depots are available, not only the first 200 (M-22).
- [x] Filters: status, province, type, representative, follow-up, revenue, search; column sorting.
- [ ] Filters and sorting run on the server when the list is larger than one page (`TODO - Backend Confirmation Required`: province/type filters are not supported by `/admin/depots` except `type`).
- [ ] Revenue, follow-up and visit figures come from real data (no backend source today — README §12).
- [ ] Import and Export buttons do real work (today toast-only mocks).
- [x] Selecting a depot opens the drawer.

## Main scenario

1. Open `/depots/my`. 2. Filter by province. 3. Sort by name. 4. Open a depot.

## Alternative scenarios

- No depots assigned → empty table.

## Error scenarios

- 403 (e.g. a Sales Representative, who has `customers.read` but not `customers.readall`) → error state. `TODO - Permission confirmation required`: should My Depots use `GET /api/v1/customers` (scoped to the caller, `customers.read`) instead?

## Related

- **Use case:** [UC-01](../usecases/get-depots.md) (alternative flow A1)
- **API:** API-01
