# US-03 — View depot detail

**Role:** any holder of `customers.read`

## Story

As a portal user,
I want to open a depot and see its identity, address, credit terms, SAP state, documents and quotations,
So that I have the facts about that trading account in one place.

## Preconditions

- The depot is visible to me (`customers.readall`, or I am its assigned rep).

## Acceptance criteria

- [x] Selecting a row loads `GET /api/v1/customers/{id}` and merges it over the list row.
- [x] Tabs: Overview, Sales, Quotations, Documents, Address & location.
- [x] Only fields the backend holds are shown; unmapped analytics show as blank, not invented.
- [x] Current code, and previous code once SAP has issued a number (decision page).
- [x] SAP registration status, attempts and last error (decision page).
- [ ] Contact position shown (portal reads `role`; backend sends `position` — M-15).
- [ ] Rejection reason and approval trail shown (GAP-02).
- [ ] Coordinates absent → no map pin at (0, 0) (M-13).
- [x] A depot I may not see answers "could not be loaded" (404), without revealing it exists.

## Main scenario

1. Select a depot on `/depots`. 2. Read Overview. 3. Open Address & location. 4. Open Quotations.

## Alternative scenarios

- Opened from the approval hub → `/approval/depots/{id}` decision page (US-09, US-10).

## Error scenarios

- 404 / 403 → "This registration could not be loaded."; network → error card.

## Related

- **Use cases:** [UC-03](../usecases/get-depot-detail.md), [UC-17](../usecases/get-depot-quotations.md)
- **API:** API-03, API-25
