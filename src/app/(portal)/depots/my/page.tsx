'use client';

import { PageBody, PageToolbar, ToolbarRow } from '@/components/layout/page-layout';
import { PageHeader, ActionButton, StandardActions } from '@/components/layout/page-header';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import { SummaryCard } from '@/components/shared/summary-card';
import { BulkActionBar, DataTable, type Column, type RowAction } from '@/components/tables/data-table';
import { MetaPill, StatusPill } from '@/components/shared/status-pill';
import { ConfirmDialog, ErrorState, Modal } from '@/components/feedback/feedback';
import { SelectField, TextArea, TextField } from '@/components/forms/form';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, formatDate, relativeDays } from '@/lib/formatting';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  DollarSign,
  Eye,
  FileText,
  Flag,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  RotateCcw,
  Sparkles,
  Store,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DepotDrawer,
  STATUS_TONE,
  DEPOT_STATUSES,
  PAYMENT_TERMS,
  depotMetrics,
  repById,
  type CrmDepot,
  depotsRepository,
  quotationsService,
} from '@/features/depots';
import { RepAvatar, salesReps, CUSTOMER_TYPES, PROVINCES } from '@/features/planning';
import { csvBlob, fileStamp } from '@/services/mock';
import { saveBlob } from '@/lib/utilities/download';
import { isoDate } from '@/lib/utilities/demo-clock';

const FOLLOW_UP_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'none', label: 'None scheduled' },
];

const REVENUE_OPTIONS = [
  { value: '0-50', label: 'Under $50k' },
  { value: '50-200', label: '$50k – $200k' },
  { value: '200-500', label: '$200k – $500k' },
  { value: '500+', label: 'Over $500k' },
];

const EMPTY_DEPOTS: CrmDepot[] = [];
const opts = (v: readonly string[]) => v.map((x) => ({ value: x, label: x }));

/** The editable subset of a depot, as strings for the form. */
interface EditForm {
  contactPerson: string;
  phone: string;
  email: string;
  creditLimit: string;
  paymentTerms: string;
  workingHours: string;
  notes: string;
}

const EXPORT_COLUMNS = [
  'Code', 'Name', 'Type', 'Status', 'Contact', 'Phone', 'Email', 'Province', 'District',
  'Address', 'Sales rep', 'Credit limit', 'Outstanding', 'Sales value (12m)', 'Next follow-up',
] as const;

/** Splits one CSV line, honouring quoted cells. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

export default function MyDepotsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const loadDepots = useCallback(
    (signal: AbortSignal) => depotsRepository.list({ scope: 'assigned' }, signal),
    []
  );
  const { data: depotPage, error, isLoading, refetch } = useRepositoryQuery(
    ['depots', 'assigned'],
    loadDepots
  );
  const all = depotPage?.items ?? EMPTY_DEPOTS;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [province, setProvince] = useState('All');
  const [type, setType] = useState('All');
  const [rep, setRep] = useState('All');
  const [followUp, setFollowUp] = useState('All');
  const [revenue, setRevenue] = useState('All');

  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<CrmDepot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CrmDepot | null>(null);
  const [editing, setEditing] = useState<CrmDepot | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [noting, setNoting] = useState<CrmDepot | null>(null);
  const [note, setNote] = useState('');
  /** Depots being reassigned — one from the drawer, or the bulk selection. */
  const [reassigning, setReassigning] = useState<string[] | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawerRevision, setDrawerRevision] = useState(0);
  const importInput = useRef<HTMLInputElement>(null);

  /** Runs a write, reports it, and re-reads the list (and the open drawer's record). */
  const write = async (action: () => Promise<unknown>, done: string, description?: string) => {
    setSaving(true);
    try {
      await action();
      toast.success(done, description ? { description } : undefined);
      refetch();
      if (detail) {
        const fresh = await depotsRepository.getById(detail.id);
        setDetail(fresh);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That change could not be saved.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c: CrmDepot) => {
    setEditing(c);
    setEditForm({
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      creditLimit: String(c.creditLimit || ''),
      paymentTerms: c.paymentTerms,
      workingHours: c.workingHours,
      notes: c.notes,
    });
  };

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    const limit = Number(editForm.creditLimit.replace(/,/g, '') || 0);
    if (Number.isNaN(limit)) {
      toast.error('Credit limit must be a number.');
      return;
    }
    const ok = await write(
      () =>
        depotsRepository.update(editing.id, {
          contactPerson: editForm.contactPerson.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim(),
          creditLimit: limit,
          paymentTerms: editForm.paymentTerms,
          workingHours: editForm.workingHours.trim(),
          notes: editForm.notes.trim(),
        }),
      'Depot updated',
      editing.name
    );
    if (ok) setEditing(null);
  };

  const createQuotation = (c: CrmDepot) =>
    write(
      async () => {
        const draft = await quotationsService.createDraft(c.id);
        setDrawerRevision((n) => n + 1);
        return draft;
      },
      'Quotation draft created',
      `${c.name} · find it in the depot's Quotations tab`
    );

  // Visits live in their own module; here scheduling one sets the depot's next follow-up.
  const scheduleVisit = (c: CrmDepot) =>
    write(() => depotsRepository.update(c.id, { nextFollowUp: isoDate(1) }), 'Visit scheduled', `${c.name} · tomorrow`);

  const saveNote = async () => {
    if (!noting || !note.trim()) return;
    const stamped = `[${new Date().toISOString().slice(0, 10)}] ${note.trim()}`;
    const ok = await write(
      () => depotsRepository.update(noting.id, { notes: noting.notes ? `${stamped}\n${noting.notes}` : stamped }),
      'Activity logged',
      noting.name
    );
    if (ok) setNoting(null);
  };

  const saveReassign = async () => {
    if (!reassigning || !reassignTo) return;
    const ids = reassigning;
    const target = repById(reassignTo);
    const ok = await write(
      () => Promise.all(ids.map((id) => depotsRepository.update(id, { repId: reassignTo }))),
      ids.length === 1 ? 'Depot reassigned' : `${ids.length} depots reassigned`,
      `Ownership moved to ${target?.name ?? 'the selected rep'}.`
    );
    if (ok) {
      setReassigning(null);
      setSelected([]);
    }
  };

  const exportCsv = (rows: CrmDepot[]) => {
    const blob = csvBlob(
      EXPORT_COLUMNS,
      rows.map((c) => [
        c.code, c.name, c.type, c.status, c.contactPerson, c.phone, c.email, c.province, c.district,
        c.address, repById(c.repId)?.name ?? '', c.creditLimit, c.outstanding, c.salesValue, c.nextFollowUp ?? '',
      ])
    );
    saveBlob(blob, `my-depots-${fileStamp()}.csv`);
    toast.success('Export ready', { description: `${rows.length} depots written to CSV.` });
  };

  /**
   * Bulk-creates depots from a CSV with a header row. Recognised columns: Name, Contact,
   * Phone, Email, Province, District, Address, Credit limit. Each becomes a draft.
   */
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error('Nothing to import', { description: 'The file needs a header row and at least one depot.' });
      return;
    }
    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const col = (row: string[], ...names: string[]) => {
      const i = header.findIndex((h) => names.includes(h));
      return i >= 0 ? row[i] ?? '' : '';
    };
    const rows = lines.slice(1).map(splitCsvLine).filter((row) => col(row, 'name', 'depot', 'company name'));
    if (rows.length === 0) {
      toast.error('No depots found', { description: 'Add a "Name" column to the header row.' });
      return;
    }
    await write(
      () =>
        Promise.all(
          rows.map((row) =>
            depotsRepository.create({
              name: col(row, 'name', 'depot', 'company name'),
              contactPerson: col(row, 'contact', 'contact person'),
              phone: col(row, 'phone'),
              email: col(row, 'email'),
              province: col(row, 'province'),
              district: col(row, 'district'),
              address: col(row, 'address'),
              creditLimit: Number(col(row, 'credit limit').replace(/[^\d.]/g, '')) || 0,
            })
          )
        ),
      `${rows.length} depot${rows.length === 1 ? '' : 's'} imported`,
      'Created as drafts — submit each for approval from the depot directory.'
    );
    if (importInput.current) importInput.current.value = '';
  };

  const repOptions = useMemo(
    () => salesReps.map((r) => ({ value: r.id, label: r.name, hint: `${r.employeeId} · ${r.team}` })),
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (status !== 'All' && c.status !== status) return false;
      if (province !== 'All' && c.province !== province) return false;
      if (type !== 'All' && c.type !== type) return false;
      if (rep !== 'All' && c.repId !== rep) return false;

      if (followUp !== 'All') {
        const rel = relativeDays(c.nextFollowUp);
        if (followUp === 'none' && rel) return false;
        if (followUp === 'overdue' && (!rel || rel.days >= 0)) return false;
        if (followUp === 'today' && (!rel || rel.days !== 0)) return false;
        if (followUp === 'week' && (!rel || rel.days < 0 || rel.days > 7)) return false;
      }

      if (revenue !== 'All') {
        const k = c.salesValue / 1000;
        if (revenue === '0-50' && k >= 50) return false;
        if (revenue === '50-200' && (k < 50 || k >= 200)) return false;
        if (revenue === '200-500' && (k < 200 || k >= 500)) return false;
        if (revenue === '500+' && k < 500) return false;
      }

      if (q) {
        const rp = repById(c.repId);
        const haystack = `${c.name} ${c.code} ${c.contactPerson} ${c.phone} ${c.district} ${c.province} ${rp?.name ?? ''}`;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [all, search, status, province, type, rep, followUp, revenue]);

  const metrics = useMemo(() => depotMetrics(all), [all]);

  const activeFilters =
    [status, province, type, rep, followUp, revenue].filter((v) => v !== 'All').length +
    (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setStatus('All');
    setProvince('All');
    setType('All');
    setRep('All');
    setFollowUp('All');
    setRevenue('All');
  };

  const columns: Column<CrmDepot>[] = [
    {
      key: 'depot',
      header: 'Depot',
      width: 'w-[240px]',
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={14} className="text-primary" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-main truncate">{c.name}</span>
            <span className="block text-[10.5px] text-muted-foreground truncate">
              {c.code} · {c.type}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      secondary: true,
      sortValue: (c) => c.contactPerson,
      cell: (c) => (
        <span className="min-w-0 block">
          <span className="block truncate">{c.contactPerson}</span>
          <span className="block text-[10.5px] text-muted-foreground truncate">{c.phone}</span>
        </span>
      ),
    },
    {
      key: 'territory',
      header: 'Territory',
      secondary: true,
      sortValue: (c) => `${c.province} ${c.district}`,
      cell: (c) => (
        <span className="min-w-0 block">
          <span className="block truncate">{c.province}</span>
          <span className="block text-[10.5px] text-muted-foreground truncate">{c.district}</span>
        </span>
      ),
    },
    {
      key: 'lastVisit',
      header: 'Last visit',
      secondary: true,
      sortValue: (c) => c.lastVisit ?? '',
      cell: (c) => <span className="text-muted-foreground">{formatDate(c.lastVisit)}</span>,
    },
    {
      key: 'followUp',
      header: 'Next follow-up',
      sortValue: (c) => c.nextFollowUp ?? 'zzzz',
      cell: (c) => {
        const rel = relativeDays(c.nextFollowUp);
        if (!rel) return <span className="text-muted-foreground">—</span>;
        const overdue = rel.days < 0;
        return (
          <span
            className={`inline-flex items-center gap-1.5 ${
              overdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''
            }`}
          >
            {overdue && <AlertTriangle size={11} className="flex-shrink-0" />}
            {rel.label}
          </span>
        );
      },
    },
    {
      key: 'salesValue',
      header: 'Sales value',
      align: 'right',
      sortValue: (c) => c.salesValue,
      cell: (c) => <span className="font-semibold">{formatCurrency(c.salesValue, true)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status,
      cell: (c) => <StatusPill label={c.status} tone={STATUS_TONE[c.status]} />,
    },
    {
      key: 'rep',
      header: 'Sales rep',
      secondary: true,
      sortValue: (c) => repById(c.repId)?.name ?? '',
      cell: (c) => {
        const r = repById(c.repId);
        if (!r) return <span className="text-muted-foreground">Unassigned</span>;
        return (
          <span className="flex items-center gap-2 min-w-0">
            <RepAvatar rep={r} size="sm" showStatus={false} />
            <span className="truncate text-[11.5px]">{r.name}</span>
          </span>
        );
      },
    },
  ];

  const actions: RowAction<CrmDepot>[] = [
    { label: 'View details', icon: Eye, onSelect: (c) => setDetail(c) },
    { label: 'Edit depot', icon: Pencil, onSelect: (c) => openEdit(c) },
    { label: 'Call contact', icon: Phone, onSelect: (c) => window.open(`tel:${c.phone.replace(/\s+/g, '')}`, '_self') },
    { label: 'Send message', icon: MessageSquare, onSelect: (c) => window.open(`sms:${c.phone.replace(/\s+/g, '')}`, '_self') },
    {
      label: 'Create quotation',
      icon: FileText,
      divider: true,
      onSelect: (c) => void createQuotation(c),
    },
    { label: 'Schedule visit', icon: CalendarPlus, onSelect: (c) => void scheduleVisit(c) },
    {
      label: 'Add activity',
      icon: ClipboardList,
      onSelect: (c) => {
        setNote('');
        setNoting(c);
      },
    },
    {
      label: 'Remove depot',
      icon: Trash2,
      tone: 'danger',
      divider: true,
      onSelect: (c) => setConfirmDelete(c),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="My Depots"
        subtitle="Manage and follow up with depots assigned to you."
        actions={
          <StandardActions
            addLabel="Add Depot"
            onAdd={() => router.push('/depots/new')}
            onImport={() => importInput.current?.click()}
            onExport={() => exportCsv(filtered)}
          />
        }
      />
      <input
        ref={importInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void importCsv(e.target.files?.[0])}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard index={0} label="Total depots" value={metrics.total} icon={Users} color="#004A98" hint="Assigned to your territory" />
        <SummaryCard index={1} label="Active" value={metrics.active} icon={UserCheck} color="#238036" progress={(metrics.active / Math.max(1, metrics.total)) * 100} />
        <SummaryCard index={2} label="Needs follow-up" value={metrics.needsFollowUp} icon={AlertTriangle} color="#B36211" hint="At risk or overdue" />
        <SummaryCard index={3} label="New this month" value={metrics.newThisMonth} icon={Sparkles} color="#4A4092" />
        <SummaryCard index={4} label="Revenue" value={Math.round(metrics.revenue / 1000)} prefix="$" suffix="k" icon={DollarSign} color="#2571C2" hint="Trailing 12 months" />
      </div>

      <PageToolbar>
        <ToolbarRow>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search depot, code, contact or rep…"
            className="w-full sm:w-[290px]"
          />
          <FilterChip label="Status" icon={Flag} value={status} options={opts(DEPOT_STATUSES)} onChange={setStatus} allLabel="Any status" />
          <FilterChip label="Province" icon={MapPin} value={province} options={opts(PROVINCES)} onChange={setProvince} allLabel="All provinces" />
          <FilterChip label="Type" icon={Store} value={type} options={opts(CUSTOMER_TYPES)} onChange={setType} allLabel="All types" />
          <FilterChip label="Sales rep" icon={UserCheck} value={rep} options={repOptions} onChange={setRep} allLabel="All reps" searchable />
          <FilterChip label="Follow-up" icon={CalendarClock} value={followUp} options={FOLLOW_UP_OPTIONS} onChange={setFollowUp} allLabel="Any follow-up" />
          <FilterChip label="Revenue" icon={DollarSign} value={revenue} options={REVENUE_OPTIONS} onChange={setRevenue} allLabel="Any revenue" />
          {activeFilters > 0 && (
            <ActionButton icon={RotateCcw} onClick={clearFilters}>
              Clear ({activeFilters})
            </ActionButton>
          )}
        </ToolbarRow>
      </PageToolbar>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-main tabular-nums">{filtered.length}</span> of{' '}
          {all.length} depots{activeFilters > 0 && ' matching your filters'}
        </p>
        <MetaPill label="Click a row to open the full record" />
      </div>

      {error ? (
        <ErrorState
          title={t('depots.error.loadTitle')}
          body={t('depots.error.loadBody')}
          onRetry={refetch}
        />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          actions={actions}
          loading={isLoading}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          onRowClick={setDetail}
          pageSize={12}
          caption="Depots assigned to you"
          emptyTitle="No depots found"
          emptyHint="Try changing your filters, or create a new depot to get started."
          emptyAction={
            <div className="flex items-center gap-2">
              <ActionButton icon={RotateCcw} onClick={clearFilters}>
                Clear filters
              </ActionButton>
              <ActionButton icon={UserPlus} tone="primary" onClick={() => router.push('/depots/new')}>
                Create depot
              </ActionButton>
            </div>
          }
        />
      )}

      <BulkActionBar count={selected.length} onClear={() => setSelected([])}>
        <ActionButton
          icon={UserCheck}
          onClick={() => {
            setReassignTo('');
            setReassigning(selected);
          }}
        >
          Reassign
        </ActionButton>
        <ActionButton
          icon={CalendarPlus}
          disabled={saving}
          onClick={async () => {
            const ids = selected;
            const ok = await write(
              () => Promise.all(ids.map((id) => depotsRepository.update(id, { nextFollowUp: isoDate(7) }))),
              `Follow-up set for ${ids.length} depots`,
              'Due in one week.'
            );
            if (ok) setSelected([]);
          }}
        >
          Set follow-up
        </ActionButton>
        <ActionButton
          icon={Trash2}
          tone="danger"
          disabled={saving}
          onClick={async () => {
            const ids = selected;
            const ok = await write(
              () => Promise.all(ids.map((id) => depotsRepository.delete(id))),
              `${ids.length} depots archived`
            );
            if (ok) setSelected([]);
          }}
        >
          Archive
        </ActionButton>
      </BulkActionBar>

      <DepotDrawer
        depot={detail}
        revision={drawerRevision}
        onClose={() => setDetail(null)}
        onAction={(action, depot) => {
          if (action === 'quotation') void createQuotation(depot);
          if (action === 'visit') void scheduleVisit(depot);
          if (action === 'reassign') {
            setReassignTo(depot.repId);
            setReassigning([depot.id]);
          }
        }}
      />

      <Modal
        open={editing !== null && editForm !== null}
        title={`Edit ${editing?.name ?? 'depot'}`}
        subtitle="Contact and commercial details. Lifecycle changes go through approval."
        icon={Pencil}
        onClose={() => setEditing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setEditing(null)}>Cancel</ActionButton>
            <ActionButton tone="primary" disabled={saving} onClick={() => void saveEdit()}>
              {saving ? 'Saving…' : 'Save changes'}
            </ActionButton>
          </div>
        }
      >
        {editForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Contact person" value={editForm.contactPerson} onChange={(v) => setEditForm({ ...editForm, contactPerson: v })} />
            <TextField label="Phone" type="tel" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
            <TextField label="Email" type="email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} />
            <TextField label="Working hours" value={editForm.workingHours} onChange={(v) => setEditForm({ ...editForm, workingHours: v })} />
            <TextField label="Credit limit" prefix="$" value={editForm.creditLimit} onChange={(v) => setEditForm({ ...editForm, creditLimit: v })} />
            <SelectField label="Payment terms" value={editForm.paymentTerms} onChange={(v) => setEditForm({ ...editForm, paymentTerms: v })} options={PAYMENT_TERMS} />
            <TextArea label="Notes" value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} rows={3} />
          </div>
        )}
      </Modal>

      <Modal
        open={noting !== null}
        title="Log an activity"
        subtitle={noting?.name}
        icon={ClipboardList}
        onClose={() => setNoting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setNoting(null)}>Cancel</ActionButton>
            <ActionButton tone="primary" disabled={saving || !note.trim()} onClick={() => void saveNote()}>
              Log activity
            </ActionButton>
          </div>
        }
      >
        <TextArea label="What happened" value={note} onChange={setNote} rows={4} placeholder="Called the owner — wants the roofing price list before Friday." />
      </Modal>

      <Modal
        open={reassigning !== null}
        title={reassigning && reassigning.length > 1 ? `Reassign ${reassigning.length} depots` : 'Reassign depot'}
        subtitle="The new representative takes over visits, quotations and follow-ups."
        icon={UserCheck}
        onClose={() => setReassigning(null)}
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setReassigning(null)}>Cancel</ActionButton>
            <ActionButton tone="primary" disabled={saving || !reassignTo} onClick={() => void saveReassign()}>
              Reassign
            </ActionButton>
          </div>
        }
      >
        <SelectField
          label="Sales representative"
          value={reassignTo}
          onChange={setReassignTo}
          options={salesReps.map((r) => ({ value: r.id, label: `${r.name} · ${r.team}` }))}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove this depot?"
        body={`${confirmDelete?.name ?? ''} will be archived and removed from your list. Historical orders are kept.`}
        confirmLabel="Remove"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const target = confirmDelete;
          setConfirmDelete(null);
          if (!target) return;
          void write(() => depotsRepository.delete(target.id), 'Depot archived', target.name).then((ok) => {
            if (ok && detail?.id === target.id) setDetail(null);
          });
        }}
      />
    </PageBody>
  );
}
