'use client';

/**
 * Create or edit a condition definition — something a promotion's rule can test.
 *
 * Four questions, in order: what it is called, what fact the engine reads, whether that
 * fact is text or a number, and where the picker's values come from. With a `request.`
 * fact a brand-new condition needs no code change at all: the caller sends the value
 * as `attributes.KEY` when a promotion is evaluated.
 */

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Database, Globe, ListChecks, Loader2, Plus, Server, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Modal } from '@/components/feedback/feedback';
import {
  promotionCatalogApi,
  promotionErrorCode,
  promotionErrorMessage,
  type ConditionDefinitionDto,
  type ConditionValuesDto,
  type PromotionFactDto,
} from '../catalog-api';
import { usePromotionFacts, usePromotionValueSources, useSaveConditionDefinition } from '../hooks';
import { CODE_PATTERN, FormField, inputClass } from './type-dialog';

const CUSTOM = '__custom';
const SCOPE_LABEL: Record<string, string> = { customer: 'Customer', order: 'Order', line: 'Line' };

const SOURCES = [
  { key: 'Static', label: 'Fixed list', hint: 'Values you type here. Promotions may only use these.', icon: ListChecks },
  { key: 'Database', label: 'Platform data', hint: 'Distinct values in use in a platform column.', icon: Database },
  { key: 'Sap', label: 'SAP catalogue', hint: 'Synchronised SAP master data.', icon: Server },
  { key: 'Api', label: 'External URL', hint: 'The portal calls the URL to fill the picker.', icon: Globe },
] as const;

interface ValueRow {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

let rowSeq = 0;

export function ConditionDialog({
  definition,
  onClose,
}: {
  definition: ConditionDefinitionDto | 'new' | null;
  onClose: () => void;
}) {
  const editing = definition && definition !== 'new' ? definition : null;
  const save = useSaveConditionDefinition();
  const facts = usePromotionFacts();
  const sources = usePromotionValueSources();

  const [code, setCode] = useState(editing?.code ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 20));
  const [factKey, setFactKey] = useState(editing?.factKey ?? '');
  const [valueType, setValueType] = useState(editing?.valueType ?? 'Text');
  const [valueSource, setValueSource] = useState(editing?.valueSource ?? 'Static');
  const [sourceKey, setSourceKey] = useState(editing?.sourceKey ?? '');
  const [values, setValues] = useState<ValueRow[]>(
    () => editing?.values.map((v) => ({ id: rowSeq++, value: v.value, label: v.label ?? '', isActive: v.isActive })) ?? []
  );
  const [attempted, setAttempted] = useState(false);
  const [preview, setPreview] = useState<{ loading: boolean; data?: ConditionValuesDto; error?: string } | null>(null);

  const knownFact = facts.data?.find((f) => f.key === factKey);
  const isCustom = factKey.startsWith('request.') || (factKey !== '' && facts.data && !knownFact);
  const customKey = factKey.startsWith('request.') ? factKey.slice('request.'.length) : '';

  const factList = facts.data;
  const factsByScope = useMemo(() => {
    const map = new Map<string, PromotionFactDto[]>();
    (factList ?? []).forEach((f) => map.set(f.scope, [...(map.get(f.scope) ?? []), f]));
    return Array.from(map.entries());
  }, [factList]);

  const keysForSource = (sources.data ?? []).filter((s) => s.valueSource === valueSource);

  const errors = {
    code: editing ? undefined : !CODE_PATTERN.test(code.trim()) ? 'Start with a letter, then letters, digits or _ (max 64).' : undefined,
    name: !name.trim() ? 'Name is required.' : name.trim().length > 128 ? 'At most 128 characters.' : undefined,
    description: description.length > 1024 ? 'At most 1024 characters.' : undefined,
    factKey: !factKey.trim()
      ? 'Choose what this condition reads.'
      : factKey.startsWith('request.') && !/^request\.[A-Za-z][A-Za-z0-9_]*$/.test(factKey)
        ? 'Custom attribute: letters, digits or _ after request.'
        : undefined,
    sourceKey: valueSource !== 'Static' && !sourceKey.trim() ? (valueSource === 'Api' ? 'Enter the URL.' : 'Choose a source key.') : undefined,
    values: (() => {
      if (valueSource !== 'Static') return undefined;
      const filled = values.filter((v) => v.value.trim());
      const set = new Set(filled.map((v) => v.value.trim().toUpperCase()));
      if (set.size !== filled.length) return 'Two values are the same.';
      if (valueType === 'Number' && filled.some((v) => !Number.isFinite(Number(v.value)))) return 'Number conditions take numeric values.';
      return undefined;
    })(),
  };

  const serverCode = promotionErrorCode(save.error);
  const serverField: Partial<Record<keyof typeof errors | 'valueType', string>> = {};
  if (serverCode) {
    const msg = promotionErrorMessage(save.error);
    if (serverCode.endsWith('CodeTaken') || serverCode === 'Promotion.CatalogCodeInvalid') serverField.code = msg;
    else if (serverCode === 'Promotion.CatalogNameInvalid') serverField.name = msg;
    else if (serverCode === 'Promotion.CatalogDescriptionTooLong') serverField.description = msg;
    else if (serverCode === 'Promotion.ConditionFactInvalid') serverField.factKey = msg;
    else if (serverCode === 'Promotion.ConditionSourceKeyRequired') serverField.sourceKey = msg;
    else if (serverCode === 'Promotion.ConditionValueInvalid' || serverCode === 'Promotion.ConditionValueDuplicate') serverField.values = msg;
    else if (serverCode === 'Promotion.ConditionValueTypeInUse') serverField.valueType = msg;
  }
  const err = (k: keyof typeof errors) => (attempted ? errors[k] : undefined) ?? serverField[k];
  const generalError = save.isError && Object.keys(serverField).length === 0 ? promotionErrorMessage(save.error, 'The condition could not be saved.') : undefined;

  const pickFact = (key: string) => {
    if (key === CUSTOM) {
      setFactKey('request.');
      return;
    }
    setFactKey(key);
    // Suggest the value type the fact carries.
    const fact = facts.data?.find((f) => f.key === key);
    if (fact && (fact.valueType === 'Text' || fact.valueType === 'Number')) setValueType(fact.valueType);
  };

  const submit = () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) return;
    save.mutate(
      {
        id: editing?.id,
        data: {
          ...(editing ? {} : { code: code.trim() }),
          name: name.trim(),
          description: description.trim() || null,
          valueType,
          valueSource,
          sourceKey: valueSource === 'Static' ? null : sourceKey.trim(),
          factKey: factKey.trim(),
          sortOrder: Number(sortOrder) || 0,
          ...(valueSource === 'Static'
            ? {
                values: values
                  .filter((v) => v.value.trim())
                  .map((v) => ({ value: v.value.trim().toUpperCase(), label: v.label.trim() || v.value.trim().toUpperCase(), isActive: v.isActive })),
              }
            : {}),
        },
      },
      { onSuccess: onClose }
    );
  };

  const runPreview = async () => {
    if (!editing) return;
    setPreview({ loading: true });
    try {
      const data = await promotionCatalogApi.conditionValues(editing.id);
      setPreview({ loading: false, data });
    } catch (e) {
      setPreview({ loading: false, error: promotionErrorMessage(e, 'Could not load values.') });
    }
  };

  const move = (i: number, d: -1 | 1) =>
    setValues((rows) => {
      const next = [...rows];
      const j = i + d;
      if (j < 0 || j >= next.length) return rows;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <Modal
      open={definition !== null}
      onClose={onClose}
      icon={SlidersHorizontal}
      width="w-[min(760px,calc(100vw-32px))]"
      title={editing ? `Edit ${editing.name}` : 'New condition'}
      subtitle={editing ? `Code ${editing.code} cannot change` : 'Available in the rule builder as soon as it is saved'}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-lg border border-surface px-3 text-[12.5px] font-medium">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={save.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg gradient-primary px-4 text-[12.5px] font-semibold text-white disabled:opacity-50"
          >
            {save.isPending && <Loader2 size={13} className="animate-spin" />}
            {editing ? 'Save changes' : 'Create condition'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Step n={1} title="Identity">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_100px]">
            <FormField label="Code" error={err('code')} hint="What a rule stores. Fixed once created.">
              <input
                value={code}
                disabled={Boolean(editing)}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                placeholder="CustomerTier"
                className={`${inputClass} font-mono`}
              />
            </FormField>
            <FormField label="Name" error={err('name')}>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={128} placeholder="Customer tier" className={inputClass} />
            </FormField>
            <FormField label="Sort order">
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Description" error={err('description')} hint="Shown under the condition in the rule builder.">
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Loyalty tier" className={inputClass} />
            </FormField>
          </div>
        </Step>

        <Step n={2} title="What it reads" hint="The transaction fact the promotion engine checks.">
          <FormField
            label="Fact"
            error={err('factKey')}
            hint={knownFact?.description ?? (isCustom ? undefined : 'Pick a fact the platform reads itself, or a custom attribute.')}
          >
            <select value={isCustom ? CUSTOM : factKey} onChange={(e) => pickFact(e.target.value)} disabled={facts.isLoading} className={inputClass}>
              <option value="">{facts.isLoading ? 'Loading facts…' : 'Choose a fact…'}</option>
              {factsByScope.map(([scope, list]) => (
                <optgroup key={scope} label={SCOPE_LABEL[scope] ?? scope}>
                  {list.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.key} · {f.valueType}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={CUSTOM}>Custom attribute (request.KEY)…</option>
            </select>
          </FormField>
          {isCustom && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <FormField label="Attribute key">
                <div className="flex items-center rounded-lg border border-surface bg-card">
                  <span className="px-3 font-mono text-[12px] text-muted-foreground">request.</span>
                  <input
                    value={customKey}
                    onChange={(e) => setFactKey(`request.${e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')}`)}
                    placeholder="CUSTOMER_TIER"
                    className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[12.5px] outline-none"
                  />
                </div>
              </FormField>
              <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200">
                The platform cannot read this itself. The caller — the mobile app or the preview — must send it as{' '}
                <code className="font-mono">attributes.{customKey || 'KEY'}</code> when a promotion is evaluated.
              </p>
            </div>
          )}
        </Step>

        <Step n={3} title="Value type" hint="Decides the operators the rule builder offers.">
          <div className="grid grid-cols-2 gap-2 sm:w-96">
            {(['Text', 'Number'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValueType(t)}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  valueType === t ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-surface hover:bg-accent/30'
                }`}
              >
                <span className="block text-[12.5px] font-semibold text-main">{t}</span>
                <span className="block text-[10.5px] text-muted-foreground">{t === 'Text' ? 'is one of · is not one of' : '≥ · ≤ · between'}</span>
              </button>
            ))}
          </div>
          {serverField.valueType && <p className="mt-2 text-[11px] font-medium text-rose-600">{serverField.valueType}</p>}
          {editing && !serverField.valueType && (
            <p className="mt-2 text-[10.5px] text-muted-foreground">Locked by the server while any promotion uses this condition.</p>
          )}
        </Step>

        <Step n={4} title="Values" hint="Where the value picker in the rule builder gets its options.">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setValueSource(s.key);
                    setSourceKey('');
                    setPreview(null);
                  }}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    valueSource === s.key ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-surface hover:bg-accent/30'
                  }`}
                >
                  <Icon size={15} className={valueSource === s.key ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="mt-1 block text-[12px] font-semibold text-main">{s.label}</span>
                  <span className="block text-[10.5px] leading-snug text-muted-foreground">{s.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            {valueSource === 'Static' && (
              <div>
                {values.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-surface px-3 py-2.5 text-[11.5px] text-muted-foreground">
                    No values yet. An empty list accepts any value; once it has an active value, promotions may only use listed ones.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_1.4fr_70px_88px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>Value</span>
                      <span>Label</span>
                      <span>Active</span>
                      <span />
                    </div>
                    {values.map((row, i) => (
                      <div key={row.id} className="grid grid-cols-[1fr_1.4fr_70px_88px] items-center gap-2">
                        <input
                          value={row.value}
                          onChange={(e) => setValues((r) => r.map((x) => (x.id === row.id ? { ...x, value: e.target.value } : x)))}
                          onBlur={(e) => setValues((r) => r.map((x) => (x.id === row.id ? { ...x, value: e.target.value.trim().toUpperCase() } : x)))}
                          placeholder="GOLD"
                          className={`${inputClass} h-8 font-mono uppercase`}
                        />
                        <input
                          value={row.label}
                          onChange={(e) => setValues((r) => r.map((x) => (x.id === row.id ? { ...x, label: e.target.value } : x)))}
                          placeholder="Gold"
                          className={`${inputClass} h-8`}
                        />
                        <label className="flex items-center gap-1.5 text-[11.5px]">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) => setValues((r) => r.map((x) => (x.id === row.id ? { ...x, isActive: e.target.checked } : x)))}
                          />
                          {row.isActive ? 'Yes' : 'No'}
                        </label>
                        <span className="flex justify-end gap-0.5">
                          <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                            <ArrowUp size={12} />
                          </IconBtn>
                          <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === values.length - 1}>
                            <ArrowDown size={12} />
                          </IconBtn>
                          <IconBtn label="Remove" danger onClick={() => setValues((r) => r.filter((x) => x.id !== row.id))}>
                            <Trash2 size={12} />
                          </IconBtn>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setValues((r) => [...r, { id: rowSeq++, value: '', label: '', isActive: true }])}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-surface px-2.5 py-1.5 text-[11.5px] font-medium text-primary hover:bg-primary/5"
                >
                  <Plus size={12} /> Add value
                </button>
                {err('values') && <p className="mt-1.5 text-[11px] font-medium text-rose-600">{err('values')}</p>}
              </div>
            )}

            {(valueSource === 'Database' || valueSource === 'Sap') && (
              <div className="space-y-2">
                <FormField
                  label="Source key"
                  error={err('sourceKey')}
                  hint={keysForSource.find((k) => k.sourceKey === sourceKey)?.description ?? undefined}
                >
                  <select value={sourceKey} onChange={(e) => setSourceKey(e.target.value)} className={`${inputClass} sm:w-80`} disabled={sources.isLoading}>
                    <option value="">{sources.isLoading ? 'Loading sources…' : 'Choose…'}</option>
                    {keysForSource.map((k) => (
                      <option key={k.sourceKey} value={k.sourceKey}>
                        {k.sourceKey}
                      </option>
                    ))}
                    {sourceKey && !keysForSource.some((k) => k.sourceKey === sourceKey) && <option value={sourceKey}>{sourceKey}</option>}
                  </select>
                </FormField>
                {editing ? (
                  <div>
                    <button
                      type="button"
                      onClick={runPreview}
                      disabled={preview?.loading}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface px-3 text-[11.5px] font-medium hover:bg-accent/40"
                    >
                      {preview?.loading && <Loader2 size={12} className="animate-spin" />} Preview values
                    </button>
                    <span className="ml-2 text-[10.5px] text-muted-foreground">Shows the saved source. Save first after changing it.</span>
                    {preview?.error && <p className="mt-1.5 text-[11px] text-rose-600">{preview.error}</p>}
                    {preview?.data && (
                      <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-surface p-2">
                        {!preview.data.resolved ? (
                          <p className="text-[11px] text-muted-foreground">The server could not list values for this source.</p>
                        ) : preview.data.values.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">No values found.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <span className="w-full text-[10.5px] text-muted-foreground">{preview.data.values.length} values</span>
                            {preview.data.values.slice(0, 120).map((v) => (
                              <span key={v.value} title={v.label ?? undefined} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px]">
                                {v.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10.5px] text-muted-foreground">You can preview the values after the first save.</p>
                )}
              </div>
            )}

            {valueSource === 'Api' && (
              <FormField label="URL" error={err('sourceKey')} hint="The portal will call this URL to fill the picker.">
                <input value={sourceKey} onChange={(e) => setSourceKey(e.target.value)} placeholder="https://…" className={`${inputClass} font-mono`} />
              </FormField>
            )}
          </div>
        </Step>

        {generalError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{generalError}</p>}
      </div>
    </Modal>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-surface p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{n}</span>
        <div>
          <p className="text-[13px] font-semibold text-main">{title}</p>
          {hint && <p className="text-[10.5px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground disabled:opacity-30 ${
        danger ? 'hover:bg-rose-500/10 hover:text-rose-600' : 'hover:bg-accent/50'
      }`}
    >
      {children}
    </button>
  );
}
