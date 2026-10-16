'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Lock, Users, Pencil, Trash2, X, AlertTriangle, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { isApiError } from '@/domain/errors/api-error';
import type { Role } from '@/domain/entities/user';
import { rolesRepository, UserManagementNav } from '@/features/users';

export default function RolesPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<Role[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Role Form
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
  });

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRoles, counts] = await Promise.all([
        rolesRepository.list(),
        rolesRepository.userCounts(),
      ]);
      setRoles(nextRoles.items);
      setUserCounts(counts);
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const systemRoles = roles.filter((r) => r.is_system);
  const customRoles = roles.filter((r) => !r.is_system);

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error(t('api.error.validation'));
      return;
    }
    setIsProcessing(true);
    try {
      if (rolesRepository.create) {
        await rolesRepository.create({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          permissions: [],
        });
      }
      toast.success(t('common.saved') || 'Role created successfully.');
      setShowCreateModal(false);
      setRoleForm({ name: '', description: '' });
      loadRoles();
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

  const handleUpdateRole = async () => {
    if (!editTarget || !roleForm.name.trim()) return;
    setIsProcessing(true);
    try {
      if (rolesRepository.updateRole) {
        await rolesRepository.updateRole(editTarget.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
        });
      }
      toast.success(t('common.saved') || 'Role updated.');
      setEditTarget(null);
      setRoleForm({ name: '', description: '' });
      loadRoles();
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

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      if (rolesRepository.delete) {
        await rolesRepository.delete(deleteTarget.id);
      }
      toast.success(t('um.actions.userDeleted') || 'Role deleted.');
      setDeleteTarget(null);
      loadRoles();
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

  const roleColors: Record<string, string> = {
    'Super Admin': 'from-red-500 to-rose-600',
    'Admin': 'from-orange-500 to-amber-600',
    'Manager': 'from-blue-500 to-blue-600',
    'Sales Supervisor': 'from-sky-500 to-sky-600',
    'Sales Representative': 'from-green-500 to-green-600',
    'Finance': 'from-emerald-500 to-teal-600',
    'Warehouse': 'from-amber-500 to-yellow-600',
    'Customer Service': 'from-purple-500 to-violet-600',
    'Viewer': 'from-gray-500 to-gray-600',
  };

  return (
    <div className="space-y-5">
      <UserManagementNav />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-main">{t('um.roles.title')}</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('um.roles.subtitle')}</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            className="rounded-xl gradient-primary text-white border-0 shadow-sm"
            onClick={() => {
              setRoleForm({ name: '', description: '' });
              setShowCreateModal(true);
            }}
          >
            <Plus size={15} className="mr-1.5" /> {t('um.roles.addRole')}
          </Button>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.roles.totalRoles')}</p>
          <p className="text-[24px] font-bold text-blue-600 mt-1">{roles.length}</p>
        </Card>
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.roles.systemRoles')}</p>
          <p className="text-[24px] font-bold text-amber-600 mt-1">{systemRoles.length}</p>
        </Card>
      </div>

      {/* System Roles */}
      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Lock size={14} /> {t('um.roles.systemRoles')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-muted/30 animate-pulse" />
            ))
          ) : (
            systemRoles.map((role, i) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="p-5 border-surface card-shadow hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between"
                  style={{ borderRadius: '18px' }}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                          roleColors[role.name] || 'from-blue-500 to-blue-600'
                        } flex items-center justify-center shadow-md`}
                      >
                        <Shield size={18} className="text-white" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        {t('um.roles.systemRole')}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-bold text-main">{role.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-surface">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users size={13} /> {userCounts[role.id] ?? userCounts[role.name] ?? role.user_count ?? 0} {t('um.roles.users')}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Key size={13} /> {Object.keys(role.permissions || {}).length} modules
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('um.roles.customRoles')}
        </h3>
        {customRoles.length === 0 ? (
          <Card className="p-8 text-center border-surface" style={{ borderRadius: '18px' }}>
            <p className="text-[13px] text-muted-foreground">No custom roles created yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map((role, i) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="p-5 border-surface card-shadow hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between"
                  style={{ borderRadius: '18px' }}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
                        <Shield size={18} className="text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditTarget(role);
                            setRoleForm({ name: role.name, description: role.description || '' });
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-main hover:bg-accent/60"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(role)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-[14px] font-bold text-main">{role.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-surface">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users size={13} /> {userCounts[role.id] ?? userCounts[role.name] ?? role.user_count ?? 0} {t('um.roles.users')}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Key size={13} /> {Object.keys(role.permissions || {}).length} modules
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-main">{t('um.roles.addRole')}</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent/50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Role Name</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Regional Auditor"
                    className="w-full h-10 px-3.5 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Role responsibilities and access scopes..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowCreateModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white"
                  disabled={isProcessing}
                  onClick={handleCreateRole}
                >
                  {isProcessing ? '...' : t('common.save') || 'Create Role'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-surface rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-main">Edit Role</h3>
                <button
                  onClick={() => setEditTarget(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-accent/50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Role Name</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full h-10 px-3.5 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-background/50 border border-surface text-[13px] text-main focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditTarget(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white"
                  disabled={isProcessing}
                  onClick={handleUpdateRole}
                >
                  {isProcessing ? '...' : t('common.save') || 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Role Confirmation */}
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
                  <h3 className="text-[15px] font-bold text-main">Delete Role</h3>
                  <p className="text-[12px] text-muted-foreground">{deleteTarget.name}</p>
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Are you sure you want to delete this custom role? This action cannot be undone.
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
                  onClick={handleDeleteRole}
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
