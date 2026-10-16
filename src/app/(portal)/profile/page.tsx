'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
  Lock,
  Key,
  Camera,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { auditRepository, usersRepository } from '@/features/users';
import type { ActivityLog, AppUserWithRelations, LoginHistoryRecord } from '@/domain/entities/user';

const tabs = [
  { id: 'personal', label: 'Personal', icon: CheckCircle2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'devices', label: 'Devices', icon: Smartphone },
];

const NOTIFICATION_TOPICS = ['Order Updates', 'Quotation Approvals', 'Payment Alerts', 'Visit Reminders', 'System Notifications', 'Weekly Reports'];

/** Per-browser preferences (notification and alert toggles). Never required to render. */
const PREFS_KEY = 'steelforce.profile.prefs';
interface Prefs {
  notifications: Record<string, boolean>;
  twoFactor: boolean;
  loginAlerts: boolean;
}
const DEFAULT_PREFS: Prefs = {
  notifications: Object.fromEntries(NOTIFICATION_TOPICS.map((n, i) => [n, i < 4])),
  twoFactor: false,
  loginAlerts: true,
};

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode — the toggle still works for this visit.
  }
}

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '—';

const deviceIcon = (device: string | null) => (device === 'Mobile' ? Smartphone : device === 'Tablet' ? Tablet : Monitor);

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal');
  const { user, permissions: userPermissions, updateUser } = useAuth();

  const [record, setRecord] = useState<AppUserWithRelations | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ next: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<LoginHistoryRecord[]>([]);

  const userId = user?.id;

  const fillForm = useCallback((r: AppUserWithRelations) => {
    const parts = r.full_name.split(' ');
    setForm({ firstName: parts[0] ?? '', lastName: parts.slice(1).join(' '), phone: r.phone ?? '', location: r.address ?? '' });
  }, []);

  const loadAudit = useCallback(async () => {
    if (!userId) return;
    const [logs, logins] = await Promise.all([auditRepository.activityLogs(userId), auditRepository.loginHistory(userId)]);
    setActivity(logs.items.filter((l) => l.user_id === userId).slice(0, 8));
    setSessions(logins.items.filter((s) => s.status === 'success' && !s.logout_time));
  }, [userId]);

  useEffect(() => {
    setPrefs(readPrefs());
    if (!userId) return;
    usersRepository.getById(userId).then((r) => {
      if (!r) return;
      setRecord(r);
      fillForm(r);
    });
    loadAudit();
  }, [userId, fillForm, loadAudit]);

  // A fresh sign-in starts from the default identity; bring back the saved profile.
  useEffect(() => {
    if (!record || !user) return;
    if (record.full_name !== user.name || (record.avatar_url ?? null) !== (user.avatarUrl ?? null)) {
      updateUser({ name: record.full_name, initials: initialsOf(record.full_name), avatarUrl: record.avatar_url });
    }
    // Only when the stored record changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  const dirty = useMemo(() => {
    if (!record) return false;
    return fullName !== record.full_name || form.phone.trim() !== (record.phone ?? '') || form.location.trim() !== (record.address ?? '');
  }, [record, fullName, form.phone, form.location]);

  if (!user) return null;

  const handleSave = async () => {
    if (!fullName) {
      toast.error('First name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await usersRepository.updateMyProfile({
        fullName,
        phoneNumber: form.phone,
        address: form.location,
      });
      const fresh = await usersRepository.getById(updated.id);
      if (fresh) {
        setRecord(fresh);
        fillForm(fresh);
      }
      updateUser({ name: updated.full_name, initials: initialsOf(updated.full_name) });
      toast.success('Profile updated');
      loadAudit();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', { description: 'Please choose an image under 2 MB.' });
      return;
    }
    // Show the picked image straight away; the saved, resized copy replaces it.
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);
    try {
      const updatedProfile = await usersRepository.updateMyProfile({ avatar: file });
      updateUser({ avatarUrl: updatedProfile.avatar_url });
      setRecord((r) => (r ? { ...r, avatar_url: updatedProfile.avatar_url } : r));
      toast.success('Profile picture updated');
      loadAudit();
    } catch {
      toast.error('Failed to update picture');
    } finally {
      setAvatarPreview(null);
      URL.revokeObjectURL(preview);
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const updatedProfile = await usersRepository.updateMyProfile({ removeAvatar: true });
    updateUser({ avatarUrl: updatedProfile.avatar_url });
    setRecord((r) => (r ? { ...r, avatar_url: null } : r));
    toast.success('Profile picture removed');
  };

  const handleChangePassword = async () => {
    if (passwords.next.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await usersRepository.resetPassword(user.id, passwords.next);
      toast.success('Password changed', { description: 'The prototype still signs in with its demo password.' });
      setPasswords({ next: '', confirm: '' });
      setShowPassword(false);
      loadAudit();
    } catch {
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const updatePrefs = (next: Prefs) => {
    setPrefs(next);
    writePrefs(next);
  };

  const handleSignOutDevice = async (session: LoginHistoryRecord) => {
    await auditRepository.revokeSession(session.id);
    toast.success('Device signed out');
    loadAudit();
  };

  const avatarSrc = avatarPreview ?? user.avatarUrl;
  const location = record?.address || 'Phnom Penh, Cambodia';
  const joined = record?.join_date ? format(new Date(record.join_date), 'MMM yyyy') : null;
  const currentSessionId = sessions[0]?.id;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <Card className="p-6 border-gray-100 card-shadow animate-fade-in-up opacity-0 text-center" style={{ borderRadius: '18px', animationFillMode: 'forwards' }}>
          <div className="relative inline-block mb-4 group">
            <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-200 mx-auto overflow-hidden bg-cover bg-center relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user.name}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <span className="text-white text-3xl font-700 z-10" style={{ fontWeight: 700 }}>{user.initials ?? '—'}</span>
              )}
              {uploading && (
                <span className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
                  <Loader2 size={22} className="animate-spin text-white" />
                </span>
              )}
              {/* Hover overlay for camera */}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
                <Camera size={24} className="text-white" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handleAvatar(file);
                  }}
                />
              </label>
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 border-3 border-white z-30" style={{ borderWidth: '3px' }} />
          </div>
          {user.avatarUrl && !uploading && (
            <button onClick={handleRemoveAvatar} className="block mx-auto -mt-2 mb-3 text-[11px] text-gray-400 hover:text-red-500">
              Remove photo
            </button>
          )}
          <h2 className="text-[18px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{user.name}</h2>
          <p className="text-[12px] text-blue-500 font-600 mb-1" style={{ fontWeight: 600 }}>{user.jobTitle || user.role}</p>
          {user.department && <p className="text-[12px] text-gray-400 mb-5">{user.department} Department</p>}

          <div className="space-y-2.5 text-left mt-5">
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <Mail size={14} className="text-blue-500" /> {user.email}
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <Phone size={14} className="text-blue-500" /> {record?.phone || '—'}
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <MapPin size={14} className="text-blue-500" /> {location}
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-gray-500">
              <Calendar size={14} className="text-blue-500" /> {joined ? `Joined ${joined}` : 'Joined recently'}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-50">
            <p className="text-[11px] font-600 text-gray-400 uppercase tracking-wider mb-3 text-left" style={{ fontWeight: 600 }}>Permissions</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {userPermissions.map((p) => (
                <span key={p} className="text-[10px] font-500 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600" style={{ fontWeight: 500 }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Tabbed Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <Card className="border-gray-100 card-shadow animate-fade-in-up opacity-0 overflow-hidden" style={{ borderRadius: '18px', animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-50 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[12px] font-600 whitespace-nowrap transition-all duration-200 relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  style={{ fontWeight: 600 }}
                >
                  <tab.icon size={14} /> {tab.label}
                  {activeTab === tab.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />}
                </button>
              ))}
            </div>
            <div className="p-6">
              {activeTab === 'personal' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'First Name', key: 'firstName' as const },
                      { label: 'Last Name', key: 'lastName' as const },
                      { label: 'Email', value: user.email },
                      { label: 'Phone', key: 'phone' as const },
                      { label: 'Department', value: record?.department?.name || user.department || 'N/A' },
                      { label: 'Role', value: record?.role?.name || user.role },
                      { label: 'Location', key: 'location' as const },
                      { label: 'Employee ID', value: record?.employee_id || user.id },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="text-[11px] text-gray-400 font-500 mb-1.5 block" style={{ fontWeight: 500 }}>{field.label}</label>
                        <input
                          type="text"
                          value={'key' in field && field.key ? form[field.key] : field.value ?? ''}
                          readOnly={!('key' in field && field.key)}
                          onChange={(e) => {
                            if ('key' in field && field.key) setForm((f) => ({ ...f, [field.key!]: e.target.value }));
                          }}
                          className={`w-full h-10 px-3.5 rounded-xl border border-gray-100 text-[13px] focus:outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all ${
                            'key' in field && field.key ? 'bg-gray-50 text-gray-700' : 'bg-gray-50/60 text-gray-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    className="rounded-xl gradient-primary text-white border-0 mt-2"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                  >
                    {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                    Save Changes
                  </Button>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4 animate-fade-in">
                  {[
                    {
                      icon: Lock,
                      title: 'Change Password',
                      desc: record?.last_password_change
                        ? `Last changed ${formatDistanceToNow(new Date(record.last_password_change), { addSuffix: true })}`
                        : 'Update your account password',
                      action: showPassword ? 'Cancel' : 'Update',
                      onClick: () => setShowPassword((v) => !v),
                    },
                    {
                      icon: Key,
                      title: 'Two-Factor Authentication',
                      desc: prefs.twoFactor ? 'Codes from your authenticator app are required' : 'Add an extra layer of security',
                      action: prefs.twoFactor ? 'Disable' : 'Enable',
                      onClick: () => {
                        updatePrefs({ ...prefs, twoFactor: !prefs.twoFactor });
                        toast.success(prefs.twoFactor ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled');
                      },
                    },
                    {
                      icon: Shield,
                      title: 'Login Alerts',
                      desc: 'Get notified on new device logins',
                      action: prefs.loginAlerts ? 'On' : 'Off',
                      onClick: () => updatePrefs({ ...prefs, loginAlerts: !prefs.loginAlerts }),
                    },
                  ].map((item) => (
                    <div key={item.title} className="p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <item.icon size={18} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-600 text-gray-900" style={{ fontWeight: 600 }}>{item.title}</p>
                            <p className="text-[11px] text-gray-400">{item.desc}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={item.onClick}>{item.action}</Button>
                      </div>
                      {item.title === 'Change Password' && showPassword && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                          {([
                            { key: 'next', label: 'New password' },
                            { key: 'confirm', label: 'Confirm password' },
                          ] as const).map((f) => (
                            <div key={f.key}>
                              <label className="text-[11px] text-gray-400 font-500 mb-1.5 block" style={{ fontWeight: 500 }}>{f.label}</label>
                              <input
                                type="password"
                                value={passwords[f.key]}
                                onChange={(e) => setPasswords((p) => ({ ...p, [f.key]: e.target.value }))}
                                className="w-full h-10 px-3.5 rounded-xl bg-white border border-gray-100 text-[13px] text-gray-700 focus:outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
                              />
                            </div>
                          ))}
                          <Button className="rounded-xl gradient-primary text-white border-0 h-10" onClick={handleChangePassword} disabled={changingPassword}>
                            {changingPassword ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-3 animate-fade-in">
                  {NOTIFICATION_TOPICS.map((n) => {
                    const on = prefs.notifications[n] ?? false;
                    return (
                      <div key={n} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50">
                        <span className="text-[13px] font-500 text-gray-700" style={{ fontWeight: 500 }}>{n}</span>
                        <button
                          role="switch"
                          aria-checked={on}
                          aria-label={n}
                          onClick={() => updatePrefs({ ...prefs, notifications: { ...prefs.notifications, [n]: !on } })}
                          className={`w-11 h-6 rounded-full transition-all duration-200 ${on ? 'gradient-primary' : 'bg-gray-200'}`}
                        >
                          <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3 animate-fade-in">
                  {activity.length === 0 && <p className="text-[12px] text-gray-400">No recent activity.</p>}
                  {activity.map((a) => {
                    const Icon = a.action.includes('Password') ? Lock : a.action === 'Login' ? Monitor : a.status === 'success' ? CheckCircle2 : Activity;
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Icon size={15} className="text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-500 text-gray-700" style={{ fontWeight: 500 }}>
                            {a.action}
                            {a.device ? <span className="text-gray-400"> · {a.device}</span> : null}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'devices' && (
                <div className="space-y-3 animate-fade-in">
                  {sessions.length === 0 && <p className="text-[12px] text-gray-400">No other signed-in devices.</p>}
                  {sessions.map((d) => {
                    const current = d.id === currentSessionId;
                    const Icon = deviceIcon(d.device);
                    return (
                      <div key={d.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${current ? 'bg-green-50' : 'bg-gray-100'}`}>
                            <Icon size={18} className={current ? 'text-green-500' : 'text-gray-400'} />
                          </div>
                          <div>
                            <p className="text-[13px] font-600 text-gray-900" style={{ fontWeight: 600 }}>
                              {d.browser} · {d.os}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {d.location} · {current ? 'Active now' : formatDistanceToNow(new Date(d.login_time), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {current ? (
                          <span className="text-[10px] font-600 px-2.5 py-1 rounded-lg bg-green-50 text-green-600" style={{ fontWeight: 600 }}>Current</span>
                        ) : (
                          <button onClick={() => handleSignOutDevice(d)} className="text-[11px] text-red-500 font-600 hover:text-red-600" style={{ fontWeight: 600 }}>Sign out</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
