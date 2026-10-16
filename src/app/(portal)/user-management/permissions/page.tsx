'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, Lock, Save, Sparkles, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { isApiError } from '@/domain/errors/api-error';
import { PERMISSION_MODULES, PERMISSION_ACTIONS } from '@/domain/enums/permissions';
import type { PermissionModuleGroup, Role } from '@/domain/entities/user';
import { permissionsRepository, rolesRepository, UserManagementNav } from '@/features/users';

const actionLabelKey: Record<string, string> = {
  view: 'um.perms.view',
  create: 'um.perms.create',
  edit: 'um.perms.edit',
  update: 'um.perms.update',
  delete: 'um.perms.delete',
  export: 'um.perms.export',
  manage: 'um.perms.manage',
  reset_password: 'um.perms.resetPassword',
};

export default function PermissionsPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionModuleGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, groupsRes] = await Promise.all([
        rolesRepository.list(),
        permissionsRepository.listGrouped(),
      ]);
      setRoles(rolesRes.items);
      setPermissionGroups(groupsRes);
      if (rolesRes.items.length > 0) {
        setSelectedRoleId((prev) =>
          prev && rolesRes.items.some((r) => r.id === prev) ? prev : rolesRes.items[0].id
        );
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
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  // Reset working copy when role changes
  useEffect(() => {
    setMatrix(selectedRole ? { ...(selectedRole.permissions || {}) } : {});
  }, [selectedRole]);

  const isChecked = (module: string, action: string) =>
    (matrix[module] || []).includes(action) || (matrix[module.toLowerCase()] || []).includes(action);

  const toggle = (module: string, action: string) => {
    const modKey = module.toLowerCase();
    setMatrix((prev) => {
      const current = prev[modKey] || prev[module] || [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [modKey]: next };
    });
  };

  const toggleModule = (module: string, availableActions: string[]) => {
    const modKey = module.toLowerCase();
    setMatrix((prev) => {
      const current = prev[modKey] || prev[module] || [];
      const all = availableActions;
      return { ...prev, [modKey]: current.length === all.length ? [] : all };
    });
  };

  const isDirty = useMemo(() => {
    if (!selectedRole) return false;
    const original = selectedRole.permissions || {};
    const allModules = Array.from(
      new Set([...PERMISSION_MODULES, ...permissionGroups.map((g) => g.module.toLowerCase())])
    );
    return allModules.some((m) => {
      const a = [...(original[m] || [])].sort().join(',');
      const b = [...(matrix[m] || [])].sort().join(',');
      return a !== b;
    });
  }, [selectedRole, matrix, permissionGroups]);

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await rolesRepository.updatePermissions(selectedRole.id, matrix);
      toast.success(t('um.perms.saved') || 'Permissions updated successfully.');
      loadData();
    } catch (err: unknown) {
      if (isApiError(err)) {
        toast.error(t(err.messageKey));
      } else {
        toast.error(t('feedback.error.body'));
      }
    } finally {
      setSaving(false);
    }
  };

  const dynamicModules = useMemo(() => {
    if (permissionGroups.length > 0) {
      return permissionGroups.map((g) => ({
        module: g.module,
        actions: g.permissions.map((p) => {
          const parts = p.name.split('.');
          return parts.length > 1 ? parts.slice(1).join('.') : p.name;
        }),
      }));
    }
    return PERMISSION_MODULES.map((m) => ({
      module: m,
      actions: [...PERMISSION_ACTIONS],
    }));
  }, [permissionGroups]);

  const grantedCount = useMemo(() => {
    let sum = 0;
    for (const acts of Object.values(matrix)) {
      sum += acts.length;
    }
    return sum;
  }, [matrix]);

  return (
    <div className="space-y-5">
      <UserManagementNav />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-main">{t('um.perms.title')}</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('um.perms.subtitle')}</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            className="rounded-xl gradient-primary text-white border-0 shadow-sm"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            <Save size={15} className="mr-1.5" />
            {saving ? t('um.perms.saving') : t('button.save')}
          </Button>
        </motion.div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-80 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Role Selector Tabs */}
          <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '18px' }}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('um.perms.selectRole')}
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                    selectedRoleId === role.id
                      ? 'gradient-primary text-white shadow-md shadow-blue-200/50'
                      : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {role.is_system && <Lock size={12} />}
                  {role.name}
                </button>
              ))}
            </div>
          </Card>

          {/* Summary Cards */}
          {selectedRole && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
                <p className="text-[11px] text-muted-foreground font-medium">{t('um.roles.roleName')}</p>
                <p className="text-[16px] font-bold text-main mt-1 truncate">{selectedRole.name}</p>
              </Card>
              <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
                <p className="text-[11px] text-muted-foreground font-medium">{t('um.roles.permissions')}</p>
                <p className="text-[24px] font-bold text-blue-600 mt-1">{grantedCount}</p>
              </Card>
              <Card className="p-4 border-surface card-shadow hidden lg:block" style={{ borderRadius: '16px' }}>
                <p className="text-[11px] text-muted-foreground font-medium">{t('um.perms.module')}</p>
                <p className="text-[24px] font-bold text-green-600 mt-1">{dynamicModules.length}</p>
              </Card>
            </div>
          )}

          {/* Permissions Matrix Table */}
          <Card className="border-surface card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 sticky left-0 bg-muted/30 min-w-[160px]">
                      {t('um.perms.module')}
                    </th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th
                        key={action}
                        className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 whitespace-nowrap"
                      >
                        {t(actionLabelKey[action]) || action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dynamicModules.map((item, i) => (
                    <motion.tr
                      key={item.module}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-surface hover:bg-accent/20 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 sticky left-0 bg-card">
                        <button
                          onClick={() => toggleModule(item.module, item.actions)}
                          className="flex items-center gap-2 text-[12px] font-semibold text-main hover:text-primary transition-colors text-left"
                        >
                          <Shield size={14} className="text-primary flex-shrink-0" />
                          <span className="capitalize">{item.module}</span>
                        </button>
                      </td>
                      {PERMISSION_ACTIONS.map((action) => {
                        const hasThisAction = item.actions.includes(action) || item.actions.includes('*');
                        const checked = isChecked(item.module, action);
                        return (
                          <td key={action} className="px-3 py-3 text-center">
                            {hasThisAction ? (
                              <button
                                onClick={() => toggle(item.module, action)}
                                aria-label={`${item.module} ${action}`}
                                aria-pressed={checked}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center mx-auto transition-all duration-150 ${
                                  checked
                                    ? 'gradient-primary border-transparent text-white shadow-sm'
                                    : 'border-surface text-transparent hover:border-primary/40 hover:bg-accent/40'
                                }`}
                              >
                                <Check size={14} strokeWidth={3} />
                              </button>
                            ) : (
                              <span className="text-muted-foreground/30 text-[12px]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
