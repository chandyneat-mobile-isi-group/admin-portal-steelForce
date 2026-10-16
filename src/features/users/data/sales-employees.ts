import { salesReps } from '@/features/planning/data/demo-data';
import { repPersonnelNumber } from './mock-data';

/**
 * Offline stand-in for SAP's synchronised sales-employee register.
 *
 * The first eighteen field reps are linked to their own personnel numbers; the rest of
 * the register is people SAP knows about who have no portal account yet (so the
 * wizard has someone to link a new rep to), plus a few leavers. Read-only — SAP owns it.
 */
export interface SapSalesEmployee {
  personnelNumber: string;
  fullName: string | null;
  isActive: boolean;
  deactivatedAt: string | null;
  synchronisedAt: string | null;
}

const UNLINKED_NAMES = [
  'CHEA SAMNANG', 'KIM SOPHEAP', 'LY VEASNA', 'MENG LEAKHENA', 'SAM KOSAL', 'VANN NARY',
  'BUN MAKARA', 'SIN PHALLA', 'NOU SOTHY', 'RITH CHHAYA', 'SAR DAVI', 'THY SINA',
  'MAO RATANA', 'OUK VICHEA', 'UNG SOKHA', 'PICH SREYMOM', 'KEO BOPHA', 'ROS VIBOL',
  'TEP KANHA', 'YIM DARA', 'SENG RITHY', 'PRAK MALIS', 'HENG PISETH', 'CHAN NARY',
  'SOK LEAKHENA', 'LIM SOVANN', 'NHEM VEASNA', 'KIM CHANTHA', 'MEAS SOPHEAK', 'LY KOSAL',
  'CHEA SREYNEANG', 'VANN RATANA', 'BUN SINA', 'SAM PHALLA', 'MENG DAVI', 'NOU MAKARA',
  'OUK SAMNANG', 'SIN CHHAYA', 'THY VICHEA', 'RITH SOTHY',
];

/** Leavers SAP still sends, so old customer records resolve to a name. */
const FORMER = new Set([5, 14, 23, 31, 38]);

let cache: SapSalesEmployee[] | null = null;

export function sapSalesEmployees(): readonly SapSalesEmployee[] {
  if (cache) return cache;
  const now = Date.now();
  const synced = new Date(now - 6 * 3_600_000).toISOString();

  const linked: SapSalesEmployee[] = salesReps
    .map((rep, i) => ({ rep, number: repPersonnelNumber(i) }))
    .filter((row): row is { rep: (typeof salesReps)[number]; number: string } => row.number !== null)
    .map(({ rep, number }) => ({
      personnelNumber: number,
      fullName: rep.name.toUpperCase(),
      isActive: true,
      deactivatedAt: null,
      synchronisedAt: synced,
    }));

  const others: SapSalesEmployee[] = UNLINKED_NAMES.map((fullName, k) => ({
    personnelNumber: String(102000 + k * 17),
    fullName,
    isActive: !FORMER.has(k),
    deactivatedAt: FORMER.has(k) ? new Date(now - (60 + k * 9) * 86_400_000).toISOString() : null,
    synchronisedAt: synced,
  }));

  cache = [...linked, ...others];
  return cache;
}

/** Whether `code` is a current SAP sales employee. */
export function isActiveSalesEmployee(code: string | null | undefined): boolean {
  const trimmed = code?.trim();
  return Boolean(trimmed) && sapSalesEmployees().some((e) => e.isActive && e.personnelNumber === trimmed);
}
