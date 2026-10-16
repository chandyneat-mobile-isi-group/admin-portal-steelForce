# US-06 — Edit depot

**Role:** holders of `customers.update` (Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Supervisor)

## Story

As a back-office user,
I want to correct a depot's name, contact, address and credit terms,
So that the master data stays accurate.

## Preconditions

- The depot is visible to me and not `Closed`.

## Acceptance criteria

- [ ] An edit form exists (no UI today).
- [ ] Saving calls `PUT /api/v1/customers/{id}` with `name`, `type`, `phone`, `address` (required) and the optional fields.
- [ ] Code and owner are shown read-only (not editable through this API).
- [ ] A concurrent edit (409 `General.ConcurrencyConflict`) asks me to reload.
- [ ] The status is never changed by editing (BR-01).

## Main scenario

1. Open a depot. 2. Edit the phone and credit limit. 3. Save. 4. See the updated values.

## Alternative scenarios

- Editing a depot that is awaiting approval — `TODO - Backend Confirmation Required` whether allowed.

## Error scenarios

- 400 · 404 · 409 · 422 `Customer.Closed`.

## Related

- **Use case:** [UC-06](../usecases/update-depot.md)
- **API:** API-07
