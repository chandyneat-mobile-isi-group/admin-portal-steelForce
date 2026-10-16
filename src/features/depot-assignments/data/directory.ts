import { crmDepots, type CrmDepot } from '@/features/depots/data/crm';
import { salesReps } from '@/features/planning/data/demo-data';
import type { SalesRep } from '@/features/planning/types';
import type { ImportHistoryEntry } from '../history';

/**
 * Who and what an assignment file may name, for the static prototype.
 *
 * Built over the planning module's representatives and the CRM depot master, so a code
 * that validates here is the same representative and depot the board and the depot
 * screens show. Representatives are referenced by employee id (`ISI-1040`), depots by
 * their SAP customer code (`C010450`) — what the real template carried.
 */

/** Region codes as they appear in the template's Region column. */
export const REGION_CODES: Record<string, string> = {
  'Phnom Penh': 'PP',
  Kandal: 'KD',
  Battambang: 'BB',
  'Siem Reap': 'SR',
  'Kampong Speu': 'KS',
};

export const repsByCode: Map<string, SalesRep> = new Map(
  salesReps.flatMap((r) => [
    [r.employeeId.toUpperCase(), r],
    [r.id.toUpperCase(), r],
  ])
);

export const depotsByCode: Map<string, CrmDepot> = new Map(
  crmDepots.flatMap((d) => [
    [d.code.toUpperCase(), d],
    [d.id.toUpperCase(), d],
  ])
);

/** Uploads made before this browser session, so the history screen starts with context. */
export const seedHistory: ImportHistoryEntry[] = [
  {
    id: 'IMP-2026-0931',
    at: '2026-10-13T02:42:00.000Z',
    fileName: 'PP_depot_calls_wk42.csv',
    fileSize: 18_644,
    uploadedBy: 'Sok Dara',
    outcome: 'Imported',
    totalRows: 186,
    successfulRows: 186,
    failedRows: 0,
    routesCreated: 41,
    stopsCreated: 186,
  },
  {
    id: 'IMP-2026-0930',
    at: '2026-10-13T02:18:00.000Z',
    fileName: 'PP_depot_calls_wk42.csv',
    fileSize: 18_702,
    uploadedBy: 'Sok Dara',
    outcome: 'Refused',
    totalRows: 187,
    successfulRows: 181,
    failedRows: 6,
    routesCreated: 0,
    stopsCreated: 0,
  },
  {
    id: 'IMP-2026-0927',
    at: '2026-10-09T09:05:00.000Z',
    fileName: 'Battambang_SiemReap_Oct.xlsx',
    fileSize: 24_310,
    uploadedBy: 'Chan Sopheak',
    outcome: 'Imported',
    totalRows: 64,
    successfulRows: 64,
    failedRows: 0,
    routesCreated: 18,
    stopsCreated: 64,
  },
  {
    id: 'IMP-2026-0922',
    at: '2026-10-06T01:55:00.000Z',
    fileName: 'Kandal_route_plan_wk41.xlsx',
    fileSize: 9_870,
    uploadedBy: 'Heng Kanha',
    outcome: 'Failed',
    totalRows: 0,
    successfulRows: 0,
    failedRows: 0,
    routesCreated: 0,
    stopsCreated: 0,
    message: 'The file has no data rows under the header.',
  },
  {
    id: 'IMP-2026-0918',
    at: '2026-10-05T03:20:00.000Z',
    fileName: 'PP_depot_calls_wk41.csv',
    fileSize: 17_215,
    uploadedBy: 'Sok Dara',
    outcome: 'Imported',
    totalRows: 172,
    successfulRows: 172,
    failedRows: 0,
    routesCreated: 39,
    stopsCreated: 172,
  },
];
