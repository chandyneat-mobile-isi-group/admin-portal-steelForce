'use client';

import { PageBody } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { MetaPill, StatusPill } from '@/components/shared/status-pill';
import { ConfirmDialog } from '@/components/feedback/feedback';
import {
  SegmentedField,
  SelectField,
  TextField,
  ToggleField,
} from '@/components/forms/form';
import { PermissionGuard } from '@/features/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { roleMetaFor } from '@/lib/permissions';
import { formatDate } from '@/lib/formatting';
import { TEAMS } from '@/features/planning';
import { motion } from 'framer-motion';
import {
  Bell,
  Building2,
  DatabaseZap,
  Globe,
  KeyRound,
  Laptop,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Route,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  TrendingUp,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { LAYOUT_OPTIONS } from '@/config/layouts';
import { useLayout } from '@/lib/layout/layout-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { resetMockData } from '@/services/mock';
import { defaultPreferences, preferencesStore, type PortalPreferences } from '@/features/settings';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Categorised settings.
 *
 * A left rail of sections with one panel at a time, rather than a single long
 * scroll — a settings page that requires scrolling past six unrelated groups to
 * change one toggle is the failure mode the brief warns about.
 */
const SECTIONS = [
  { id: 'account', label: 'Account', icon: User, description: 'Your profile and contact details' },
  { id: 'security', label: 'Security', icon: KeyRound, description: 'Password, sessions and sign-in activity' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'What the portal tells you about' },
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and interface density' },
  { id: 'regional', label: 'Regional', icon: Globe, description: 'Language, currency and formats' },
  { id: 'sales', label: 'Sales preferences', icon: TrendingUp, description: 'Defaults for quoting and browsing' },
  { id: 'field', label: 'Field operations', icon: Route, description: 'Check-in rules for the field app' },
  { id: 'system', label: 'System', icon: ShieldCheck, description: 'Organisation-wide configuration', admin: true },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const SESSIONS = [
  { id: 'S1', device: 'Chrome · Windows', location: 'Phnom Penh, KH', lastActive: 'Active now', current: true, icon: Monitor },
  { id: 'S2', device: 'Safari · iPhone 15', location: 'Phnom Penh, KH', lastActive: '2 hours ago', current: false, icon: Smartphone },
  { id: 'S3', device: 'Edge · Windows', location: 'Siem Reap, KH', lastActive: '3 days ago', current: false, icon: Laptop },
];

const LOGIN_HISTORY = [
  { id: 'L1', date: '2026-08-07', time: '08:12', device: 'Chrome · Windows', result: 'Success' },
  { id: 'L2', date: '2026-08-06', time: '17:44', device: 'Safari · iPhone', result: 'Success' },
  { id: 'L3', date: '2026-08-06', time: '08:03', device: 'Chrome · Windows', result: 'Success' },
  { id: 'L4', date: '2026-08-05', time: '21:19', device: 'Unknown · Linux', result: 'Failed' },
];

export default function SettingsPage() {
  const { user, role, signOut, updateUser } = useAuth();
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { layout, setLayout } = useLayout();
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<SectionId>('account');
  const [dirty, setDirty] = useState(false);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);

  useEffect(() => setMounted(true), []);

  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<{
    name: string;
    email: string;
    phone: string;
    department: string;
    jobTitle: string;
    avatar?: File;
    removeAvatar?: boolean;
    avatarUrl?: string;
  }>({
    name: '',
    email: '',
    phone: '+855 12 884 220',
    department: '',
    jobTitle: '',
  });

  // Seed the form from the session once it resolves.
  useEffect(() => {
    if (user) {
      setAccount((p) => ({
        ...p,
        name: user.name,
        email: user.email,
        department: user.department || '',
        jobTitle: user.jobTitle || '',
      }));
    }
  }, [user]);

  const [notifications, setNotifications] = useState(defaultPreferences().notifications);
  const [density, setDensity] = useState<string>(defaultPreferences().density);
  const [regional, setRegional] = useState(defaultPreferences().regional);
  const [sales, setSales] = useState(defaultPreferences().sales);
  const [field, setField] = useState(defaultPreferences().field);
  const [system, setSystem] = useState(defaultPreferences().system);
  const [revoked, setRevoked] = useState<string[]>([]);
  const [accountDirty, setAccountDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState({ current: '', next: '' });
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string }>({});
  const [confirmReset, setConfirmReset] = useState(false);

  // Saved preferences live in the browser (see `features/settings`); load them once mounted.
  useEffect(() => {
    const saved = preferencesStore.get();
    setNotifications(saved.notifications);
    setDensity(saved.density);
    setRegional(saved.regional);
    setSales(saved.sales);
    setField(saved.field);
    setSystem(saved.system);
    setRevoked(saved.revokedSessions);
    setAccount((p) => ({ ...p, phone: saved.contact.phone || p.phone }));
    // Read once; later changes are this form's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The language select mirrors the active locale (it can also change from the header).
  useEffect(() => {
    setRegional((p) => ({ ...p, language: locale === 'km' ? 'ភាសាខ្មែរ (Khmer)' : 'English' }));
  }, [locale]);

  const touch = () => setDirty(true);
  const touchAccount = () => {
    setAccountDirty(true);
    setDirty(true);
  };

  /** Field errors keyed `section.field`, with the section each belongs to. */
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
    if (account.name.trim().length < 2) e['account.name'] = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(account.email.trim())) e['account.email'] = 'Enter a valid email address.';
    if (account.phone.trim() && !/^\+?[0-9][0-9 ]{7,15}$/.test(account.phone.trim())) e['account.phone'] = 'Use digits and spaces, e.g. +855 12 884 220.';
    const discount = Number(sales.discount);
    if (sales.discount.trim() === '' || Number.isNaN(discount) || discount < 0 || discount > 25) e['sales.discount'] = 'Between 0 and 25%.';
    const radius = int(field.checkInRadius);
    if (Number.isNaN(radius) || radius < 50 || radius > 5000) e['field.checkInRadius'] = 'Whole metres between 50 and 5000.';
    const reminder = int(field.visitReminder);
    if (Number.isNaN(reminder) || reminder > 240) e['field.visitReminder'] = 'Whole minutes between 0 and 240.';
    if (!system.organisation.trim()) e['system.organisation'] = 'Organisation name is required.';
    if (!system.tradingName.trim()) e['system.tradingName'] = 'Trading name is required.';
    const threshold = int(system.approvalThreshold);
    if (Number.isNaN(threshold) || threshold < 1000 || threshold > 10_000_000) e['system.approvalThreshold'] = 'Whole dollars between 1,000 and 10,000,000.';
    return e;
  };

  const save = async () => {
    const found = validate();
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length) {
      // Show the first section with a problem rather than an error the user cannot see.
      setSection(keys[0].split('.')[0] as SectionId);
      toast.error('Some settings need attention', { description: Object.values(found)[0] });
      return;
    }

    setSaving(true);
    try {
      if (accountDirty) {
        const { usersRepository } = await import('@/features/users/repositories');
        const updatedProfile = await usersRepository.updateMyProfile({
          fullName: account.name,
          jobTitle: account.jobTitle,
          phoneNumber: account.phone,
          avatar: account.avatar,
          removeAvatar: account.removeAvatar,
        });

        updateUser({
          name: updatedProfile.full_name,
          jobTitle: updatedProfile.position || '',
          avatarUrl: updatedProfile.avatar_url,
        });
      }

      preferencesStore.update((p) => ({
        ...p,
        contact: { phone: account.phone.trim(), email: account.email.trim() },
        notifications,
        density: density as PortalPreferences['density'],
        regional,
        sales,
        field,
        system,
      }));
      const nextLocale = regional.language.startsWith('English') ? 'en' : 'km';
      if (nextLocale !== locale) setLocale(nextLocale);

      toast.success(accountDirty ? 'Profile and settings saved' : 'Settings saved', {
        description: 'Your changes have been saved on this device.',
      });
      setDirty(false);
      setAccountDirty(false);
    } catch (err) {
      toast.error('Failed to save profile', { description: 'Please check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = () => {
    const e: { current?: string; next?: string } = {};
    if (!password.current) e.current = 'Enter your current password.';
    if (password.next.length < 10) e.next = 'Use at least 10 characters.';
    else if (!/[A-Za-z]/.test(password.next) || !/\d/.test(password.next)) e.next = 'Include at least one letter and one number.';
    else if (password.next === password.current) e.next = 'Choose a password different from the current one.';
    setPasswordErrors(e);
    if (e.current || e.next) return;
    setPassword({ current: '', next: '' });
    toast.success('Password updated', { description: 'Use the new password next time you sign in.' });
  };

  const revokeSession = (id: string, device: string) => {
    const next = [...revoked, id];
    setRevoked(next);
    preferencesStore.update((p) => ({ ...p, revokedSessions: next }));
    toast.success('Session revoked', { description: device });
  };

  const err = (key: string) => errors[key];

  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <PageBody>
      <PageHeader
        title="Settings"
        subtitle="Your account, preferences and — for administrators — organisation-wide configuration."
        meta={
          role ? (
            <>
              <MetaPill label={user?.email ?? ''} />
              <StatusPill label={roleMetaFor(role).label} tone="info" />
            </>
          ) : null
        }
        actions={
          <ActionButton icon={Save} tone="primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </ActionButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">
        {/* Section rail */}
        <nav aria-label="Settings sections" className="rounded-card border border-surface bg-card p-2">
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              const item = (
                <li key={s.id}>
                  <button
                    onClick={() => setSection(s.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      active ? 'bg-primary/10' : 'hover:bg-accent/50'
                    }`}
                  >
                    <s.icon
                      size={15}
                      className={`mt-0.5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-[12.5px] font-semibold truncate ${
                          active ? 'text-primary' : 'text-main'
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="block text-[10.5px] text-muted-foreground leading-snug">
                        {s.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
              // System settings only exist for roles that may change them.
              return 'admin' in s && s.admin ? (
                <PermissionGuard key={s.id} permission="settings.manage">
                  {item}
                </PermissionGuard>
              ) : (
                item
              );
            })}
          </ul>
        </nav>

        {/* Panel */}
        <motion.section
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="rounded-card border border-surface bg-card p-6"
        >
          <header className="flex items-start gap-3 mb-5 pb-5 border-b border-surface">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <current.icon size={17} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-main">{current.label}</h2>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">{current.description}</p>
            </div>
          </header>

          {section === 'account' && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <span className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 bg-cover bg-center overflow-hidden relative">
                  {account.avatarUrl || user?.avatarUrl ? (
                    <img 
                      src={account.avatarUrl || user?.avatarUrl || undefined} 
                      alt="" 
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  ) : (
                    <span className="text-white text-[20px] font-bold z-10">{user?.initials ?? '—'}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-main">{account.name || user?.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{account.jobTitle || user?.jobTitle}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      className="hidden" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('File too large', { description: 'Please choose an image under 2 MB.' });
                          return;
                        }
                        setAccount(p => ({ ...p, avatar: file, avatarUrl: URL.createObjectURL(file), removeAvatar: false }));
                        touchAccount();
                      }}
                    />
                    <ActionButton onClick={() => document.getElementById('avatar-upload')?.click()}>
                      Change photo
                    </ActionButton>
                    {(account.avatarUrl || user?.avatarUrl) && (
                      <button 
                        type="button"
                        onClick={() => {
                          setAccount(p => ({ ...p, avatar: undefined, avatarUrl: undefined, removeAvatar: true }));
                          touchAccount();
                        }}
                        className="text-[12px] font-medium text-critical hover:underline px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Full name" required value={account.name} error={err('account.name')} onChange={(v) => { setAccount((p) => ({ ...p, name: v })); touchAccount(); }} />
                <TextField label="Email" type="email" required value={account.email} error={err('account.email')} onChange={(v) => { setAccount((p) => ({ ...p, email: v })); touch(); }} />
                <TextField label="Phone" type="tel" value={account.phone} error={err('account.phone')} onChange={(v) => { setAccount((p) => ({ ...p, phone: v })); touchAccount(); }} />
                <TextField label="Job Title" value={account.jobTitle} onChange={(v) => { setAccount((p) => ({ ...p, jobTitle: v })); touchAccount(); }} />
                <TextField label="Role" value={role ? roleMetaFor(role).label : ''} onChange={() => undefined} disabled hint="Roles are managed in User Management" full />
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[12.5px] font-semibold text-main mb-3">Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label="Current password" type="password" value={password.current} error={passwordErrors.current} onChange={(v) => setPassword((p) => ({ ...p, current: v }))} placeholder="••••••••" />
                  <TextField label="New password" type="password" value={password.next} error={passwordErrors.next} onChange={(v) => setPassword((p) => ({ ...p, next: v }))} placeholder="At least 10 characters" hint="Letters and numbers, 10+ characters" />
                </div>
                <div className="mt-3">
                  <ActionButton icon={KeyRound} onClick={updatePassword}>
                    Update password
                  </ActionButton>
                </div>
              </div>

              <div className="pt-5 border-t border-surface">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-[12.5px] font-semibold text-main">Two-factor authentication</h3>
                  <StatusPill label="Not configured" tone="warning" />
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Two-factor authentication is not available in this build. When enabled it will
                  require a code from an authenticator app at every sign-in.
                </p>
              </div>

              <div className="pt-5 border-t border-surface">
                <h3 className="text-[12.5px] font-semibold text-main mb-3">Active sessions</h3>
                <div className="space-y-2">
                  {SESSIONS.filter((s) => !revoked.includes(s.id)).map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-card border border-surface">
                      <s.icon size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-main truncate">{s.device}</p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {s.location} · {s.lastActive}
                        </p>
                      </div>
                      {s.current ? (
                        <StatusPill label="This device" tone="positive" />
                      ) : (
                        <ActionButton onClick={() => revokeSession(s.id, s.device)}>
                          Revoke
                        </ActionButton>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <ActionButton icon={LogOut} tone="danger" onClick={() => setConfirmSignOutAll(true)}>
                    Sign out everywhere
                  </ActionButton>
                </div>
              </div>

              <div className="pt-5 border-t border-surface">
                <h3 className="text-[12.5px] font-semibold text-main mb-3">Login activity</h3>
                <div className="rounded-card border border-surface overflow-hidden">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr className="bg-muted/30 border-b border-surface">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Device</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LOGIN_HISTORY.map((l) => (
                        <tr key={l.id} className="border-b border-surface last:border-0">
                          <td className="px-3 py-2 text-main">
                            {formatDate(l.date)} · {l.time}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{l.device}</td>
                          <td className="px-3 py-2 text-right">
                            <StatusPill
                              size="sm"
                              label={l.result}
                              tone={l.result === 'Success' ? 'positive' : 'critical'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div>
              <ToggleField label="Email notifications" description="Send a daily digest to your inbox." checked={notifications.email} onChange={(v) => { setNotifications((p) => ({ ...p, email: v })); touch(); }} />
              <ToggleField label="Visit reminders" description="Notify before each scheduled visit." checked={notifications.visitReminders} onChange={(v) => { setNotifications((p) => ({ ...p, visitReminders: v })); touch(); }} />
              <ToggleField label="Follow-up reminders" description="Alert when a customer follow-up falls due." checked={notifications.followUps} onChange={(v) => { setNotifications((p) => ({ ...p, followUps: v })); touch(); }} />
              <ToggleField label="Quotation notifications" description="When a quotation is viewed, accepted or expires." checked={notifications.quotations} onChange={(v) => { setNotifications((p) => ({ ...p, quotations: v })); touch(); }} />
              <ToggleField label="Approval notifications" description="Credit limits and discounts awaiting your approval." checked={notifications.approvals} onChange={(v) => { setNotifications((p) => ({ ...p, approvals: v })); touch(); }} />
              <ToggleField label="Report notifications" description="Weekly performance summary every Monday." checked={notifications.reports} onChange={(v) => { setNotifications((p) => ({ ...p, reports: v })); touch(); }} />
            </div>
          )}

          {section === 'appearance' && (
            <div>
              {/* The header switcher is the fast path; this is where someone
                  looks when they don't know the feature exists. Both write the
                  same preference — there is one source of truth. */}
              <SegmentedField
                label="Workspace layout"
                description="How navigation and the workspace are arranged. Applies everywhere, and persists."
                value={layout}
                onChange={(v) => {
                  setLayout(v as typeof layout);
                  toast.success('Layout updated');
                }}
                options={LAYOUT_OPTIONS.map((option) => ({
                  value: option.id,
                  label: option.label,
                  icon: option.icon,
                }))}
              />
              <SegmentedField
                label="Theme"
                description="Light, dark, or follow your operating system."
                value={mounted ? theme ?? 'system' : 'system'}
                onChange={(v) => {
                  setTheme(v);
                  toast.success('Theme updated');
                }}
                options={[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ]}
              />
              <SegmentedField
                label="Interface density"
                description="Compact fits more rows on screen; comfortable is easier over a long shift."
                value={density}
                onChange={(v) => {
                  setDensity(v);
                  touch();
                }}
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'comfortable', label: 'Comfortable' },
                ]}
              />
            </div>
          )}

          {section === 'regional' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Language" value={regional.language} onChange={(v) => { setRegional((p) => ({ ...p, language: v })); touch(); }} options={['English', 'ភាសាខ្មែរ (Khmer)']} />
              <SelectField label="Currency" value={regional.currency} onChange={(v) => { setRegional((p) => ({ ...p, currency: v })); touch(); }} options={['USD', 'KHR']} />
              <SelectField label="Timezone" value={regional.timezone} onChange={(v) => { setRegional((p) => ({ ...p, timezone: v })); touch(); }} options={['Asia/Phnom_Penh (ICT)', 'Asia/Bangkok (ICT)', 'UTC']} />
              <SelectField label="Date format" value={regional.dateFormat} onChange={(v) => { setRegional((p) => ({ ...p, dateFormat: v })); touch(); }} options={['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} />
              <SelectField label="Number format" value={regional.numberFormat} onChange={(v) => { setRegional((p) => ({ ...p, numberFormat: v })); touch(); }} options={['1,234.56', '1.234,56', '1 234.56']} full />
            </div>
          )}

          {section === 'sales' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Default discount" value={sales.discount} error={err('sales.discount')} onChange={(v) => { setSales((p) => ({ ...p, discount: v })); touch(); }} prefix="%" hint="Applied to new quotation lines" />
              <SelectField label="Default sales territory" value={sales.territory} onChange={(v) => { setSales((p) => ({ ...p, territory: v })); touch(); }} options={TEAMS} />
              <SelectField label="Default customer view" value={sales.customerView} onChange={(v) => { setSales((p) => ({ ...p, customerView: v })); touch(); }} options={['Table', 'Cards']} />
              <SelectField label="Default product view" value={sales.productView} onChange={(v) => { setSales((p) => ({ ...p, productView: v })); touch(); }} options={['Grid', 'List']} />
            </div>
          )}

          {section === 'field' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="GPS accuracy" value={field.gpsAccuracy} onChange={(v) => { setField((p) => ({ ...p, gpsAccuracy: v })); touch(); }} options={['High (±10 m)', 'Balanced (±50 m)', 'Low power (±200 m)']} />
                <TextField label="Check-in radius" value={field.checkInRadius} error={err('field.checkInRadius')} onChange={(v) => { setField((p) => ({ ...p, checkInRadius: v })); touch(); }} hint="Metres from the customer location" />
                <TextField label="Visit reminder" value={field.visitReminder} error={err('field.visitReminder')} onChange={(v) => { setField((p) => ({ ...p, visitReminder: v })); touch(); }} hint="Minutes before a scheduled visit" full />
              </div>
              <div className="pt-2">
                <ToggleField label="Require a photo at check-out" description="Reps must attach at least one photo before completing a visit." checked={field.requirePhoto} onChange={(v) => { setField((p) => ({ ...p, requirePhoto: v })); touch(); }} />
                <ToggleField label="Require location for check-in" description="Block check-in when GPS is unavailable or outside the radius." checked={field.requireLocation} onChange={(v) => { setField((p) => ({ ...p, requireLocation: v })); touch(); }} />
              </div>
            </div>
          )}

          {section === 'system' && (
            <PermissionGuard
              permission="settings.manage"
              fallback={
                <div className="flex items-start gap-2.5 p-4 rounded-card bg-amber-500/10 border border-amber-500/20">
                  <ShieldCheck size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    System settings are restricted to administrators. Ask an administrator if you
                    need a change here.
                  </p>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label="Organisation name" required value={system.organisation} error={err('system.organisation')} onChange={(v) => { setSystem((p) => ({ ...p, organisation: v })); touch(); }} />
                  <TextField label="Trading name" required value={system.tradingName} error={err('system.tradingName')} onChange={(v) => { setSystem((p) => ({ ...p, tradingName: v })); touch(); }} />
                  <SelectField label="Fiscal year start" value={system.fiscalYearStart} onChange={(v) => { setSystem((p) => ({ ...p, fiscalYearStart: v })); touch(); }} options={['January', 'April', 'July', 'October']} />
                  <TextField label="Approval threshold" value={system.approvalThreshold} error={err('system.approvalThreshold')} onChange={(v) => { setSystem((p) => ({ ...p, approvalThreshold: v })); touch(); }} prefix="$" hint="Credit limits above this route for approval" />
                </div>
                <div className="pt-2">
                  <ToggleField label="Enforce single sign-on" description="Require corporate SSO for every portal user." checked={system.enforceSso} onChange={(v) => { setSystem((p) => ({ ...p, enforceSso: v })); touch(); }} />
                  <ToggleField label="Audit logging" description="Record every create, update and delete against a user." checked={system.auditLogging} onChange={(v) => { setSystem((p) => ({ ...p, auditLogging: v })); touch(); }} />
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-card bg-muted/40 border border-surface">
                  <Building2 size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    Sales organisations, divisions and territories are configured in User
                    Management, where they can be assigned to roles at the same time.
                  </p>
                </div>
                <div className="pt-5 border-t border-surface">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-[12.5px] font-semibold text-main">Demo data</h3>
                    <StatusPill label="Prototype" tone="info" />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-3">
                    Orders, quotations, notifications, preferences and every other record you have
                    created, edited or deleted in this browser are stored locally. Resetting restores
                    the original demo data and reloads the portal.
                  </p>
                  <ActionButton icon={DatabaseZap} tone="danger" onClick={() => setConfirmReset(true)}>
                    Reset demo data
                  </ActionButton>
                </div>
              </div>
            </PermissionGuard>
          )}
        </motion.section>
      </div>

      <ConfirmDialog
        open={confirmSignOutAll}
        title="Sign out of every device?"
        body="All active sessions will end, including this one. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        onCancel={() => setConfirmSignOutAll(false)}
        onConfirm={async () => {
          setConfirmSignOutAll(false);
          await signOut();
          toast.success('Signed out of all devices');
          router.replace('/login');
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset all demo data?"
        body="Every change made in this browser — orders, quotations, notifications, settings and other records — will be discarded and the original demo data restored. The page will reload."
        confirmLabel="Reset demo data"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetMockData();
          toast.success('Demo data reset', { description: 'Reloading…' });
          setTimeout(() => window.location.reload(), 400);
        }}
      />
    </PageBody>
  );
}
