# US-12 — Synchronise depots with SAP

**Role:** Administrator, Head of Sales, Sales Manager, Finance (holders of `customers.sync`)

## Story

As an SAP operator,
I want to see how far the depot master and SAP have drifted and run the sync operations,
So that every approved depot ends up registered in SAP and portal data matches SAP.

## Preconditions

- `customers.sync`; SAP reachable.

## Acceptance criteria

- [x] The SAP panel shows total, registered, pending, rejected, not submitted, last registration and oldest pending.
- [x] Pull master data, refresh references, push pending and retry rejected are separate buttons.
- [x] Push asks for confirmation and names the count, because it creates ERP records.
- [x] The panel is hidden for users without `customers.sync`.
- [ ] Depots stuck in `Syncing` are visible and can be repaired by linking an existing SAP number (UC-14; README Q8).
- [ ] The rejected list with each depot's SAP error is viewable (`GET /customers/sap/rejected` exists; no UI).

## Main scenario

1. Open `/depots`. 2. See "4 rejected". 3. Retry rejected. 4. Push to SAP. 5. See the counts update.

## Alternative scenarios

- Nothing pending → push shows 0.

## Error scenarios

- 502 `Sap.*` when SAP is down → error toast. 403.

## Related

- **Use cases:** [UC-13](../usecases/sap-sync.md), [UC-14](../usecases/link-depot-to-sap.md)
- **API:** API-15..API-19, API-20
