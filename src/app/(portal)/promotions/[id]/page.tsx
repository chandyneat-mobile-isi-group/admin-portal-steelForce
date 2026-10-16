'use client';

/**
 * One promotion: its versions, and the decisions available on the open one.
 *
 * ## Approval is not activation
 *
 * Finance approving a version prices nothing. `activate` does, and it is a separate call
 * behind a separate permission. They are shown as two distinct buttons, never collapsed
 * into one "approve", because conflating them is how a discount nobody switched on gets
 * reported as being given.
 *
 * ## Four eyes
 *
 * The server refuses a signature from whoever submitted the version, and refuses one
 * person signing both stages. That refusal arrives as `Promotion.SelfApproval`, which is
 * surfaced verbatim rather than hidden — an approver seeing "you cannot approve a
 * promotion you submitted" learns the rule; a greyed-out button teaches nothing.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Link2,
  Gavel,
  Layers,
  Loader2,
  Route,
  Send,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { AppLayout } from '@/lib/utilities/layout';
import { SectionHeader } from '@/components/layout/section-header';
import {
  typeLabel,
  StatusChip,
  rewardLabel,
  usePromotion,
  usePromotionConditions,
  usePromotionTransition,
  useSyncPromotionToSap,
  type PromotionVersionDto,
} from '@/features/promotions';
import {
  ApprovalPath,
  TierLadder,
  ValidityWindow,
  VersionTimeline,
  nextStepLine,
  when,
} from '@/features/promotions/components/promotion-detail';
import { RelationshipList, RuleTreeView } from '@/features/promotions/rule/rule-view';
import { ruleOf } from '@/features/promotions/rule/rule-tree';

type Action = 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate' | 'cancel';

/** Which actions make sense at each status, and which need a written reason. */
const ACTIONS: Record<string, { action: Action; label: string; tone: string; needsReason?: boolean }[]> = {
  Draft: [
    { action: 'submit', label: 'Submit for approval', tone: 'primary' },
    { action: 'cancel', label: 'Cancel', tone: 'ghost', needsReason: true },
  ],
  UnderCommercialReview: [
    { action: 'approve', label: 'Approve — commercial', tone: 'go' },
    { action: 'reject', label: 'Reject', tone: 'stop', needsReason: true },
  ],
  UnderFinanceReview: [
    { action: 'approve', label: 'Approve — finance', tone: 'go' },
    { action: 'reject', label: 'Reject', tone: 'stop', needsReason: true },
  ],
  Approved: [
    { action: 'activate', label: 'Activate', tone: 'go' },
    { action: 'cancel', label: 'Cancel', tone: 'ghost', needsReason: true },
  ],
  Active: [{ action: 'deactivate', label: 'Deactivate', tone: 'stop', needsReason: true }],
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value === null || value === undefined || value === '';

  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</dt>
      <dd className={`text-[13px] break-words ${empty ? 'text-muted-foreground' : 'text-main font-semibold'}`}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

export default function PromotionDetailPage() {
  const params = useParams();
  const id = (params.id as string) ?? '';

  const { data: promotion, isLoading, isError, error } = usePromotion(id);
  const transition = usePromotionTransition(id);
  const sapSync = useSyncPromotionToSap(id);
  // Labels for condition codes and static values; inactive ones included.
  const conditionCatalog = usePromotionConditions(true);

  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  // Which version is on screen. Decisions always act on the open one; this only
  // changes what is being read.
  const [viewingNumber, setViewingNumber] = useState<number | null>(null);

  if (isLoading) {
    return (
      <PageBody>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-[13px] py-16">
          <Loader2 size={15} className="animate-spin" /> Loading promotion…
        </div>
      </PageBody>
    );
  }

  if (isError || !promotion) {
    return (
      <PageBody>
        <Card className="p-6 rounded-card border-surface card-shadow">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-main">This promotion could not be loaded.</p>
              <p className="text-[12px] text-muted-foreground mt-1 break-words">
                {error instanceof Error ? error.message : 'It may have been removed.'}
              </p>
              <Link href="/promotions" className="inline-flex items-center gap-1 text-[12px] text-primary mt-3">
                <ArrowLeft size={12} /> Back to promotions
              </Link>
            </div>
          </div>
        </Card>
      </PageBody>
    );
  }

  const versions = [...promotion.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const open: PromotionVersionDto | undefined =
    versions.find((version) => version.versionNumber === promotion.openVersionNumber) ?? versions[0];
  const live = versions.find((version) => version.versionNumber === promotion.liveVersionNumber);
  const shown = versions.find((version) => version.versionNumber === viewingNumber) ?? open;
  const readingOther = Boolean(shown && open && shown.versionNumber !== open.versionNumber);

  const available = open ? (ACTIONS[open.status] ?? []) : [];
  const chosen = available.find((entry) => entry.action === pending);
  const busy = transition.isPending || sapSync.isPending;
  const next = nextStepLine(open?.status);

  const run = (action: Action, needsReason?: boolean) => {
    if (needsReason && reason.trim().length < 3) {
      setPending(action);

      return;
    }

    transition.mutate(
      { action, reason: needsReason ? reason.trim() : undefined },
      {
        onSuccess: () => {
          setPending(null);
          setReason('');
        },
      }
    );
  };

  return (
    <PageBody>
      {/* ── Hero: what it is, what it gives, when, and where it stands ── */}
      <Card className="relative overflow-hidden p-0 rounded-card border-surface card-shadow">
        <div className="absolute inset-x-0 top-0 h-1 gradient-primary" />
        <div className="p-6">
          <Link
            href="/promotions"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-main"
          >
            <ArrowLeft size={13} /> Promotions & Discounts
          </Link>

          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-blue-500/20">
                <BadgePercent size={24} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[20px] font-bold text-main leading-tight break-words">{open?.name ?? promotion.code}</h1>
                  <StatusChip status={open?.status} />
                  {live && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <Zap size={11} /> v{live.versionNumber} live
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  <span className="font-mono">{promotion.code}</span> ·{' '}
                  {typeLabel(promotion)} · v{open?.versionNumber ?? '—'}
                  {promotion.createdBy ? ` · created by ${promotion.createdBy}` : ''}
                  {promotion.createdAt ? ` on ${when(promotion.createdAt)}` : ''}
                </p>
                <p className={`mt-2 text-[12.5px] font-semibold ${next.tone}`}>{next.text}</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-stretch gap-3">
              <div className="rounded-2xl border border-surface bg-primary/5 px-5 py-3 text-center">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Reward</p>
                <p className="mt-0.5 text-[24px] font-bold leading-tight text-primary tabular-nums">{open ? rewardLabel(open) : '—'}</p>
                {open?.tiers.length ? (
                  <p className="text-[10.5px] text-muted-foreground">{open.tiers.length} tiers</p>
                ) : null}
              </div>
            </div>
          </div>

          {open && (
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-surface pt-5 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <ValidityWindow from={open.validFrom} to={open.validTo} />
              <Field label="Priority" value={open.priority} />
              <Field label="Stacking" value={open.stacking} />
              <Field label="Unit" value={open.unit} />
            </div>
          )}
        </div>
      </Card>

      {/* ── Approval path of the open version ── */}
      {open && (
        <Card className="p-6 rounded-card border-surface card-shadow">
          <SectionHeader
            title="Approval path"
            subtitle={`Version ${open.versionNumber} · two signatures, then activation`}
            icon={Route}
          />
          <div className="pt-2">
            <ApprovalPath version={open} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4 min-w-0">
          {readingOther && shown && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-[12.5px] text-sky-800 dark:text-sky-200">
              <Eye size={14} />
              <span className="min-w-0 flex-1">
                Reading <b>v{shown.versionNumber}</b> ({shown.status.replace(/([a-z])([A-Z])/g, '$1 $2')}). Decisions apply to the
                open version, v{open?.versionNumber}.
              </span>
              <button
                type="button"
                onClick={() => setViewingNumber(null)}
                className="rounded-lg px-2 py-1 font-semibold hover:bg-sky-500/15"
              >
                Back to v{open?.versionNumber}
              </button>
            </div>
          )}

          {shown && (
            <>
              <Card className="p-6 rounded-card border-surface card-shadow">
                <SectionHeader
                  title="Rule — who it applies to"
                  subtitle="What a quotation line is checked against"
                  icon={Filter}
                  count={shown.conditions.length}
                  action={
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        shown.isNestedRule
                          ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                          : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                      }`}
                      title={shown.isNestedRule ? 'Built with the rule builder — not editable by spreadsheet import' : 'Flat rule — importable by spreadsheet'}
                    >
                      {shown.isNestedRule ? 'Nested rule' : 'Flat rule'}
                    </span>
                  }
                />
                <RuleTreeView rule={ruleOf(shown)} definitions={conditionCatalog.data} />
                {shown.description && (
                  <div className="mt-5 rounded-xl bg-muted/40 px-4 py-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <p className="text-[12.5px] text-main whitespace-pre-line">{shown.description}</p>
                  </div>
                )}
              </Card>

              <Card className="p-6 rounded-card border-surface card-shadow">
                <SectionHeader
                  title="Linked promotions"
                  subtitle="How this promotion works with others"
                  icon={Link2}
                  count={shown.relationships.length}
                />
                <RelationshipList relationships={shown.relationships} />
              </Card>

              <Card className="p-6 rounded-card border-surface card-shadow">
                <SectionHeader
                  title={shown.tiers.length > 0 ? 'Reward tiers' : 'Reward'}
                  subtitle={shown.tiers.length > 0 ? 'The bigger the quantity, the bigger the reward' : undefined}
                  icon={Layers}
                  count={shown.tiers.length || undefined}
                />
                {shown.tiers.length > 0 ? (
                  <TierLadder version={shown} />
                ) : (
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="Reward" value={rewardLabel(shown)} />
                    <Field label="Type" value={shown.rewardType} />
                    <Field label="Currency" value={shown.currency} />
                    <Field label="Free material" value={shown.freeMaterialNumber} />
                  </dl>
                )}
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4 order-first xl:order-none min-w-0">
          <div className={`xl:sticky ${AppLayout.stickyTop} xl:z-10 space-y-4`}>
            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="Decision" subtitle={`On version ${open?.versionNumber ?? '—'}`} icon={Gavel} />

              {available.length === 0 ? (
                <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-[12.5px] text-muted-foreground">
                  Nothing to decide — version {open?.versionNumber} is{' '}
                  {open?.status?.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}.
                </p>
              ) : (
                <>
                  {open?.status === 'Approved' && (
                    <p className="text-[12px] text-sky-800 dark:text-sky-200 bg-sky-500/10 border border-sky-500/20 rounded-xl px-3 py-2 mb-3">
                      Approved is not live. Activating is what makes this discount price on a quotation.
                    </p>
                  )}

                  {transition.isError && (
                    <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-3 break-words">
                      {transition.error instanceof Error
                        ? transition.error.message
                        : 'The decision could not be saved.'}
                    </p>
                  )}

                  <div className="space-y-2">
                    {available.map((entry) => (
                      <button
                        key={entry.action}
                        onClick={() => run(entry.action, entry.needsReason)}
                        disabled={busy}
                        className={`w-full inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-[12.5px] font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                          entry.tone === 'go'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : entry.tone === 'stop'
                              ? pending === entry.action
                                ? 'bg-rose-600 text-white'
                                : 'border border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300'
                              : entry.tone === 'primary'
                                ? 'gradient-primary text-white'
                                : 'border border-surface text-main hover:bg-accent/40'
                        }`}
                      >
                        {busy && pending === entry.action ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : entry.action === 'submit' ? (
                          <Send size={13} />
                        ) : entry.tone === 'go' ? (
                          <CheckCircle2 size={14} />
                        ) : null}
                        {entry.label}
                      </button>
                    ))}
                  </div>

                  {chosen?.needsReason && (
                    <div className="mt-3 rounded-xl border border-surface p-3">
                      <label className="text-[11px] font-semibold text-main">Reason for {chosen.label.toLowerCase()}</label>
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={3}
                        autoFocus
                        placeholder="Why? This is stored on the record."
                        className="mt-1.5 w-full text-[12.5px] rounded-lg border border-surface px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setPending(null);
                            setReason('');
                          }}
                          className="h-9 flex-1 rounded-lg border border-surface text-[12px] font-medium text-main hover:bg-accent/40"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => run(chosen.action, true)}
                          disabled={busy || reason.trim().length < 3}
                          className="h-9 flex-[2] rounded-lg bg-rose-600 text-white text-[12px] font-semibold disabled:opacity-50"
                        >
                          Confirm {chosen.label.toLowerCase()}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader
                title="SAP"
                icon={Zap}
                action={
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      !open?.requiresSapSync
                        ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                        : open.sapStatus === 'Synced'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {!open?.requiresSapSync ? 'Not required' : open.sapStatus?.replace(/([a-z])([A-Z])/g, '$1 $2') ?? 'Not synced'}
                  </span>
                }
              />
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Condition type" value={open?.sapConditionType} />
                <Field label="Record" value={open?.sapConditionRecord} />
              </dl>

              {open?.requiresSapSync && open.sapStatus !== 'Synced' && (
                <>
                  <p className="text-[11.5px] text-muted-foreground mt-3">
                    Queues the condition for the SD team. They record the condition record
                    number back against it — the integration is manual until the mechanism is
                    confirmed.
                  </p>
                  <button
                    onClick={() => sapSync.mutate()}
                    disabled={busy}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-surface text-[12.5px] font-semibold text-main hover:bg-accent/40 disabled:opacity-50"
                  >
                    {sapSync.isPending && <Loader2 size={13} className="animate-spin" />}
                    Queue for SAP
                  </button>
                </>
              )}

              {sapSync.isError && (
                <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-2 break-words">
                  {sapSync.error instanceof Error ? sapSync.error.message : 'The queue request failed.'}
                </p>
              )}
            </Card>

          </div>

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Versions" subtitle="Click one to read it" icon={Clock} count={versions.length} />
            <VersionTimeline
              versions={versions}
              liveNumber={promotion.liveVersionNumber}
              openNumber={open?.versionNumber}
              viewing={shown?.versionNumber ?? -1}
              onSelect={(n) => setViewingNumber(n === open?.versionNumber ? null : n)}
            />
          </Card>
        </div>
      </div>
    </PageBody>
  );
}
