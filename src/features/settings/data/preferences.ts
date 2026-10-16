import { createPersistentStore } from '@/services/mock';

/**
 * Settings → everything except the account profile (which belongs to the users
 * repository) and layout/theme (which have their own persisted providers).
 *
 * Persisted per browser, so a saved preference survives a refresh; Settings →
 * Reset demo data restores these defaults with every other collection.
 */
export interface PortalPreferences {
  contact: { phone: string; email: string };
  notifications: {
    email: boolean;
    visitReminders: boolean;
    followUps: boolean;
    quotations: boolean;
    approvals: boolean;
    reports: boolean;
  };
  density: 'compact' | 'comfortable';
  regional: {
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
  };
  sales: { discount: string; customerView: string; productView: string; territory: string };
  field: {
    gpsAccuracy: string;
    checkInRadius: string;
    visitReminder: string;
    requirePhoto: boolean;
    requireLocation: boolean;
  };
  system: {
    organisation: string;
    tradingName: string;
    fiscalYearStart: string;
    approvalThreshold: string;
    enforceSso: boolean;
    auditLogging: boolean;
  };
  /** Session ids revoked from Settings → Security. */
  revokedSessions: string[];
}

export function defaultPreferences(): PortalPreferences {
  return {
    contact: { phone: '+855 12 884 220', email: '' },
    notifications: { email: true, visitReminders: true, followUps: true, quotations: true, approvals: true, reports: false },
    density: 'comfortable',
    regional: {
      language: 'English',
      currency: 'USD',
      timezone: 'Asia/Phnom_Penh (ICT)',
      dateFormat: 'DD MMM YYYY',
      numberFormat: '1,234.56',
    },
    sales: { discount: '5', customerView: 'Table', productView: 'Grid', territory: 'Team Alpha' },
    field: {
      gpsAccuracy: 'High (±10 m)',
      checkInRadius: '1000',
      visitReminder: '30',
      requirePhoto: true,
      requireLocation: true,
    },
    system: {
      organisation: 'ISI Group',
      tradingName: 'SteelForce',
      fiscalYearStart: 'January',
      approvalThreshold: '50000',
      enforceSso: false,
      auditLogging: true,
    },
    revokedSessions: [],
  };
}

export const preferencesStore = createPersistentStore<PortalPreferences>('settings.preferences', defaultPreferences);
