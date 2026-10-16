# Admin Portal update: linking Sales Representatives to their SAP sales employee

**For:** admin-web-portal developers (and admins who onboard field staff)
**Backend status:** implemented and unit-tested. Not yet deployed: rebuild `backend-server` and `admin-web-portal`.

---

## 1. Why

When a Sales Representative creates a depot from the mobile app, SAP needs to know which **sales employee** (personnel number, partner function `VE`) registered it.

- **Source of the number.** The platform now takes it from the rep's own account: the **employee code** on the user *is* the SAP personnel number.
- **What went wrong before.** The create-user form let admins type any code or generate a random `EMP…` placeholder. A rep created that way had no valid SAP link, so their depots reached SAP with no sales employee. That is how `Chan Sophea` ended up with `EMP000201`; it is now fixed to `103424` (SOPHEAK CHAN).

**New rule:** a Sales Representative account must be linked to a current SAP sales employee.

---

## 2. What is already done

### 2.1 Backend

| Change | Detail |
|---|---|
| Validation on create | `POST /api/v1/users` (when `roles` contains *Sales Representative*) and `POST /api/v1/users/representatives` require `employeeCode` to be an **active** SAP personnel number from the synced `sales_employee` list. |
| New lookup endpoint | `GET /api/v1/users/sales-employees?search=&limit=` returns current SAP sales employees. It requires `users.read`, so Admin, HR and Sales Rep Manager can all use it. |
| Depot auto-fill | New depot drafts and depot creates from the mobile app take `personnelNumber` from the signed-in rep's employee code when the app sends none. Only a valid SAP code is used, so a placeholder is never sent to SAP. |
| Other roles | Unchanged. Their employee code stays free text. |

Error codes the portal can receive:

| Code | HTTP | Meaning | Suggested message |
|---|---|---|---|
| `User.SalesEmployeeCodeRequired` | 400 | Rep has no employee code | "Pick the SAP sales employee for this representative." |
| `User.SalesEmployeeCodeUnknown` | 400 | Code is not a current SAP sales employee | "That code isn't an active SAP sales employee. Pick one from the list." |
| `User.EmployeeCodeAlreadyExists` | 409 | Another account is already linked to that person | "This SAP sales employee is already linked to another account." |

Lookup response:

```jsonc
// GET /api/v1/users/sales-employees?search=sopheak
{
  "data": [
    { "personnelNumber": "103424", "fullName": "SOPHEAK CHAN" }
  ]
}
```

- Active staff only.
- Sorted by name.
- `limit` defaults to 20, maximum 50.
- `search` matches the personnel number or the name, case-insensitively.

### 2.2 Portal: create user (done)

| File | Change |
|---|---|
| `src/features/users/components/sales-employee-select.tsx` | **New** dropdown. It opens a searchable list (server search, 300 ms debounce, up to 50 results) showing `personnelNumber · name`, with a clear button and loading, empty and error states. |
| `src/features/users/repositories/types.ts` | `SalesEmployeeOption` type; `searchSalesEmployees(search)` on `UserRepository`. |
| `src/features/users/repositories/api-user-management-repository.ts` | Calls `GET /users/sales-employees`. |
| `src/features/users/repositories/mock-user-management-repository.ts` | Mock data for offline development. |
| `src/app/(portal)/user-management/users/new/page.tsx` | See the behaviour below. |

Create-user form behaviour:
- **Step 1 (General):** for a rep, the free-text Employee ID and the random-`EMP` generator are replaced by a read-only line: "Chosen from the SAP sales employee list in the next step."
- **Step 2 (Company):** when the role is **Sales Representative**, a required **SAP Sales Employee** dropdown appears under Role. **Next** stays disabled until one is picked.
- **Switching to Sales Representative** clears any typed or generated code.
- **A Sales Rep Manager** (whose role is fixed to Sales Representative) always gets the dropdown.
- **Error toasts** show the server's message for validation and conflict errors.

---

## 3. What still needs updating in the admin site

### 3.1 Edit user (`src/app/(portal)/user-management/users/[id]/page.tsx`): **required**

Today the edit dialog has a free-text `employeeCode` (line ~60, saved at line ~195). The server only enforces the rule on **create**, so an edit can still put a rep back on a placeholder.

To do:
1. Compute `isRepresentative` from `editForm.roles`, the same way the create page does.
2. When true, replace the employee-code input with `<SalesEmployeeSelect>`:
   ```tsx
   <SalesEmployeeSelect
     className={inputClass}
     value={editForm.employeeCode}
     selectedName={salesEmployeeName}
     invalid={!editForm.employeeCode}
     onChange={(option) => {
       setSalesEmployeeName(option?.fullName ?? null);
       setEditForm((f) => ({ ...f, employeeCode: option?.personnelNumber ?? '' }));
     }}
   />
   ```
3. Block **Save** while a rep has no code.
4. Show `problemDetail(err) ?? t(err.messageKey)` in the error toast.

**Backend follow-up (recommended):** apply the same rule in `UpdateUserCommand` when the resulting roles include Sales Representative. It is small, and it reuses `SalesEmployeeLinkRule`. Until then the portal is the only guard on edits.

### 3.2 User detail card: **recommended**

At line ~257 the detail shows `employee_id` only. For reps:
- Label it **SAP Sales Employee** and show `103424 · SOPHEAK CHAN`. Fetch the name with `searchSalesEmployees(code)` and take the exact match.
- If the code doesn't resolve, show a warning badge: "Not linked to SAP: depots this rep creates will have no sales employee." with an **Edit** shortcut.

### 3.3 Users list (`users/page.tsx`): **recommended**

- **Column:** rename the Employee ID column to **Employee / SAP code**.
- **Filter:** add "Reps not linked to SAP", the rep accounts whose `employee_id` is empty or starts with `EMP`, so admins can fix the old ones.

  Today this filter can only be approximate on the client. If you want it exact, ask for a backend flag on the list item, e.g. `salesEmployeeLinked: boolean`.

### 3.4 Existing representatives: **data clean-up**

Accounts created before this change may still carry placeholders.

1. **Find them.** In the DB:

   ```sql
   SELECT u.full_name, u.email, u.employee_code
   FROM users u
   JOIN user_roles ur ON ur.user_id = u.id
   JOIN roles r ON r.id = ur.role_id AND r.name = 'Sales Representative'
   LEFT JOIN sales_employee s ON s.personnel_number = u.employee_code AND s.is_active
   WHERE NOT u.is_deleted AND s.personnel_number IS NULL;
   ```

   Or use the list filter from §3.3.
2. **Fix each one** through **Edit user**, using the SAP dropdown from §3.1.

Until a rep is fixed, their depots are still created, but with no sales employee.

### 3.5 Depot approval / detail (`approval/depots/[id]/page.tsx`): **no change needed**

It already shows `businessPartner.personnelNumber` ("Personnel no."). New depots from linked reps now have it filled. Optionally, show the employee's name next to it.

---

## 4. Related admin-site changes from the same release

Changes already made, for reference when testing the admin site:

| Area | Change | Admin-site impact |
|---|---|---|
| Sales Rep Manager | Can create users, Sales Representative only (`users.create_representative`, `POST /users/representatives`). | Create-user page locks the role for them. They now also get the SAP dropdown. |
| Mobile depot creation | No approval chain. Payment term `T014`, credit limit 0.00, active immediately, sent straight to SAP. | New mobile depots no longer appear in the approval queue. They show as Active with the SAP number once SAP answers. |
| Promotions | Types, conditions, AND/OR rules and relationships are configurable. | Separate document: `docs/promotions-dynamic-configuration-ui-upgrade.md`. |

---

## 5. Test checklist

- [ ] Create user → role **Sales Representative** → the dropdown appears, and **Next** is disabled until an employee is picked.
- [ ] Search "sopheak" lists `103424 SOPHEAK CHAN`; picking it shows the code on the Review step.
- [ ] Saving with an employee already linked to another account shows "already linked" (409).
- [ ] Role **HR** / **Admin** → free-text Employee ID and the generator are still available.
- [ ] Sign in as a Sales Rep Manager → the role is fixed and the dropdown is required.
- [ ] A user with only `users.read` and `users.create` (HR) can load the dropdown: no 403.
- [ ] Mobile: a new rep starts a depot draft → `personnelNumber` is prefilled with their SAP code.
- [ ] *(after §3.1)* Editing a rep cannot save a placeholder code.

---

## Appendix: code references

| Concern | File |
|---|---|
| Link rule + lookup query | `backend-server/src/ISI.Application/Features/Users/SalesEmployeeLink/SalesEmployeeLink.cs` |
| Errors | `backend-server/src/ISI.Domain/Modules/Authorization/UserErrors.cs` |
| Endpoint | `backend-server/src/ISI.Api/Controllers/Administration/UsersController.cs` (`GET users/sales-employees`) |
| Depot auto-fill | `backend-server/src/ISI.Application/Features/Customers/SapRegistration/RepresentativeSalesEmployeeResolver.cs` |
| Dropdown | `admin-web-portal/src/features/users/components/sales-employee-select.tsx` |
| Create page | `admin-web-portal/src/app/(portal)/user-management/users/new/page.tsx` |
