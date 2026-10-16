'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Pencil,
  KeyRound,
  Power,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  User,
  Shield,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  LogOut,
  X,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { isApiError } from '@/domain/errors/api-error';
import {
  SalesEmployeeSelect,
  hasRepresentativeRole,
  looksUnlinked,
  userSaveErrorMessage,
  usersRepository,
} from '@/features/users';
import type { AppUserWithRelations } from '@/domain/entities/user';

const statusStyles: Record<string, string> = {
  active: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  disabled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  locked: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
};

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const [user, setUser] = useState<AppUserWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialogs state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    employeeCode: '',
    jobTitle: '',
    department: '',
    territoryCode: '',
    depotCode: '',
    roles: [] as string[],
  });

  const [salesEmployeeName, setSalesEmployeeName] = useState<string | null>(null);
  /**
   * Whether this rep's code resolves to a current SAP sales employee. `unknown` when the
   * lookup failed — not shown as a warning, because nothing is known to be wrong.
   */
  const [sapLink, setSapLink] = useState<'loading' | 'linked' | 'unlinked' | 'unknown' | null>(null);

  const isRepresentativeUser = hasRepresentativeRole([user?.role?.name]);
  const isRepresentative = hasRepresentativeRole(editForm.roles);

  // Resolve a rep's code against the SAP list: exact match on the personnel number.
  useEffect(() => {
    const code = user?.employee_id?.trim() ?? '';
    if (!user || !isRepresentativeUser) {
      setSapLink(null);
      return;
    }
    if (looksUnlinked(code)) {
      setSapLink('unlinked');
      setSalesEmployeeName(null);
      return;
    }
    const controller = new AbortController();
    setSapLink('loading');
    usersRepository
      .searchSalesEmployees(code, controller.signal, 50)
      .then((options) => {
        const match = options.find((o) => o.personnelNumber === code);
        setSalesEmployeeName(match?.fullName ?? null);
        setSapLink(match ? 'linked' : 'unlinked');
      })
      .catch(() => {
        if (!controller.signal.aborted) setSapLink('unknown');
      });
    return () => controller.abort();
  }, [user, isRepresentativeUser]);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await usersRepository.getById(id as string);
      setUser(fetched);
      if (fetched) {
        setEditForm({
          fullName: fetched.full_name,
          phoneNumber: fetched.phone || '',
          employeeCode: fetched.employee_id || '',
          jobTitle: fetched.position || '',
          department: fetched.department?.name || fetched.department_id || '',
          territoryCode: fetched.address || '',
          depotCode: '',
          roles: fetched.role?.name ? [fetched.role.name] : [],
        });
      }
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const nextStatus = user.account_status === 'active' ? false : true;
    try {
      await usersRepository.setStatus(user.id, nextStatus);
      toast.success(t('um.actions.statusUpdated'));
      fetchUser();
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    }
  };

  const handleUnlock = async () => {
    if (!user) return;
    try {
      await usersRepository.unlock(user.id);
      toast.success(t('um.actions.unlockSuccess'));
      fetchUser();
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    }
  };

  const handleRevokeSessions = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await usersRepository.revokeSessions(user.id);
      toast.success(t('um.actions.revokeSessionsSuccess'));
      setShowRevokeConfirm(false);
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !newPassword.trim()) {
      toast.error(t('api.error.validation'));
      return;
    }
    setIsProcessing(true);
    try {
      await usersRepository.resetPassword(user.id, newPassword);
      toast.success(t('um.actions.resetPasswordSuccess'));
      setShowResetPassword(false);
      setNewPassword('');
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await usersRepository.delete(user.id);
      toast.success(t('um.actions.userDeleted'));
      router.push('/user-management/users');
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
      setIsProcessing(false);
    }
  };

  // A rep must stay linked to a current SAP sales employee. The server enforces this
  // only on create, so the edit dialog is the guard: an empty or `EMP…` code, or the
  // unchanged code of a rep already known to be unlinked, cannot be saved.
  const repCodeBlocked =
    isRepresentative &&
    (looksUnlinked(editForm.employeeCode) ||
      (editForm.employeeCode === (user?.employee_id ?? '') && sapLink === 'unlinked'));

  const handleSaveEdit = async () => {
    if (!user || repCodeBlocked) return;
    setIsProcessing(true);
    try {
      await usersRepository.update(user.id, {
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber || null,
        employeeCode: editForm.employeeCode || null,
        jobTitle: editForm.jobTitle || null,
        department: editForm.department || null,
        territoryCode: editForm.territoryCode || null,
        roles: editForm.roles,
      });
      toast.success(t('common.saved') || 'User profile updated.');
      setShowEditModal(false);
      fetchUser();
    } catch (err: unknown) {
      toast.error(userSaveErrorMessage(err, t, isRepresentative));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateQuickPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-32 rounded-xl bg-muted/30 animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-[14px]">{t('um.users.noResults')}</p>
        <Button className="mt-4 rounded-xl" onClick={() => router.push('/user-management/users')}>
          {t('um.detail.back')}
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U';

  const infoSections = [
    {
      title: t('um.detail.personal'),
      icon: User,
      items: [
        { icon: User, label: t('um.col.fullName'), value: user.full_name },
        isRepresentativeUser
          ? {
              icon: Link2,
              label: 'SAP Sales Employee',
              value: user.employee_id
                ? `${user.employee_id}${salesEmployeeName ? ` · ${salesEmployeeName}` : ''}`
                : '—',
            }
          : { icon: User, label: t('um.col.employeeId'), value: user.employee_id || '—' },
        { icon: Mail, label: t('um.col.email'), value: user.email || '—' },
        { icon: Phone, label: t('um.col.phone'), value: user.phone || '—' },
        { icon: MapPin, label: t('um.col.address'), value: user.address || '—' },
      ],
    },
    {
      title: t('um.detail.company'),
      icon: Building2,
      items: [
        { icon: Building2, label: t('um.col.department'), value: user.department?.name || user.department_id || '—' },
        { icon: User, label: t('um.col.position'), value: user.position || '—' },
        { icon: Shield, label: t('um.col.role'), value: user.role?.name || user.role_id || '—' },
        { icon: Calendar, label: t('um.col.joinDate'), value: user.created_at ? formatDate(user.created_at) : '—' },
        { icon: User, label: t('um.col.employmentStatus'), value: user.employment_status || 'Active' },
      ],
    },
    {
      title: t('um.detail.system'),
      icon: Shield,
      items: [
        { icon: User, label: t('um.col.username'), value: user.username },
        { icon: Shield, label: t('um.col.userId'), value: user.id },
        { icon: Shield, label: t('um.col.accountStatus'), value: t(`um.status.${user.account_status}`) || user.account_status },
        { icon: Clock, label: t('um.col.lastLogin'), value: user.last_login ? formatDate(user.last_login, { dateStyle: 'medium', timeStyle: 'short' }) : t('um.detail.noLogin') },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <button
        onClick={() => router.push('/user-management/users')}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> {t('um.detail.back')}
      </button>

      {/* Profile Header */}
      <Card className="p-6 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white text-[22px] sm:text-[24px] font-bold">{getInitials(user.full_name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-main truncate">{user.full_name}</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
              {user.position || '—'} · {user.department?.name || user.department_id || '—'}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  statusStyles[user.account_status] || statusStyles.active
                }`}
              >
                {t(`um.status.${user.account_status}`) || user.account_status}
              </span>
              <span className="text-[11px] text-muted-foreground">@{user.username}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[12px]"
                onClick={() => setShowEditModal(true)}
              >
                <Pencil size={14} className="mr-1.5" /> {t('um.detail.editUser')}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[12px]"
                onClick={() => setShowResetPassword(true)}
              >
                <KeyRound size={14} className="mr-1.5" /> {t('um.actions.resetPassword')}
              </Button>
            </motion.div>
            {user.account_status === 'locked' && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-[12px] text-amber-600 border-amber-200"
                  onClick={handleUnlock}
                >
                  <Unlock size={14} className="mr-1.5" /> {t('um.actions.unlock')}
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[12px]"
                onClick={handleToggleStatus}
              >
                <Power size={14} className="mr-1.5" />
                {user.account_status === 'active' ? t('um.actions.disable') : t('um.actions.enable')}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[12px] text-purple-600 hover:text-purple-700"
                onClick={() => setShowRevokeConfirm(true)}
              >
                <LogOut size={14} className="mr-1.5" /> {t('um.actions.revokeSessions')}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl text-[12px]"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} className="mr-1.5" /> {t('um.actions.delete')}
              </Button>
            </motion.div>
          </div>
        </div>
      </Card>

      {isRepresentativeUser && sapLink === 'unlinked' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle size={18} className="flex-shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-200">Not linked to SAP</p>
            <p className="text-[12px] text-amber-700 dark:text-amber-300">
              {user.employee_id ? (
                <>
                  <span className="font-mono">{user.employee_id}</span> is not a current SAP sales employee.{' '}
                </>
              ) : null}
              Depots this rep creates will have no sales employee.
            </p>
          </div>
          <Button size="sm" className="rounded-xl bg-amber-600 text-white hover:bg-amber-700" onClick={() => setShowEditModal(true)}>
            <Pencil size={13} className="mr-1.5" /> Link SAP employee
          </Button>
        </div>
      )}

      {/* Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {infoSections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: si * 0.05 }}
          >
            <Card className="p-5 border-surface card-shadow h-full" style={{ borderRadius: '18px' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-accent/50 flex items-center justify-center">
                  <section.icon size={16} className="text-primary" />
                </div>
                <h3 className="text-[14px] font-bold text-main">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-surface last:border-0"
                  >
                    <span className="text-[12px] text-muted-foreground flex items-center gap-2">
                      <item.icon size={13} className="text-muted-foreground/60" />
                      {item.label}
                    </span>
                    <span className="text-[12px] font-semibold text-main text-right truncate max-w-[180px]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Effective Permissions Matrix Preview */}
      {user.role?.permissions && Object.keys(user.role.permissions).length > 0 && (
        <Card className="p-5 border-surface card-shadow" style={{ borderRadius: '18px' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-accent/50 flex items-center justify-center">
              <Shield size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-main">{t('um.tab.permissions')}</h3>
              <p className="text-[11px] text-muted-foreground">
                Granted via role: <span className="font-semibold text-main">{user.role.name}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(user.role.permissions).map(([mod, perms]) => (
              <div key={mod} className="p-3 rounded-xl bg-muted/20 border border-surface space-y-1.5">
                <span className="text-[12px] font-bold text-main uppercase tracking-wider">{mod}</span>
                <div className="flex flex-wrap gap-1">
                  {perms.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent text-main"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-main">{t('um.detail.editUser')}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent/50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">{t('um.col.fullName')}</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full h-10 px-3.5 mt-1 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">{t('um.col.phone')}</label>
                    <input
                      type="text"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      className="w-full h-10 px-3.5 mt-1 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  {!isRepresentative && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">{t('um.col.employeeId')}</label>
                      <input
                        type="text"
                        value={editForm.employeeCode}
                        onChange={(e) => setEditForm((p) => ({ ...p, employeeCode: e.target.value }))}
                        className="w-full h-10 px-3.5 mt-1 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                      />
                    </div>
                  )}
                </div>
                {isRepresentative && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      SAP Sales Employee <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <SalesEmployeeSelect
                        className="w-full h-10 px-3.5 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                        value={editForm.employeeCode}
                        selectedName={salesEmployeeName}
                        invalid={repCodeBlocked}
                        onChange={(option) => {
                          setSalesEmployeeName(option?.fullName ?? null);
                          setEditForm((f) => ({ ...f, employeeCode: option?.personnelNumber ?? '' }));
                        }}
                      />
                    </div>
                    <p className={`mt-1.5 text-[11px] ${repCodeBlocked ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {repCodeBlocked
                        ? 'Pick the SAP sales employee for this representative.'
                        : 'Depots this rep creates are registered in SAP under this sales employee.'}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">{t('um.col.department')}</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
                      className="w-full h-10 px-3.5 mt-1 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">{t('um.col.position')}</label>
                    <input
                      type="text"
                      value={editForm.jobTitle}
                      onChange={(e) => setEditForm((p) => ({ ...p, jobTitle: e.target.value }))}
                      className="w-full h-10 px-3.5 mt-1 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">{t('um.col.address')}</label>
                  <input
                    type="text"
                    value={editForm.territoryCode}
                    onChange={(e) => setEditForm((p) => ({ ...p, territoryCode: e.target.value }))}
                    className="w-full h-10 px-3.5 mt-1 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowEditModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white"
                  disabled={isProcessing || repCodeBlocked}
                  onClick={handleSaveEdit}
                >
                  {isProcessing ? '...' : t('um.detail.editUser')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revoke Sessions Modal */}
      <AnimatePresence>
        {showRevokeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10">
                    <LogOut size={20} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-main">{t('um.actions.revokeSessions')}</h3>
                    <p className="text-[12px] text-muted-foreground">{user.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRevokeConfirm(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent/50"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {t('um.actions.revokeSessionsConfirm')}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowRevokeConfirm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isProcessing}
                  onClick={handleRevokeSessions}
                >
                  {isProcessing ? '...' : t('um.actions.revokeSessions')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {showResetPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-main">{t('um.actions.resetPassword')}</h3>
                    <p className="text-[12px] text-muted-foreground">{user.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetPassword(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent/50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-main">{t('um.create.tempPassword')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1 h-10 px-3.5 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[12px] whitespace-nowrap"
                    onClick={generateQuickPassword}
                  >
                    {t('um.create.generate')}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowResetPassword(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white"
                  disabled={isProcessing}
                  onClick={handleResetPassword}
                >
                  {isProcessing ? '...' : t('um.actions.resetPassword')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-main">{t('um.deleteConfirm.title')}</h3>
                  <p className="text-[12px] text-muted-foreground">{user.full_name}</p>
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {t('um.deleteConfirm.body')}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowDeleteConfirm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  disabled={isProcessing}
                  onClick={handleDelete}
                >
                  {isProcessing ? '...' : t('um.actions.delete')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
