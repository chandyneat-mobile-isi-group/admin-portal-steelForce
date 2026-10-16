'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Pencil, Trash2, Users, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Department } from '@/domain/entities/user';
import { departmentsRepository, UserManagementNav } from '@/features/users';

const inputClass =
  'w-full h-11 px-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all';

interface DeptForm {
  name: string;
  description: string;
  manager_name: string;
}

const emptyForm: DeptForm = { name: '', description: '', manager_name: '' };

export default function DepartmentsPage() {
  const { t } = useI18n();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [nextDepartments, counts] = await Promise.all([
      departmentsRepository.list(),
      departmentsRepository.userCounts(),
    ]);
    setDepartments(nextDepartments.items);
    setUserCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      manager_name: dept.manager_name || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      manager_name: form.manager_name.trim() || null,
    };

    if (editing) await departmentsRepository.update(editing.id, payload);
    else await departmentsRepository.create(payload);

    setSaving(false);
    toast.success(editing ? t('validation.saved') : t('um.dept.created'));
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    await departmentsRepository.delete(deleteTarget.id);
    setDeleteTarget(null);
    toast.success(t('validation.saved'));
    fetchData();
  };

  const filtered = departments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.manager_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <UserManagementNav />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-main">{t('um.dept.title')}</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('um.dept.subtitle')}</p>
        </div>
        <Button size="sm" className="rounded-xl gradient-primary text-white border-0" onClick={openCreate}>
          <Plus size={15} className="mr-1.5" /> {t('um.dept.addDepartment')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.dept.totalDepartments')}</p>
          <p className="text-[24px] font-bold text-blue-600 mt-1">{departments.length}</p>
        </Card>
        <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '16px' }}>
          <p className="text-[11px] text-muted-foreground font-medium">{t('um.dept.users')}</p>
          <p className="text-[24px] font-bold text-green-600 mt-1">
            {Object.values(userCounts).reduce((a, b) => a + b, 0)}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('um.dept.search')}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
      </Card>

      {/* Department Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted/30 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <Card className="col-span-full p-12 border-surface card-shadow text-center" style={{ borderRadius: '18px' }}>
            <p className="text-[13px] text-muted-foreground">{t('um.dept.noResults')}</p>
          </Card>
        ) : (
          filtered.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="p-5 border-surface card-shadow hover:card-shadow-hover transition-all duration-300 h-full" style={{ borderRadius: '18px' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(dept)}
                      className="w-8 h-8 rounded-lg hover:bg-accent/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title={t('um.dept.editDepartment')}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(dept)}
                      className="w-8 h-8 rounded-lg hover:bg-accent/50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                      title={t('um.dept.deleteTitle')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h4 className="text-[14px] font-bold text-main">{dept.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{dept.description || '—'}</p>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-surface">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Users size={13} /> {userCounts[dept.id] || 0} {t('um.dept.users')}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {t('um.dept.manager')}: {dept.manager_name || '—'}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass rounded-2xl card-shadow p-6"
            >
              <h3 className="text-[16px] font-bold text-main">
                {editing ? t('um.dept.editDepartment') : t('um.dept.addDepartment')}
              </h3>

              <div className="space-y-4 mt-5">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground">{t('um.dept.departmentName')}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`${inputClass} mt-1.5`}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground">{t('um.dept.description')}</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={`${inputClass} mt-1.5`}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground">{t('um.dept.manager')}</label>
                  <input
                    type="text"
                    value={form.manager_name}
                    onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                    className={`${inputClass} mt-1.5`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button variant="outline" className="rounded-xl flex-1" onClick={() => setShowForm(false)}>
                  {t('button.cancel')}
                </Button>
                <Button
                  className="rounded-xl flex-1 gradient-primary text-white border-0"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                >
                  {t('button.save')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass rounded-2xl card-shadow p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-main">{t('um.dept.deleteTitle')}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">{t('um.dept.deleteMessage')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <Button variant="outline" className="rounded-xl flex-1" onClick={() => setDeleteTarget(null)}>
                  {t('um.delete.cancel')}
                </Button>
                <Button className="rounded-xl flex-1 bg-red-500 hover:bg-red-600 text-white border-0" onClick={handleDelete}>
                  {t('um.delete.confirm')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
