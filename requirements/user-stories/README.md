# Depot User Stories — Index

Roles are the backend roles that actually hold the required permission (see [../README.md §4.3](../README.md#43-role--action-matrix-effective-from-backend-grants)). The portal checks permissions, never role names.

Each story lists **Current state** so that acceptance criteria already met are distinguished from work still needed. Checked boxes (`[x]`) are satisfied by the current code; unchecked boxes (`[ ]`) are not.

| ID | Story | Primary role(s) | Use case | Current state |
|---|---|---|---|---|
| US-01 | [View depots](view-depots.md) | Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance | UC-01 | implemented |
| US-02 | [View my depots](view-my-depots.md) | any role with `customers.view` | UC-01 | partial (first 200 rows) |
| US-03 | [View depot detail](view-depot-detail.md) | any role with `customers.read` | UC-03, UC-17 | implemented |
| US-04 | [Review depot documents](review-depot-documents.md) | approvers | UC-04 | implemented |
| US-05 | [Create depot](create-depot.md) | Administrator, Sales Manager, Sales Rep Manager, Supervisor | UC-05 | **not wired** |
| US-06 | [Edit depot](update-depot.md) | holders of `customers.update` | UC-06 | no UI |
| US-07 | [Submit depot for approval](submit-depot.md) | holders of `customers.update` | UC-07 | no UI |
| US-08 | [Review the approval queue](view-approval-queue.md) | approvers | UC-02 | hub real, queue **mock** |
| US-09 | [Approve depot](approve-depot.md) | Administrator, Head of Sales, Sales Manager, Sales Rep Manager, Finance | UC-08 | implemented, with mismatches |
| US-10 | [Reject depot](reject-depot.md) | same as US-09 | UC-09 | implemented, with mismatches |
| US-11 | [Suspend / reinstate depot](suspend-reinstate-depot.md) | same as US-09 | UC-10 | no UI |
| US-12 | [Synchronise depots with SAP](sync-depots-with-sap.md) | Administrator, Head of Sales, Sales Manager, Finance | UC-13, UC-14 | implemented (link-SAP missing) |
| US-13 | [View NON-BP depots](view-non-bp-depots.md) | Administrator, Head of Sales, Sales Manager, Sales Rep Manager | UC-15 | implemented (read-only) |
| US-14 | [Import depot assignments](import-depot-assignments.md) | planners with `routes.manage` | UC-16 | implemented |
