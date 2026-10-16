'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Power,
  KeyRound,
  Download,
  CheckSquare,
  Square,
  Eye,
  Pencil,
  AlertTriangle,
  LogOut,
  Unlock,
  Shield,
  X,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { AppUserWithRelations } from '@/domain/entities/user';
import { isApiError } from '@/domain/errors/api-error';
import {
  REPRESENTATIVE_ROLE,
  hasRepresentativeRole,
  looksUnlinked,
  usersRepository,
  UserManagementNav,
} from '@/features/users';

const statusStyles: Record<string, string> = {
  active: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  disabled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  locked: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
};

/** How many rep accounts the unlinked filter pulls in one request. */
const UNLINKED_SCAN = 500;

export default function UsersPage() {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const [users, setUsers] = useState<AppUserWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // Status totals across every account, not just the rows on this page.
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Reps whose employee code cannot be a SAP personnel number (empty or `EMP…`). The
  // list API has no such flag, so this pulls the rep accounts and filters here.
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Dialog states
  const [deleteTarget, setDeleteTarget] = useState<AppUserWithRelations | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AppUserWithRelations | null>(null);
  const [resetPwdTarget, setResetPwdTarget] = useState<AppUserWithRelations | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [scanTruncated, setScanTruncated] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (unlinkedOnly) {
        const reps = await usersRepository.list({
          pageNumber: 1,
          pageSize: UNLINKED_SCAN,
          search: search.trim() || undefined,
          role: REPRESENTATIVE_ROLE,
          accountStatus: statusFilter !== 'all' ? statusFilter : undefined,
          isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        });
        const unlinked = reps.items.filter((u) => hasRepresentativeRole([u.role?.name]) && looksUnlinked(u.employee_id));
        setUsers(unlinked.slice((page - 1) * pageSize, page * pageSize));
        setTotalCount(unlinked.length);
        setScanTruncated((reps.total ?? reps.items.length) > reps.items.length);
        return;
      }
      setScanTruncated(false);
      const [res, everyone] = await Promise.all([
        usersRepository.list({
          pageNumber: page,
          pageSize,
          search: search.trim() || undefined,
          accountStatus: statusFilter !== 'all' ? statusFilter : undefined,
          isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        }),
        usersRepository.list({ search: search.trim() || undefined }),
      ]);
      setUsers(res.items);
      setTotalCount(res.total ?? res.items.length);
      setStatusCounts(
        everyone.items.reduce<Record<string, number>>((acc, u) => {
          acc[u.account_status] = (acc[u.account_status] ?? 0) + 1;
          return acc;
        }, {})
      );
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, unlinkedOnly, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setShowBulkBar(next.size > 0);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length && users.length > 0) {
      setSelected(new Set());
      setShowBulkBar(false);
    } else {
      setSelected(new Set(users.map((u) => u.id)));
      setShowBulkBar(true);
    }
  };

  const handleDelete = async (user: AppUserWithRelations) => {
    setIsProcessing(true);
    try {
      await usersRepository.delete(user.id);
      toast.success(t('um.actions.userDeleted'));
      setDeleteTarget(null);
      fetchData();
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

  const handleToggleStatus = async (user: AppUserWithRelations) => {
    const nextStatus = user.account_status === 'active' ? false : true;
    try {
      await usersRepository.setStatus(user.id, nextStatus);
      toast.success(t('um.actions.statusUpdated'));
      fetchData();
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    }
  };

  const handleUnlock = async (user: AppUserWithRelations) => {
    try {
      await usersRepository.unlock(user.id);
      toast.success(t('um.actions.unlockSuccess'));
      fetchData();
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    }
  };

  const handleRevokeSessions = async (user: AppUserWithRelations) => {
    setIsProcessing(true);
    try {
      await usersRepository.revokeSessions(user.id);
      toast.success(t('um.actions.revokeSessionsSuccess'));
      setRevokeTarget(null);
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

  const handleResetPassword = async (user: AppUserWithRelations) => {
    if (!newPassword.trim()) {
      toast.error(t('api.error.validation'));
      return;
    }
    setIsProcessing(true);
    try {
      await usersRepository.resetPassword(user.id, newPassword);
      toast.success(t('um.actions.resetPasswordSuccess'));
      setResetPwdTarget(null);
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

  const generateQuickPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
  };

  const getInitials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U';

  const statusFilters = [
    { key: 'all', labelKey: 'filter.all' },
    { key: 'active', labelKey: 'um.status.active' },
    { key: 'disabled', labelKey: 'um.status.disabled' },
    { key: 'locked', labelKey: 'um.status.locked' },
  ];

  return (
    <div className="space-y-5">
      <UserManagementNav />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('um.users.totalUsers'), value: totalCount, color: 'text-blue-600' },
          { label: t('um.users.activeUsers'), value: statusCounts.active ?? 0, color: 'text-green-600' },
          { label: t('um.users.disabledUsers'), value: statusCounts.disabled ?? 0, color: 'text-red-600' },
          { label: t('um.users.lockedUsers'), value: statusCounts.locked ?? 0, color: 'text-amber-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <Card className="p-4 border-surface card-shadow hover:shadow-md transition-shadow" style={{ borderRadius: '16px' }}>
              <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
              <p className={`text-[24px] font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {showBulkBar && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-accent/40 border border-surface shadow-sm"
          >
            <span className="text-[13px] font-semibold text-main">
              {selected.size} {t('um.users.selected')}
            </span>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl text-[12px]"
                onClick={async () => {
                  if (confirm(t('um.deleteConfirm.title'))) {
                    await usersRepository.deleteMany(Array.from(selected));
                    toast.success(t('um.actions.userDeleted'));
                    setSelected(new Set());
                    setShowBulkBar(false);
                    fetchData();
                  }
                }}
              >
                <Trash2 size={14} className="mr-1.5" /> {t('um.bulk.delete')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Bar */}
      <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('um.users.search')}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setStatusFilter(f.key);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                  statusFilter === f.key
                    ? 'gradient-primary text-white shadow-md shadow-blue-200/50'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setUnlinkedOnly((v) => !v);
              setPage(1);
            }}
            title="Sales Representatives whose employee code is empty or an EMP… placeholder"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap border transition-all duration-200 ${
              unlinkedOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'border-amber-300/60 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10'
            }`}
          >
            <AlertTriangle size={13} /> Reps not linked to SAP
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="sm"
                className="rounded-xl gradient-primary text-white border-0 shadow-sm"
                onClick={() => router.push('/user-management/users/new')}
              >
                <Plus size={15} className="mr-1.5" /> {t('um.users.addUser')}
              </Button>
            </motion.div>
          </div>
        </div>
      </Card>

      {unlinkedOnly && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Sales Representatives with an empty or <span className="font-mono">EMP…</span> employee code. Open each one and use
            <b> Link SAP employee</b>. This check is approximate: a code that looks valid but is not a current SAP sales
            employee shows on the user&apos;s page, not here.
            {scanTruncated && ` Only the first ${UNLINKED_SCAN} representatives were checked.`}
          </span>
        </p>
      )}

      {/* Data Table */}
      <Card className="border-surface card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-primary transition-colors">
                    {selected.size === users.length && users.length > 0 ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  {t('um.col.fullName')}
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Employee / SAP code
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  {t('um.col.department')}
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                  {t('um.col.role')}
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  {t('um.col.status')}
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  {t('um.col.lastLogin')}
                </th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  {t('um.col.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-surface">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-10 rounded-xl bg-muted/30 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-[13px]">
                    {t('um.users.noResults')}
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="border-t border-surface hover:bg-muted/20 transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(u.id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {selected.has(u.id) ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 shadow-sm">
                          {getInitials(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => router.push(`/user-management/users/${u.id}`)}
                            className="text-[13px] font-semibold text-main hover:text-blue-600 transition-colors truncate block text-left"
                          >
                            {u.full_name}
                          </button>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {u.email || u.username}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground font-mono hidden md:table-cell">
                      {u.employee_id || '—'}
                      {hasRepresentativeRole([u.role?.name]) && looksUnlinked(u.employee_id) && (
                        <span
                          title="Not linked to SAP: depots this rep creates will have no sales employee."
                          className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-px font-sans text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                        >
                          <AlertTriangle size={10} /> Not linked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-main hidden lg:table-cell">
                      {u.department?.name || u.department_id || '—'}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        {u.role?.name || u.role_id || 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          statusStyles[u.account_status] || statusStyles.active
                        }`}
                      >
                        {t(`um.status.${u.account_status}`) || u.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                      {u.last_login ? formatDate(u.last_login) : t('um.detail.noLogin')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => router.push(`/user-management/users/${u.id}`)}
                          className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-main transition-colors"
                          title={t('um.actions.view')}
                        >
                          <Eye size={15} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setResetPwdTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-amber-600 transition-colors"
                          title={t('um.actions.resetPassword')}
                        >
                          <KeyRound size={15} />
                        </motion.button>
                        {u.account_status === 'locked' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUnlock(u)}
                            className="p-1.5 rounded-lg hover:bg-accent/60 text-amber-600 hover:text-amber-700 transition-colors"
                            title={t('um.actions.unlock')}
                          >
                            <Unlock size={15} />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleStatus(u)}
                          className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-green-600 transition-colors"
                          title={u.account_status === 'active' ? t('um.status.disabled') : t('um.status.active')}
                        >
                          <Power size={15} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setRevokeTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-purple-600 transition-colors"
                          title={t('um.actions.revokeSessions')}
                        >
                          <LogOut size={15} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          title={t('um.actions.delete')}
                        >
                          <Trash2 size={15} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface bg-muted/10">
          <span className="text-[12px] text-muted-foreground">
            {t('table.showing')} {users.length > 0 ? (page - 1) * pageSize + 1 : 0}-
            {Math.min(page * pageSize, totalCount)} {t('table.of')} {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={15} />
            </Button>
            <span className="text-[12px] font-medium text-main px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Revoke Sessions Modal */}
      <AnimatePresence>
        {revokeTarget && (
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
                    <p className="text-[12px] text-muted-foreground">{revokeTarget.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRevokeTarget(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent/50"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {t('um.actions.revokeSessionsConfirm')}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setRevokeTarget(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isProcessing}
                  onClick={() => handleRevokeSessions(revokeTarget)}
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
        {resetPwdTarget && (
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
                    <p className="text-[12px] text-muted-foreground">{resetPwdTarget.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setResetPwdTarget(null)}
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
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setResetPwdTarget(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white"
                  disabled={isProcessing}
                  onClick={() => handleResetPassword(resetPwdTarget)}
                >
                  {isProcessing ? '...' : t('um.actions.resetPassword')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-main">{t('um.deleteConfirm.title')}</h3>
                  <p className="text-[12px] text-muted-foreground">{deleteTarget.full_name}</p>
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {t('um.deleteConfirm.body')}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  disabled={isProcessing}
                  onClick={() => handleDelete(deleteTarget)}
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
