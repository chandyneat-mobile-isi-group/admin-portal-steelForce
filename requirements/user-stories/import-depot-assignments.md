# US-14 — Import depot assignments

**Role:** planners with `routes.manage` (Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Sales Rep Regional, Supervisor)

## Story

As a planner,
I want to upload a workbook that puts depots on representatives' days,
So that I can plan a week of visits in one step instead of one stop at a time.

## Preconditions

- `routes.manage`.

## Acceptance criteria

- [x] I can download a template generated from live representatives and depots.
- [x] Only `.xlsx` is accepted.
- [x] The import is all-or-nothing, and the result says clearly whether anything was saved (`imported`).
- [x] Failed rows are listed with row number, rep, depot and message.
- [x] I can download an error report without importing anything.
- [x] On success the planning board refreshes.
- [ ] Region Code, Start Date, End Date and Status columns are honoured or removed from the template (`TODO - Backend Confirmation Required`).

## Main scenario

1. Download the template. 2. Fill 96 rows. 3. Upload. 4. See "Imported 96 depot call(s)".

## Alternative scenarios

- 2 bad rows → "2 row(s) need fixing"; nothing saved; download the error report; fix; re-upload.

## Error scenarios

- 400 `Visit.ImportFileMissing` / `Visit.ImportFileNotXlsx`; file >5 MB; timeout on very large files.

## Related

- **Use case:** [UC-16](../usecases/import-depot-assignments.md)
- **API:** API-22, API-23, API-24
