# US-01 — View depots

**Role:** Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance (any holder of `customers.readall`)

## Story

As a back-office manager,
I want to browse, search and filter the whole depot directory,
So that I can find any trading account and see where it is in its registration lifecycle.

## Preconditions

- Signed in; token carries `customers.readall` (route needs `customers.view`).
- `NEXT_PUBLIC_DEPOTS_API=true`.

## Acceptance criteria

- [x] The list loads page 1 (200 rows) from `GET /api/v1/admin/depots`.
- [x] Searching is server-side and debounced (300 ms); page resets to 1.
- [x] Status filters: All, Awaiting approval, Active, Rejected, Suspended, Draft.
- [ ] "Awaiting approval" includes `PendingApproval`, `RegionManagerApproved` and `SalesManagerApproved` (today only `PendingApproval` — M-08).
- [x] Each card shows its lifecycle chip with a readable label.
- [x] Previous / next paging with "Page X of Y" from `meta.pagination.totalCount`.
- [ ] Each row shows the real assigned representative (today "Unassigned" — M-11).
- [x] Loading, empty ("No depots found") and error (retry) states.
- [ ] Users with `customers.view` but without `customers.readall` see a clear "no access" state rather than a generic error (`TODO - Permission confirmation required`).

## Main scenario

1. Open `/depots`. 2. Type "Phnom" in search. 3. Choose "Awaiting approval". 4. Select a depot to see its detail (US-03).

## Alternative scenarios

- No match → "Nothing matches that search."
- Directory empty → "No depots have been registered yet."

## Error scenarios

- 403 → error state. Network / 5xx / timeout → error state with retry.

## Related

- **Use case:** [UC-01](../usecases/get-depots.md)
- **API:** API-01 `GET /api/v1/admin/depots`
