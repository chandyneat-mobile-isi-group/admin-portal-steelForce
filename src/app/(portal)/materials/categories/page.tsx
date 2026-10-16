'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { SearchBar } from '@/components/forms/search-bar';
import { MetaPill, StatusPill } from '@/components/shared/status-pill';
import { EmptyState } from '@/components/layout/section-header';
import { ConfirmDialog, Modal } from '@/components/feedback/feedback';
import { SelectField, TextArea, TextField } from '@/components/forms/form';
import {
  useCategoryTree,
  useDeleteCategory,
  useSaveCategory,
  type Category,
} from '@/features/materials';
import { formatCurrency } from '@/lib/formatting';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  FolderTree,
  Layers,
  MoveRight,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Category hierarchy.
 *
 * A tree, not a dashboard: the question this page answers is "how is the range
 * organised, and where is the value concentrated" — so each node carries its
 * rollup inline rather than pushing the numbers into a separate KPI row.
 */
export default function ProductCategoriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  // Tracks what is closed rather than open, so groups arriving with the data start open.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [draft, setDraft] = useState({ name: '', parent: '', description: '' });

  const tree = useCategoryTree();
  const saveCategory = useSaveCategory();
  const deleteCategory = useDeleteCategory();

  const rollups = useMemo(
    () => (tree.data?.roots ?? []).map(({ children, ...root }) => ({ ...root, category: root as Category, children })),
    [tree.data]
  );
  const rootCategories = useMemo(() => rollups.map((r) => r.category), [rollups]);
  const products = tree.data?.products ?? [];
  const uncategorised = products.filter((p) => !p.categoryId).length;
  const expanded = rootCategories.map((c) => c.id).filter((id) => !collapsed.includes(id));
  const setExpanded = (ids: string[]) => setCollapsed(rootCategories.map((c) => c.id).filter((id) => !ids.includes(id)));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rollups;
    return rollups
      .map((r) => ({
        ...r,
        children: r.children.filter((c) => c.name.toLowerCase().includes(q)),
      }))
      .filter((r) => r.category.name.toLowerCase().includes(q) || r.children.length > 0);
  }, [rollups, search]);

  const toggle = (id: string) =>
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const submit = () => {
    const input = editing
      ? { id: editing.id, name: editing.name, parentId: editing.parentId, description: editing.description }
      : { name: draft.name, parentId: draft.parent || null, description: draft.description };
    if (!input.name.trim()) {
      toast.error('A category name is required');
      return;
    }
    saveCategory
      .mutateAsync(input)
      .then((saved) => {
        toast.success(editing ? 'Category updated' : 'Category created', { description: saved.name });
        if (saved.parentId) setCollapsed((prev) => prev.filter((x) => x !== saved.parentId));
        closeModal();
      })
      .catch((err: unknown) =>
        toast.error('Could not save the category', { description: err instanceof Error ? err.message : undefined })
      );
  };

  const totals = useMemo(
    () => ({
      groups: rootCategories.length,
      leaves: rollups.reduce((sum, r) => sum + r.children.length, 0),
      products: products.length,
      stockValue: rollups.reduce((sum, r) => sum + r.stockValue, 0),
    }),
    [rollups, rootCategories, products.length]
  );

  return (
    <PageBody>
      <PageHeader
        title="Product Categories"
        subtitle="Manage the hierarchy the catalog, reporting and the field app all group by."
        meta={
          <>
            <MetaPill label={`${totals.groups} groups`} />
            <MetaPill label={`${totals.leaves} sub-categories`} />
            <MetaPill label={`${totals.products} products`} />
            <MetaPill label={`${formatCurrency(totals.stockValue, true)} stock value`} />
            {uncategorised > 0 && <MetaPill label={`${uncategorised} uncategorised`} />}
          </>
        }
        actions={
          <ActionButton
            icon={Plus}
            tone="primary"
            onClick={() => {
              setDraft({ name: '', parent: '', description: '' });
              setCreating(true);
            }}
          >
            Create Category
          </ActionButton>
        }
      />

      <PageToolbar>
        <ToolbarRow>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search categories…"
            className="w-full sm:w-[300px]"
          />
          <ActionButton
            icon={Layers}
            onClick={() =>
              setExpanded(expanded.length === rootCategories.length ? [] : rootCategories.map((c) => c.id))
            }
          >
            {expanded.length === rootCategories.length ? 'Collapse all' : 'Expand all'}
          </ActionButton>
        </ToolbarRow>
      </PageToolbar>

      {tree.isLoading ? (
        <div className="rounded-card border border-surface bg-card">
          <EmptyState icon={FolderTree} title="Loading categories…" hint="Measuring each node against current stock." />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-card border border-surface bg-card">
          <EmptyState
            icon={FolderTree}
            title="No categories match"
            hint="Try a different search term, or create a new category."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((rollup, index) => {
            const isOpen = expanded.includes(rollup.category.id);
            return (
              <motion.section
                key={rollup.category.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35, ease: EASE }}
                className="rounded-card border border-surface bg-card overflow-hidden"
              >
                {/* Group node */}
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    onClick={() => toggle(rollup.category.id)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                  >
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 group-hover:bg-accent"
                    >
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </motion.span>
                    <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderTree size={16} className="text-primary" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold text-main truncate">
                        {rollup.category.name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {rollup.category.description}
                      </span>
                    </span>
                  </button>

                  <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <Metric label="Products" value={String(rollup.productCount)} />
                    <Metric label="Active" value={String(rollup.activeCount)} />
                    <Metric label="Revenue" value={formatCurrency(rollup.revenue, true)} />
                    <Metric label="Stock value" value={formatCurrency(rollup.stockValue, true)} />
                    <div>
                      <dt className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
                        Low stock
                      </dt>
                      <dd className="mt-0.5">
                        {rollup.lowStock > 0 ? (
                          <StatusPill size="sm" label={`${rollup.lowStock} items`} tone="warning" />
                        ) : (
                          <StatusPill size="sm" label="None" tone="positive" />
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-center gap-1.5">
                    <IconAction icon={Pencil} label="Edit category" onClick={() => setEditing(rollup.category)} />
                    <IconAction icon={Plus} label="Add sub-category" onClick={() => { setDraft({ name: '', parent: rollup.category.id, description: '' }); setCreating(true); }} />
                    <IconAction icon={Trash2} label="Delete category" tone="danger" onClick={() => setConfirmDelete(rollup.category)} />
                  </div>
                </div>

                {/* Leaf nodes */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-surface bg-muted/20 px-4 py-2">
                        <ul className="relative">
                          {/* One guide line rather than a border per child */}
                          <span className="absolute left-[15px] top-2 bottom-4 w-px bg-border" aria-hidden />
                          {rollup.children.map((leaf) => {
                            const stats = leaf;
                            return (
                              <li key={leaf.id} className="relative flex flex-wrap items-center gap-3 py-2.5 pl-9">
                                <span
                                  className="absolute left-[15px] top-1/2 w-3.5 h-px bg-border"
                                  aria-hidden
                                />
                                <span className="w-7 h-7 rounded-lg bg-card border border-surface flex items-center justify-center flex-shrink-0">
                                  <Package size={12} className="text-muted-foreground" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[12.5px] font-semibold text-main truncate">
                                    {leaf.name}
                                  </span>
                                  <span className="block text-[10.5px] text-muted-foreground truncate">
                                    {leaf.description}
                                  </span>
                                </span>

                                <dl className="flex flex-wrap items-center gap-x-6 gap-y-1">
                                  <Metric label="Products" value={String(stats.productCount)} small />
                                  <Metric label="Active" value={String(stats.activeCount)} small />
                                  <Metric label="Revenue" value={formatCurrency(stats.revenue, true)} small />
                                  <Metric label="Stock" value={formatCurrency(stats.stockValue, true)} small />
                                </dl>

                                <div className="flex items-center gap-1.5">
                                  {stats.lowStock > 0 && (
                                    <StatusPill size="sm" label={`${stats.lowStock} low`} tone="warning" />
                                  )}
                                  <ActionButton onClick={() => router.push('/materials')}>
                                    View products
                                  </ActionButton>
                                  <IconAction icon={Pencil} label={`Edit ${leaf.name}`} onClick={() => setEditing(leaf)} />
                                  <IconAction icon={MoveRight} label={`Move ${leaf.name}`} onClick={() => setEditing(leaf)} />
                                  <IconAction icon={Trash2} label={`Delete ${leaf.name}`} tone="danger" onClick={() => setConfirmDelete(leaf)} />
                                </div>
                              </li>
                            );
                          })}
                          {rollup.children.length === 0 && (
                            <li className="py-4 pl-9 text-[11.5px] text-muted-foreground">
                              No sub-categories yet.
                            </li>
                          )}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={closeModal}
        title={editing ? `Edit ${editing.name}` : 'Create category'}
        subtitle={editing ? 'Rename or re-describe this node.' : 'Add a group or a sub-category.'}
        icon={FolderTree}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={closeModal}>Cancel</ActionButton>
            <ActionButton tone="primary" onClick={submit}>
              {saveCategory.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </ActionButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Category name"
            required
            value={editing ? editing.name : draft.name}
            onChange={(v) => (editing ? setEditing({ ...editing, name: v }) : setDraft((p) => ({ ...p, name: v })))}
            placeholder="Structural Steel"
            full
          />
          <SelectField
            label="Parent category"
            value={editing ? editing.parentId ?? '' : draft.parent}
            onChange={(v) => (editing ? setEditing({ ...editing, parentId: v || null }) : setDraft((p) => ({ ...p, parent: v })))}
            options={rootCategories.filter((c) => c.id !== editing?.id).map((c) => ({ value: c.id, label: c.name }))}
            placeholder="None — this is a top-level group"
            full
          />
          <TextArea
            label="Description"
            value={editing ? editing.description : draft.description}
            onChange={(v) => (editing ? setEditing({ ...editing, description: v }) : setDraft((p) => ({ ...p, description: v })))}
            placeholder="What belongs in this category"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this category?"
        body={`${confirmDelete?.name ?? ''} will be removed. Products in it are moved to Uncategorised, not deleted.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          const target = confirmDelete;
          deleteCategory
            .mutateAsync(target.id)
            .then((res) =>
              toast.success('Category deleted', {
                description: `${target.name}${res.removed > 1 ? ` and ${res.removed - 1} sub-categories` : ''} · ${res.productsMoved} product(s) moved to Uncategorised`,
              })
            )
            .catch((err: unknown) =>
              toast.error('Could not delete the category', { description: err instanceof Error ? err.message : undefined })
            );
          setConfirmDelete(null);
        }}
      />
    </PageBody>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <dt className="text-[9.5px] text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className={`${small ? 'text-[11.5px]' : 'text-[13px]'} font-bold text-main tabular-nums mt-0.5`}>
        {value}
      </dd>
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        tone === 'danger'
          ? 'text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
          : 'text-muted-foreground hover:text-main hover:bg-accent/60'
      }`}
    >
      <Icon size={13} />
    </button>
  );
}
