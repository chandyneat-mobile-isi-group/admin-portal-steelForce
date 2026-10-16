'use client';

/**
 * Depot Assignment — the standalone bulk-assignment screen.
 *
 * The work itself lives in `DepotAssignmentImportPanel`, because planners reach it two
 * ways: here, and from a dialog on the Assignment Board where they are already looking at
 * who is covering what. One implementation, so the validation rules and the result panel
 * cannot drift between the two.
 */

import { DepotAssignmentImportPanel } from '@/features/depot-assignments/components/import-panel';

export default function DepotAssignmentPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto pb-24 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Depot Assignment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign depots to sales representatives in bulk, by date, from an Excel file.
        </p>
      </div>

      <DepotAssignmentImportPanel />
    </div>
  );
}
