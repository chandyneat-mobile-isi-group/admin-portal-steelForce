# US-05 — Create depot

**Role:** Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Supervisor (holders of `customers.create`; route needs `customers.manage`)

## Story

As a back-office user,
I want to register a new depot from the portal,
So that a trading account exists without waiting for a field capture.

## Preconditions

- Signed in with `customers.create`.
- Agreed contract for `code` and `type` (README Q6, M-02, M-03).

## Acceptance criteria

- [x] A 5-step form (Identity, Contact, Address, Commercial, Assignment) validates each step and all steps on submit.
- [x] Required in the form: depot type, company name (≥3), contact person, phone, province, street, sales representative.
- [ ] Submitting calls `POST /api/v1/customers` (today it only shows a toast — M-01).
- [ ] The payload includes `code` (or the backend generates it) and a backend `type` value (M-02, M-03).
- [ ] District, postal code and GPS coordinates are sent and stored (M-04; GPS text is not parsed today).
- [ ] The representative list comes from real users, not demo data (GAP-04).
- [ ] On success the new depot appears in `Draft` and can be submitted (US-07).
- [ ] Server validation errors are shown next to the right fields (M-19).
- [ ] "Save draft" either saves on the server or is removed (`TODO - Backend Confirmation Required`).

## Main scenario

1. Open `/depots/new`. 2. Fill the five steps. 3. Press Create. 4. See the depot in My Depots.

## Alternative scenarios

- "Create and add another" keeps province, rep and territory.

## Error scenarios

- 400 → field errors. 409 `Customer.DuplicateCode` → "code already exists". 403 → no access.

## Related

- **Use case:** [UC-05](../usecases/create-depot.md)
- **API:** API-06 `POST /api/v1/customers`
