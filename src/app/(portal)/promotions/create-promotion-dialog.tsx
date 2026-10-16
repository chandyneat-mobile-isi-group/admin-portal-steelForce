'use client';

/**
 * Creates a promotion.
 *
 * Nothing on this form is hard-coded catalogue data. The type list comes from
 * `promotion-types`, the rule builder from `promotion-conditions`, and links to other
 * promotions from the catalogue itself — so a type or condition an administrator adds
 * under Configuration is offered here straight away.
 *
 * A new promotion always sends the nested `rule`; it evaluates identically to the flat
 * form, and there is no older shape to preserve.
 *
 * It creates a **Draft**. Nothing here can make a discount live: submit, the two
 * signatures and activation are separate acts with separate permissions, and each is
 * taken on the promotion's own page.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AlertCircle, Link2, ListTree, Loader2, Plus, Settings2, Trash2, X } from 'lucide-react';
import {
  byCatalogOrder,
  promotionErrorCode,
  promotionErrorMessage,
  useCreatePromotion,
  usePromotionConditions,
  usePromotionTypes,
} from '@/features/promotions';
import { RuleBuilder } from '@/features/promotions/rule/rule-builder';
import { newGroup, nodeAsTree, summarizeRule, toInput, validateRule, type GroupNode } from '@/features/promotions/rule/rule-tree';
import {
  RelationshipsEditor,
  validateRelationships,
  type RelationshipRow,
} from '@/features/promotions/rule/relationships-editor';
import { useAuth } from '@/lib/auth/auth-context';

/** One quantity band. Held as strings so a half-typed number is not coerced to 0. */
interface TierRow {
  min: string;
  max: string;
  value: string;
  free: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearEnd(): string {
  return `${new Date().getFullYear()}-12-31`;
}

export function CreatePromotionDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const create = useCreatePromotion();

  const { can } = useAuth();
  const types = usePromotionTypes(false);
  const conditionCatalog = usePromotionConditions(true);
  const activeTypes = useMemo(() => [...(types.data ?? [])].filter((t) => t.isActive).sort(byCatalogOrder), [types.data]);

  const [code, setCode] = useState('');
  const [chosenType, setChosenType] = useState('');
  // The first active type until the author picks one.
  const businessType = chosenType || activeTypes[0]?.code || '';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validFrom, setValidFrom] = useState(today());
  const [validTo, setValidTo] = useState(yearEnd());
  const [rewardType, setRewardType] = useState('Percentage');
  const [rewardValue, setRewardValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [priority, setPriority] = useState('10');
  const [requiresSapSync, setRequiresSapSync] = useState(true);
  const [sapConditionType, setSapConditionType] = useState('');
  const [rule, setRule] = useState<GroupNode>(() => newGroup('And'));
  const [links, setLinks] = useState<RelationshipRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  // Problems are shown once the author tries to save, not while they are typing.
  const [attempted, setAttempted] = useState(false);

  const ruleIssues = validateRule(rule, conditionCatalog.data);
  const linkIssues = validateRelationships(links);
  const errorCode = promotionErrorCode(create.error);

  // A tier is only a tier once it has a lower bound; a blank row the user added and
  // did not fill is dropped rather than sent as a zero-quantity band.
  const filledTiers = tiers.filter((row) => row.min.trim().length > 0);

  const valid =
    businessType.length > 0 &&
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    validFrom.length === 10 &&
    validTo.length === 10 &&
    // Enforced here as well as on the server because the server enforces it at
    // *submission*, by which point the draft exists and the author has moved on.
    (!requiresSapSync || sapConditionType.trim().length === 4) &&
    (rewardType !== 'FreeItem' || filledTiers.length > 0);

  const submit = () => {
    setAttempted(true);
    if (ruleIssues.length > 0 || Object.keys(linkIssues).length > 0) return;

    create.mutate(
      {
        code: code.trim().toUpperCase(),
        businessType,
        name: name.trim(),
        description: description.trim(),
        validFrom,
        validTo,
        priority: Number(priority) || 0,
        rewardType,
        // A tiered promotion takes its reward from its tiers; sending both is refused
        // by the server as Promotion.RewardValueWithTiers, so the flat value is dropped
        // rather than shown back to the author as an error they did not cause.
        rewardValue: filledTiers.length > 0 || rewardValue === '' ? null : Number(rewardValue),
        // Only meaningful for a per-unit amount; a percentage has no currency.
        currency: rewardType === 'FixedAmount' ? currency : null,
        requiresSapSync,
        sap: requiresSapSync ? { conditionType: sapConditionType.trim() } : undefined,
        tiers: filledTiers.map((row) => ({
          minQuantity: Number(row.min),
          // Blank means open-ended, which only the last tier may be — left to the
          // server, which owns the rule and can say so precisely.
          maxQuantity: row.max.trim() === '' ? null : Number(row.max),
          value: row.value.trim() === '' ? null : Number(row.value),
          freeQuantity: row.free.trim() === '' ? null : Number(row.free),
        })),
        rule: toInput(rule),
        relationships: links.map((l) => ({ relatedPromotionId: l.relatedPromotionId, type: l.type })),
      },
      {
        onSuccess: (created) => {
          onClose();
          router.push(`/promotions/${created.id}`);
        },
      }
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New promotion"
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-4xl rounded-card bg-background border border-surface shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface">
          <div>
            <p className="text-[13.5px] font-semibold text-main">New promotion</p>
            <p className="text-[11.5px] text-muted-foreground">
              Saved as a draft. Approval and activation happen afterwards.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-main">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Code">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="COD-001"
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent uppercase"
              />
            </Field>
            <Field label="Type">
              <select
                value={businessType}
                onChange={(event) => setChosenType(event.target.value)}
                disabled={types.isLoading || activeTypes.length === 0}
                className={`w-full text-[12.5px] rounded-xl border px-3 py-2 bg-transparent disabled:opacity-60 ${
                  errorCode === 'Promotion.TypeNotFound' || errorCode === 'Promotion.TypeInactive' ? 'border-rose-400' : 'border-surface'
                }`}
              >
                {types.isLoading && <option value="">Loading types…</option>}
                {!types.isLoading && activeTypes.length === 0 && <option value="">No active types</option>}
                {activeTypes.map((type) => (
                  <option key={type.id} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
              {types.isError ? (
                <span className="block text-[11px] text-rose-600 mt-1">Could not load the type catalogue.</span>
              ) : (
                activeTypes.find((t) => t.code === businessType)?.description && (
                  <span className="block text-[11px] text-muted-foreground mt-1">
                    {activeTypes.find((t) => t.code === businessType)?.description}
                  </span>
                )
              )}
            </Field>
          </div>

          <Field label="Name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cash on delivery 1%"
              className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Who gets this and why. An approver reads it."
              className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
            />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Valid from">
              <input
                type="date"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            <Field label="Valid to">
              <input
                type="date"
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            <Field label="Priority">
              <input
                type="number"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                title="Higher applies first. Exclusive / non-stackable promotions win over lower ones unless linked with Combines with."
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            <Field label="Reward">
              <select
                value={rewardType}
                onChange={(event) => setRewardType(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              >
                <option value="Percentage">Percentage</option>
                <option value="FixedAmount">Fixed amount</option>
                <option value="FreeItem">Free item</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={rewardType === 'Percentage' ? 'Percent' : 'Amount per unit'}>
              <input
                type="number"
                step="0.01"
                value={rewardValue}
                onChange={(event) => setRewardValue(event.target.value)}
                className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
              />
            </Field>
            {rewardType === 'FixedAmount' && (
              <Field label="Currency">
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
                />
              </Field>
            )}
          </div>

          <p className="-mt-2 text-[11px] text-muted-foreground">
            Priority: higher applies first. Exclusive / non-stackable promotions win over lower ones unless linked
            with <i>Combines with</i>.
          </p>

          <Section
            icon={ListTree}
            title="Who gets it — rule"
            hint="Build the conditions with ALL of / ANY of groups. Nest a group for logic like (A or B) and C."
            action={
              can('promotions.configure') ? (
                <Link
                  href="/promotions/configuration/conditions"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary"
                >
                  <Settings2 size={12} /> Manage conditions
                </Link>
              ) : undefined
            }
          >
            {conditionCatalog.isError ? (
              <p className="text-[12px] text-rose-600">Could not load the condition catalogue.</p>
            ) : (
              <RuleBuilder
                value={rule}
                onChange={setRule}
                definitions={conditionCatalog.data}
                loading={conditionCatalog.isLoading}
                issues={ruleIssues}
                showIssues={attempted}
              />
            )}
            <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground">
              <span className="font-semibold text-main">In words: </span>
              {summarizeRule(nodeAsTree(rule), conditionCatalog.data)}
            </p>
            {errorCode?.startsWith('Promotion.Condition') || errorCode === 'Promotion.RuleInvalid' ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-rose-600">
                <AlertCircle size={13} /> {promotionErrorMessage(create.error)}
              </p>
            ) : null}
          </Section>

          <Section
            icon={Link2}
            title="Linked promotions"
            hint="Optional. Make this promotion depend on, require, exclude or combine with another one."
          >
            <RelationshipsEditor
              rows={links}
              onChange={setLinks}
              showIssues={attempted}
              serverError={errorCode?.startsWith('Promotion.Relationship') ? promotionErrorMessage(create.error) : undefined}
            />
          </Section>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Quantity tiers{' '}
                <span className="normal-case tracking-normal text-[10.5px]">— optional</span>
              </span>
              <button
                onClick={() => setTiers((rows) => [...rows, { min: '', max: '', value: '', free: '' }])}
                className="inline-flex items-center gap-1 text-[11.5px] text-primary"
              >
                <Plus size={11} /> Add
              </button>
            </div>

            {tiers.length === 0 ? (
              <p className="text-[11.5px] text-muted-foreground">
                {rewardType === 'FreeItem'
                  ? 'A free-item promotion needs at least one tier — the quantity bought and how many come free.'
                  : 'Leave empty for a flat reward. Add tiers for a discount that steps up with quantity.'}
              </p>
            ) : (
              <div className="space-y-2">
                {/* A tiered promotion takes its reward from its tiers, so the flat value
                    above is cleared on submit rather than sent and refused. */}
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>From qty</span>
                  <span>To qty</span>
                  <span>{rewardType === 'Percentage' ? 'Percent' : 'Amount'}</span>
                  <span>Free qty</span>
                  <span />
                </div>
                {tiers.map((row, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
                    {(['min', 'max', 'value', 'free'] as const).map((key) => (
                      <input
                        key={key}
                        type="number"
                        step="0.01"
                        value={row[key]}
                        onChange={(event) =>
                          setTiers((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, [key]: event.target.value } : r))
                          )
                        }
                        // Only the last tier may be open-ended, which the server enforces.
                        placeholder={key === 'max' && index === tiers.length - 1 ? 'open' : ''}
                        className="min-w-0 text-[12px] rounded-xl border border-surface px-2 py-2 bg-transparent"
                      />
                    ))}
                    <button
                      onClick={() => setTiers((rows) => rows.filter((_, i) => i !== index))}
                      aria-label="Remove tier"
                      className="text-muted-foreground hover:text-rose-600 px-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1 border-t border-surface">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground pt-3">
              <input
                type="checkbox"
                checked={requiresSapSync}
                onChange={(event) => setRequiresSapSync(event.target.checked)}
              />
              Needs a SAP condition record before it can go live
            </label>

            {/* Not cosmetic: the server refuses to *submit* a SAP-required version
                without a condition type, so a promotion created without one here can be
                saved and then never moved. Asked for at creation rather than discovered
                at the review stage. */}
            {requiresSapSync && (
              <Field label="SAP condition type">
                <input
                  value={sapConditionType}
                  onChange={(event) => setSapConditionType(event.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="ZD02"
                  className="w-full sm:w-40 text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent uppercase"
                />
                <span className="block text-[11px] text-muted-foreground mt-1">
                  Four characters. Required before this can be submitted for approval.
                </span>
              </Field>
            )}
          </div>

          {attempted && (ruleIssues.length > 0 || Object.keys(linkIssues).length > 0) && (
            <p className="flex items-center gap-1.5 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> Fix the highlighted rule or link rows before saving.
            </p>
          )}
          {create.isError && (
            <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 break-words">
              {promotionErrorMessage(create.error, 'The promotion could not be created.')}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-surface">
          <button onClick={onClose} className="px-3 py-2 rounded-xl border border-surface text-[12.5px] text-main">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || create.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[12.5px] font-medium disabled:opacity-50"
          >
            {create.isPending && <Loader2 size={13} className="animate-spin" />}
            Create draft
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  icon: typeof ListTree;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-surface p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-main">{title}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
