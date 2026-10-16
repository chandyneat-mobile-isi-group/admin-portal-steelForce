'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { ActivityLog, AppUser } from '@/domain/entities/user';
import { auditRepository, usersRepository, UserManagementNav } from '@/features/users';

const statusStyles: Record<string, string> = {
  success: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  failed: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

const PAGE_SIZE = 15;

function ActivityLogsContent() {
  const { t, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const userFilter = searchParams.get('user');

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [usersById, setUsersById] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const [rows, directory] = await Promise.all([
      auditRepository.activityLogs(userFilter),
      usersRepository.directory(),
    ]);
    setUsersById(directory);
    setLogs(rows.items);
    setLoading(false);
  }, [userFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        if (statusFilter !== 'all' && log.status !== statusFilter) return false;
        if (actionFilter !== 'all' && log.action !== actionFilter) return false;
        if (!search) return true;

        const q = search.toLowerCase();
        const actor = log.user_id ? usersById[log.user_id] : null;
        return (
          log.action.toLowerCase().includes(q) ||
          (log.ip_address || '').toLowerCase().includes(q) ||
          (log.browser || '').toLowerCase().includes(q) ||
          (log.device || '').toLowerCase().includes(q) ||
          (actor?.full_name || '').toLowerCase().includes(q) ||
          (actor?.username || '').toLowerCase().includes(q)
        );
      }),
    [logs, statusFilter, actionFilter, search, usersById]
  );

  // Keep the page in range when filters shrink the result set.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const successCount = logs.filter((l) => l.status === 'success').length;
  const failedCount = logs.filter((l) => l.status !== 'success').length;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-main">{t('um.logs.title')}</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('um.logs.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={fetchLogs}>
          <RefreshCw size={14} className="mr-1.5" /> {t('common.refresh')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.logs.totalLogs')}</p>
          <p className="text-[24px] font-bold text-blue-600 mt-1">{logs.length}</p>
        </Card>
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.logs.status.success')}</p>
          <p className="text-[24px] font-bold text-green-600 mt-1">{successCount}</p>
        </Card>
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.logs.status.failed')}</p>
          <p className="text-[24px] font-bold text-red-600 mt-1">{failedCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('um.logs.search')}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl bg-background/50 border border-surface text-[12px] text-main focus:outline-none focus:border-primary/30"
          >
            <option value="all">{t('um.logs.filterAction')}</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: t('filter.all') },
              { key: 'success', label: t('um.logs.status.success') },
              { key: 'failed', label: t('um.logs.status.failed') },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1); }}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                  statusFilter === f.key ? 'gradient-primary text-white shadow-md shadow-blue-200/50' : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-surface card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('um.logs.col.date')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('um.logs.col.user')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('um.logs.col.action')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">{t('um.logs.col.ipAddress')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">{t('um.logs.col.browser')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">{t('um.logs.col.device')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('um.logs.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-surface">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-8 rounded-xl bg-muted/30 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-[13px]">
                    {t('um.logs.noResults')}
                  </td>
                </tr>
              ) : (
                paginated.map((log, i) => {
                  const actor = log.user_id ? usersById[log.user_id] : null;
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-surface hover:bg-accent/20 transition-colors duration-150"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {actor ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[10px] font-bold">
                                {actor.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[12px] font-medium text-main truncate">{actor.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-main">
                          <ScrollText size={13} className="text-primary" />
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-[12px] text-muted-foreground font-mono">{log.ip_address || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-[12px] text-muted-foreground">{log.browser || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Monitor size={13} /> {log.device || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusStyles[log.status] || statusStyles.failed}`}>
                          {log.status === 'success' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {log.status === 'success' ? t('um.logs.status.success') : t('um.logs.status.failed')}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-surface">
            <p className="text-[11px] text-muted-foreground">
              {t('table.showing')}{' '}
              <span className="font-semibold text-main">
                {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{' '}
              {t('table.of')} <span className="font-semibold text-main">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-surface flex items-center justify-center text-muted-foreground hover:bg-accent/50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-[12px] font-semibold text-main">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-surface flex items-center justify-center text-muted-foreground hover:bg-accent/50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

// useSearchParams opts its subtree out of prerendering, so the nav stays outside
// the boundary and only the table shell falls back.
export default function ActivityLogsPage() {
  return (
    <div className="space-y-5">
      <UserManagementNav />
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            <div className="h-96 rounded-2xl bg-muted/30 animate-pulse" />
          </div>
        }
      >
        <ActivityLogsContent />
      </Suspense>
    </div>
  );
}
