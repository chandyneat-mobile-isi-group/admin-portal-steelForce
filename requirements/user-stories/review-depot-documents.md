# US-04 — Review depot documents

**Role:** approvers and back-office users with `customers.read`

## Story

As an approver,
I want to see a depot's storefront, interior, owner ID and tax documents and know which required ones are missing,
So that I only approve registrations whose paperwork is in order.

## Preconditions

- The depot is visible to me.

## Acceptance criteria

- [x] Documents load from `GET /api/v1/admin/depots/{id}/documents`.
- [x] Images are fetched with my token from `previewUrl` and shown as thumbnails with a lightbox; PDFs open.
- [x] Documents are grouped: storefront, inside, owner ID, tax documents.
- [x] Missing required documents (`STOREFRONT`, `INSIDE_STORE`, `ID_CARD`) are listed.
- [ ] The approval queue flags incomplete registrations before I open them (list rows always report complete — GAP-03).
- [ ] Approval is blocked or warned when required documents are missing (`TODO - Backend Confirmation Required`, README Q3).
- [ ] Public storefront links work (`publicUrl` points to a non-existent route — M-17).

## Main scenario

1. Open a depot. 2. Open Documents. 3. Enlarge the ID card. 4. Note "Missing: INSIDE_STORE".

## Alternative scenarios

- No documents uploaded → empty sections plus the missing list.

## Error scenarios

- One image fails → that tile shows a failure; others load. 404 → error state.

## Related

- **Use case:** [UC-04](../usecases/get-depot-documents.md)
- **API:** API-04, API-05
