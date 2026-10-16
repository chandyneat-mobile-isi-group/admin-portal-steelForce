'use client';

import { PageBody } from '@/components/layout/page-layout';
import { PageHeader, ActionButton } from '@/components/layout/page-header';
import { FormSection, SelectField, TextArea, TextField } from '@/components/forms/form';
import { MetaPill } from '@/components/shared/status-pill';
import { ConfirmDialog } from '@/components/feedback/feedback';
import {
  DEPOT_CATEGORIES,
  DEPOT_SEGMENTS,
  DEPOT_STATUSES,
  INDUSTRIES,
  MY_REP_IDS,
  PAYMENT_TERMS,
  depotDocuments,
  depotsRepository,
  type CreateDepotInput,
} from '@/features/depots';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  Save,
  Send,
  User,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { districtsByProvince, salesReps, CUSTOMER_TYPES, DIVISIONS, PROVINCES, SALES_ORGS, TEAMS } from '@/features/planning';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Six sections, presented as three steps.
 *
 * A single 30-field wall is the usual reason CRM records get created badly.
 * Grouping the fields and validating per step means the user is never told
 * about a problem three screens away from where they made it.
 */
const STEPS = [
  { id: 'identity', label: 'Identity & contact', icon: Building2 },
  { id: 'location', label: 'Location & terms', icon: MapPin },
  { id: 'assignment', label: 'Assignment & notes', icon: UserCheck },
] as const;

type StepId = (typeof STEPS)[number]['id'];

interface FormState {
  type: string;
  name: string;
  code: string;
  registrationNo: string;
  industry: string;
  category: string;
  status: string;
  contactPerson: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  province: string;
  district: string;
  commune: string;
  street: string;
  postalCode: string;
  gps: string;
  monthlyRevenue: string;
  creditLimit: string;
  paymentTerms: string;
  preferredProducts: string;
  segment: string;
  repId: string;
  territory: string;
  salesOrg: string;
  division: string;
  notes: string;
}

const EMPTY: FormState = {
  type: '',
  name: '',
  code: '',
  registrationNo: '',
  industry: '',
  category: 'Standard',
  status: 'Prospect',
  contactPerson: '',
  jobTitle: '',
  phone: '',
  email: '',
  website: '',
  province: '',
  district: '',
  commune: '',
  street: '',
  postalCode: '',
  gps: '',
  monthlyRevenue: '',
  creditLimit: '',
  paymentTerms: 'Net 30',
  preferredProducts: '',
  segment: 'Small business',
  repId: '',
  territory: '',
  salesOrg: 'ISI Distribution',
  division: 'Retail',
  notes: '',
};

/** "11.5564, 104.9282" → coordinates, or nothing if it does not parse. */
function parseGps(value: string): { lat: number; lng: number } | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const toNumber = (value: string) => Number(value.replace(/[^\d.]/g, '')) || 0;

/** The form, as the repository's create input. */
function toInput(form: FormState, code: string): CreateDepotInput {
  const gps = parseGps(form.gps);
  const street = [form.street.trim(), form.commune.trim()].filter(Boolean).join(', ');
  const notes = [
    form.notes.trim(),
    form.preferredProducts.trim() && `Preferred products: ${form.preferredProducts.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    type: form.type,
    name: form.name.trim(),
    code: form.code.trim() || code || undefined,
    registrationNo: form.registrationNo.trim(),
    industry: form.industry,
    category: form.category,
    contactPerson: form.contactPerson.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    province: form.province,
    district: form.district,
    address: [street, form.district, form.province].filter(Boolean).join(', '),
    addressLine1: street,
    postalCode: form.postalCode.trim(),
    lat: gps?.lat,
    lng: gps?.lng,
    monthlyRevenue: toNumber(form.monthlyRevenue),
    creditLimit: toNumber(form.creditLimit),
    paymentTerms: form.paymentTerms,
    segment: form.segment,
    repId: form.repId || undefined,
    salesOrg: form.salesOrg,
    division: form.division,
    notes,
    contacts: form.contactPerson.trim()
      ? [{ id: 'c1', name: form.contactPerson.trim(), role: form.jobTitle.trim() || 'Owner', phone: form.phone.trim(), email: form.email.trim(), isPrimary: true }]
      : [],
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

/** Only the fields a record genuinely cannot exist without are required. */
function validateStep(step: StepId, form: FormState): Errors {
  const errors: Errors = {};
  if (step === 'identity') {
    if (!form.type) errors.type = 'Choose a depot type';
    if (!form.name.trim()) errors.name = 'Company name is required';
    else if (form.name.trim().length < 3) errors.name = 'Use the registered trading name';
    if (!form.contactPerson.trim()) errors.contactPerson = 'A contact person is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
  }
  if (step === 'location') {
    if (!form.province) errors.province = 'Province is required';
    if (!form.street.trim()) errors.street = 'Street address is required';
    if (form.creditLimit && Number.isNaN(Number(form.creditLimit))) {
      errors.creditLimit = 'Enter a number';
    }
  }
  if (step === 'assignment') {
    if (!form.repId) errors.repId = 'Assign a sales representative';
  }
  return errors;
}

export default function NewDepotPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [visited, setVisited] = useState<StepId[]>(['identity']);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the field's error as soon as the user edits it, rather than
    // leaving stale red text under a field they have already fixed.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const districtOptions = useMemo(
    () => (form.province ? districtsByProvince[form.province] ?? [] : []),
    [form.province]
  );

  const repOptions = useMemo(
    () => salesReps.map((r) => ({ value: r.id, label: `${r.name} · ${r.team}` })),
    []
  );

  // Smart default: the code is derived from the name until the user overrides it.
  const suggestedCode = useMemo(() => {
    if (!form.name.trim()) return '';
    const initials = form.name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
    return `C${initials}${String(form.name.length * 137).slice(0, 4)}`;
  }, [form.name]);

  const goTo = (index: number) => {
    setStepIndex(index);
    setVisited((prev) =>
      prev.includes(STEPS[index].id) ? prev : [...prev, STEPS[index].id]
    );
  };

  const next = () => {
    const found = validateStep(step.id, form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Check the highlighted fields', {
        description: 'A few required details are missing on this step.',
      });
      return;
    }
    if (isLast) {
      void submit();
      return;
    }
    goTo(stepIndex + 1);
  };

  /**
   * Creates the depot, attaches the files, and — unless it is a draft — submits it for
   * approval. Returns the new record's id, or null when the write failed.
   */
  const persist = async (asDraft: boolean): Promise<string | null> => {
    setSaving(true);
    try {
      const depot = await depotsRepository.create(toInput(form, suggestedCode));
      for (const file of attachments) {
        await depotDocuments.upload(depot.id, file);
      }
      if (!asDraft) await depotsRepository.submit(depot.id);
      return depot.id;
    } catch (cause) {
      toast.error('The depot could not be saved', {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!form.name.trim()) {
      setErrors((prev) => ({ ...prev, name: 'Name the depot before saving a draft' }));
      goTo(0);
      toast.error('A draft needs at least a company name.');
      return;
    }
    if (!(await persist(true))) return;
    toast.success('Draft saved', {
      description: `${form.name.trim()} is in the depot directory as a draft. Submit it for approval from there.`,
    });
    router.push('/depots');
  };

  const submit = async (andAnother = false) => {
    if (saving) return;
    // Validate everything, not only the visible step — a user can jump
    // straight to the last step using the stepper.
    const all: Errors = STEPS.reduce<Errors>(
      (acc, s) => ({ ...acc, ...validateStep(s.id, form) }),
      {}
    );
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const firstBad = STEPS.findIndex((s) => Object.keys(validateStep(s.id, form)).length > 0);
      goTo(Math.max(0, firstBad));
      toast.error('Some required details are missing', {
        description: 'We moved you to the first step that needs attention.',
      });
      return;
    }

    if (!(await persist(false))) return;

    toast.success('Depot created', {
      description: `${form.name} has been added, assigned to ${
        salesReps.find((r) => r.id === form.repId)?.name ?? 'its rep'
      } and sent for approval.`,
    });

    if (andAnother) {
      // Keep the territory context — creating a batch for one area is the
      // common case, and re-picking the province each time is friction.
      setForm({ ...EMPTY, province: form.province, repId: form.repId, territory: form.territory });
      setAttachments([]);
      setErrors({});
      goTo(0);
      return;
    }
    // My Depots shows this login's territory; a depot handed to another rep is found
    // in the full directory instead, where new registrations sort first.
    router.push(MY_REP_IDS.includes(form.repId) ? '/depots/my' : '/depots');
  };

  const addFiles = (files: FileList | null) => {
    const picked = Array.from(files ?? []);
    const tooBig = picked.filter((f) => f.size > 10 * 1024 * 1024);
    if (tooBig.length > 0) toast.error(`${tooBig.map((f) => f.name).join(', ')} is over 10 MB.`);
    setAttachments((prev) => [...prev, ...picked.filter((f) => f.size <= 10 * 1024 * 1024)]);
  };

  const completion = Math.round(
    (Object.entries(form).filter(([, v]) => String(v).trim()).length /
      Object.keys(form).length) *
      100
  );

  return (
    <PageBody>
      <PageHeader
        title="New Depot"
        subtitle="Create a trading account. Only the essentials are required — everything else can be completed later."
        meta={
          <>
            <MetaPill label={`Step ${stepIndex + 1} of ${STEPS.length}`} />
            <MetaPill label={`${completion}% complete`} />
          </>
        }
        actions={
          <>
            <ActionButton icon={X} onClick={() => setConfirmCancel(true)}>
              Cancel
            </ActionButton>
            <ActionButton icon={Save} disabled={saving} onClick={() => void saveDraft()}>
              Save draft
            </ActionButton>
          </>
        }
      />

      {/* Stepper — clickable so a user can jump back without losing input */}
      <nav aria-label="Form steps" className="rounded-card border border-surface bg-card p-2">
        <ol className="flex flex-col sm:flex-row gap-1">
          {STEPS.map((s, i) => {
            const active = i === stepIndex;
            const done = visited.includes(s.id) && i < stepIndex;
            return (
              <li key={s.id} className="flex-1">
                <button
                  onClick={() => goTo(i)}
                  aria-current={active ? 'step' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    active ? 'bg-primary/10' : 'hover:bg-accent/40'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                      active
                        ? 'gradient-primary text-white'
                        : done
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[12.5px] font-semibold truncate ${
                        active ? 'text-primary' : 'text-main'
                      }`}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="space-y-6"
        >
          {step.id === 'identity' && (
            <>
              <FormSection
                title="Basic information"
                description="How this account is identified across the portal."
                icon={Building2}
                step={1}
              >
                <SelectField label="Depot type" required value={form.type} onChange={set('type')} options={CUSTOMER_TYPES} error={errors.type} />
                <SelectField label="Status" value={form.status} onChange={set('status')} options={DEPOT_STATUSES} hint="New accounts start as Prospect and become Active once approved" />
                <TextField label="Company name" required value={form.name} onChange={set('name')} placeholder="Mekong Construction Supply" error={errors.name} full />
                <TextField label="Depot ID" value={form.code} onChange={set('code')} placeholder={suggestedCode || 'Auto-generated'} hint={suggestedCode ? `Suggested: ${suggestedCode}` : 'Left blank, this is generated on save'} />
                <TextField label="Business registration no." value={form.registrationNo} onChange={set('registrationNo')} placeholder="KH-123456-01" />
                <SelectField label="Industry" value={form.industry} onChange={set('industry')} options={INDUSTRIES} />
                <SelectField label="Depot category" value={form.category} onChange={set('category')} options={DEPOT_CATEGORIES} />
              </FormSection>

              <FormSection
                title="Contact information"
                description="The person the sales rep will actually deal with."
                icon={User}
                step={2}
              >
                <TextField label="Contact person" required value={form.contactPerson} onChange={set('contactPerson')} placeholder="Sok Dara" error={errors.contactPerson} />
                <TextField label="Job title" value={form.jobTitle} onChange={set('jobTitle')} placeholder="Purchasing Manager" />
                <TextField label="Phone" required type="tel" value={form.phone} onChange={set('phone')} placeholder="+855 12 345 678" error={errors.phone} />
                <TextField label="Email" type="email" value={form.email} onChange={set('email')} placeholder="purchasing@company.com.kh" error={errors.email} />
                <TextField label="Website" value={form.website} onChange={set('website')} placeholder="www.company.com.kh" full />
              </FormSection>
            </>
          )}

          {step.id === 'location' && (
            <>
              <FormSection title="Address" description="Used for delivery routing and territory assignment." icon={MapPin} step={3}>
                <SelectField label="Province" required value={form.province} onChange={set('province')} options={PROVINCES} error={errors.province} />
                <SelectField label="District" value={form.district} onChange={set('district')} options={districtOptions} placeholder={form.province ? 'Select…' : 'Choose a province first'} />
                <TextField label="Commune / Sangkat" value={form.commune} onChange={set('commune')} placeholder="Boeung Keng Kang" />
                <TextField label="Postal code" value={form.postalCode} onChange={set('postalCode')} placeholder="12302" />
                <TextField label="Street address" required value={form.street} onChange={set('street')} placeholder="#42, St. 271" error={errors.street} full />
                <TextField label="GPS location" value={form.gps} onChange={set('gps')} placeholder="11.5564, 104.9282" hint="Paste coordinates, or capture them on the first visit" full />

                {/* Location preview — a schematic, not a live basemap */}
                <div className="sm:col-span-2 rounded-card border border-surface overflow-hidden">
                  <div className="relative h-[140px] bg-muted/40">
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          'linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                        <MapPin size={15} className="text-white" />
                      </span>
                      <p className="text-[11.5px] font-medium text-main">
                        {form.street || 'Address preview'}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {[form.district, form.province].filter(Boolean).join(', ') ||
                          'Enter an address to preview the location'}
                      </p>
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Business information" description="Commercial terms. All optional at creation time." icon={Wallet} step={4}>
                <TextField label="Estimated monthly revenue" prefix="$" value={form.monthlyRevenue} onChange={set('monthlyRevenue')} placeholder="12,000" />
                <TextField label="Credit limit" prefix="$" value={form.creditLimit} onChange={set('creditLimit')} placeholder="20,000" error={errors.creditLimit} hint="Requests above $50,000 route for approval" />
                <SelectField label="Payment terms" value={form.paymentTerms} onChange={set('paymentTerms')} options={PAYMENT_TERMS} />
                <SelectField label="Depot segment" value={form.segment} onChange={set('segment')} options={DEPOT_SEGMENTS} />
                <TextField label="Preferred products" value={form.preferredProducts} onChange={set('preferredProducts')} placeholder="Deformed bar, zinc roofing sheet" full />
              </FormSection>
            </>
          )}

          {step.id === 'assignment' && (
            <>
              <FormSection title="Assignment" description="Who owns this relationship." icon={UserCheck} step={5}>
                <SelectField label="Sales representative" required value={form.repId} onChange={set('repId')} options={repOptions} error={errors.repId} />
                <SelectField label="Sales territory" value={form.territory} onChange={set('territory')} options={TEAMS} />
                <SelectField label="Sales organisation" value={form.salesOrg} onChange={set('salesOrg')} options={SALES_ORGS} />
                <SelectField label="Division" value={form.division} onChange={set('division')} options={DIVISIONS} />
              </FormSection>

              <FormSection title="Additional information" description="Anything the next person visiting should know." icon={ClipboardList} step={6}>
                <TextArea label="Notes" value={form.notes} onChange={set('notes')} rows={4} placeholder="Owner prefers deliveries before 10:00. Rear gate access for trucks." />
                <div className="sm:col-span-2">
                  <p className="text-[12px] font-medium text-main mb-1.5">Attachments</p>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      addFiles(e.dataTransfer.files);
                    }}
                    className="w-full rounded-card border border-dashed border-surface p-6 text-center hover:border-primary/40 hover:bg-accent/30 transition-colors"
                  >
                    <p className="text-[12px] font-medium text-main">Drop files or click to upload</p>
                    <p className="text-[10.5px] text-muted-foreground mt-1">
                      PDF, JPG or PNG · up to 10 MB each
                    </p>
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {attachments.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((file, i) => (
                        <li
                          key={`${file.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-surface px-3 py-2 text-[11.5px]"
                        >
                          <span className="truncate text-main">{file.name}</span>
                          <span className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                            <button
                              type="button"
                              aria-label={`Remove ${file.name}`}
                              onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                              className="hover:text-rose-600"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </FormSection>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer actions stay in the flow so they never cover the last field */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface bg-card p-3">
        <ActionButton
          icon={ChevronLeft}
          onClick={() => goTo(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
        >
          Back
        </ActionButton>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={Send} disabled={saving} onClick={() => void submit(true)}>
            Save &amp; create another
          </ActionButton>
          <ActionButton icon={isLast ? Check : ChevronRight} tone="primary" disabled={saving} onClick={next}>
            {saving ? 'Saving…' : isLast ? 'Create depot' : 'Continue'}
          </ActionButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Discard this depot?"
        body="Everything you have entered will be lost. Save it as a draft instead if you want to come back to it."
        confirmLabel="Discard"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => router.push('/depots/my')}
      />
    </PageBody>
  );
}
