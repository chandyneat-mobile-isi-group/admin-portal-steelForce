'use client';

/**
 * Depot registration — the approval decision page.
 *
 * ## What changed and why
 *
 * This page used to read `getDepotApprovalDetail(id)`, a synchronous lookup against a
 * hardcoded fixture, defaulting to `'REQ-D-8821'`. Real depots are keyed by GUID and were
 * never in that table, so every genuine registration fell through to a fabricated record:
 * an approver looking at `BP-202609-00004` was shown somebody else's numbers. The approve
 * and reject buttons were a `setTimeout` over local state, so a decision taken here
 * reached nothing.
 *
 * Both now act on the depot master every other screen reads. A final approval **registers
 * the depot in SAP and adopts the customer number SAP issues as the depot's code**, so the
 * decision is consequential and the record is re-read afterwards rather than patched.
 *
 * ## Only what the backend actually holds
 *
 * The fixture carried `industry`, `segment`, `tier`, `creditScore`, `creditRiskRating`,
 * projected revenue, operating hours, `yearEstablished`, `legalName`, `registrationNo`
 * and more. **None of those exist anywhere in the platform.** They are not rendered as
 * blanks here, they are gone: a section of em-dashes invites somebody to treat the next
 * plausible-looking number as real, and this is the screen where the business commits to
 * a credit limit. When the backend carries a field, it can have a place on the page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  ImageOff,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader } from '@/components/layout/section-header';
import {
  APPROVAL_LEVELS,
  ApprovalJourney,
  ApprovalMatrix,
  LevelBadge,
  TERM_COLUMNS,
  LIMIT_BANDS,
  approvalsApi,
  depotJourney,
  requiredApproval,
  useApproveDepot,
  useDepotApproval,
  useRejectDepot,
  type DepotDetailDto,
  type RequiredLevel,
} from '@/features/approvals';

/** Renders a value, or a muted dash when the record genuinely has none. */
function Field({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value === null || value === undefined || value === '';

  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</dt>
      <dd className={`text-[13px] break-words ${empty ? 'text-muted-foreground' : 'text-main font-medium'}`}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

/** The lifecycle states in which a decision is still open. */
const AWAITING = ['PendingApproval', 'RegionManagerApproved', 'SalesManagerApproved'];

const STATUS_LABEL: Record<string, string> = {
  PendingApproval: 'Pending approval',
  RegionManagerApproved: 'Region approved',
  SalesManagerApproved: 'Sales approved',
};

const STATUS_TONE: Record<string, string> = {
  PendingApproval: 'bg-amber-50 text-amber-700 border-amber-200',
  RegionManagerApproved: 'bg-amber-50 text-amber-700 border-amber-200',
  SalesManagerApproved: 'bg-amber-50 text-amber-700 border-amber-200',
  Suspended: 'bg-orange-50 text-orange-700 border-orange-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  Draft: 'bg-slate-50 text-slate-600 border-slate-200',
};

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${
        STATUS_TONE[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** A date the server sent, or a dash. Never today's date as a stand-in. */
function when(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : format(parsed, 'd MMM yyyy, HH:mm');
}

/**
 * Opens a document in a new tab.
 *
 * The bytes are produced locally, wrapped in an object URL and handed to the tab. The
 * URL is revoked on a delay rather than immediately: revoking in the same tick cancels
 * the load in some browsers, and the tab has to have read it first.
 */
async function openDocument(depotId: string, documentId: string): Promise<void> {
  const blob = await approvalsApi.depotDocument(depotId, documentId);
  const objectUrl = URL.createObjectURL(blob);

  window.open(objectUrl, '_blank', 'noopener,noreferrer');

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** True for a document the browser can render as a picture. */
function isImage(contentType?: string | null): boolean {
  return Boolean(contentType && contentType.startsWith('image/'));
}

/**
 * Loads each image document and hands back an object URL per document id, which
 * `<img>` can show because the bytes are already local.
 *
 * ## Revocation
 *
 * Every URL created here pins its blob in memory until revoked, and a reviewer opening
 * ten registrations would otherwise leave forty photographs behind. They are revoked
 * when the effect tears down — on unmount, or when the document set changes.
 *
 * A ref mirrors the state so cleanup can revoke what was actually created: reading the
 * state variable inside the cleanup closure would capture the value from the render the
 * effect ran in, which is empty on the first pass and would leak every URL.
 */
function useDocumentImages(depotId: string, documents: DepotDetailDto['documents']): {
  urls: Record<string, string>;
  failed: Record<string, true>;
  loading: boolean;
} {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [loading, setLoading] = useState(false);
  const created = useRef<string[]>([]);

  // The identity of the image set, not the array, so a re-render with an equal-but-new
  // array does not re-download every photograph.
  const key = documents
    .filter((document) => isImage(document.contentType) && document.url)
    .map((document) => document.id)
    .join(',');

  useEffect(() => {
    const wanted = documents.filter((document) => isImage(document.contentType) && document.url);

    if (wanted.length === 0) {
      return;
    }

    let cancelled = false;

    setLoading(true);

    void (async () => {
      for (const document of wanted) {
        try {
          const blob = await approvalsApi.depotDocument(depotId, document.id);

          if (cancelled) {
            return;
          }

          const objectUrl = URL.createObjectURL(blob);

          created.current.push(objectUrl);
          setUrls((previous) => ({ ...previous, [document.id]: objectUrl }));
        } catch {
          if (!cancelled) {
            // A single unreadable document must not blank the others, so this is
            // recorded per tile rather than raised.
            setFailed((previous) => ({ ...previous, [document.id]: true }));
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;

      for (const objectUrl of created.current) {
        URL.revokeObjectURL(objectUrl);
      }

      created.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { urls, failed, loading };
}

/**
 * The full-screen viewer.
 *
 * Rendered through a portal onto `document.body` so it escapes the page's grid and any
 * stacking context the cards create — a fixed overlay inside a `sticky` column would be
 * clipped by it. Closes on Escape, on the backdrop, and on the button; the image itself
 * swallows the click so viewing it does not dismiss it.
 */
function Lightbox({
  src,
  title,
  caption,
  onClose,
}: {
  src: string;
  title: string;
  caption?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    // The page behind must not scroll while the overlay is up.
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
    >
      <div className="w-full flex items-start justify-between gap-4 mb-3 max-w-6xl">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{title}</p>
          {caption && <p className="text-[11.5px] text-white/60 truncate">{caption}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        onClick={(event) => event.stopPropagation()}
        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
      />

      <p className="text-[11px] text-white/50 mt-3">Click anywhere or press Esc to close</p>
    </div>,
    document.body
  );
}

/** Stable identity, so the memos below do not recompute on every render while loading. */
const EMPTY_DOCUMENTS: DepotDetailDto['documents'] = [];

export default function DepotApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params.id as string) ?? '';

  const { data: depot, isLoading, isError, error } = useDepotApproval(id);
  const approve = useApproveDepot(id);
  const reject = useRejectDepot(id);

  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [openingDoc, setOpeningDoc] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const viewDocument = async (documentId: string) => {
    setOpeningDoc(documentId);
    setDocError(null);

    try {
      await openDocument(id, documentId);
    } catch (cause) {
      setDocError(cause instanceof Error ? cause.message : 'The document could not be opened.');
    } finally {
      setOpeningDoc(null);
    }
  };

  // Hooks before the early returns below, never after: React matches hooks by call
  // order, so a `useDocumentImages` that runs only once the query resolves changes the
  // count between the loading render and the loaded one and throws.
  const documents = depot?.documents ?? EMPTY_DOCUMENTS;

  const { urls: imageUrls, failed: imageFailed } = useDocumentImages(id, documents);

  const images = useMemo(
    () => documents.filter((document) => isImage(document.contentType) && document.url),
    [documents]
  );

  const files = useMemo(
    () => documents.filter((document) => !isImage(document.contentType) || !document.url),
    [documents]
  );

  const openInLightbox = useCallback((documentId: string) => setLightbox(documentId), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const shown = lightbox ? documents.find((document) => document.id === lightbox) : null;

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <PageBody>
        <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-16 justify-center">
          <Loader2 size={15} className="animate-spin" /> Loading registration…
        </div>
      </PageBody>
    );
  }

  if (isError || !depot) {
    return (
      <PageBody>
        <Card className="p-6 rounded-card border-surface card-shadow">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-main">This registration could not be loaded.</p>
              <p className="text-[12px] text-muted-foreground mt-1 break-words">
                {error instanceof Error ? error.message : 'The depot may have been removed, or you may not have access to it.'}
              </p>
              <Link href="/approval/depots" className="inline-flex items-center gap-1 text-[12px] text-primary mt-3">
                <ArrowLeft size={12} /> Back to the queue
              </Link>
            </div>
          </div>
        </Card>
      </PageBody>
    );
  }

  const record: DepotDetailDto = depot;
  const decided = !AWAITING.includes(record.status);
  const busy = approve.isPending || reject.isPending;
  const sapNumber = record.sap?.sapCustomerId ?? null;
  const required = requiredApproval(record.creditLimit, record.creditTermDays);
  const journey = depotJourney(record.status, required, Boolean(sapNumber));

  const onApprove = () => {
    approve.mutate(undefined, {
      onSuccess: () => {
        toast.success(`${record.name} approved.`);
        router.refresh();
      },
    });
  };

  const onReject = () => {
    if (rejectReason.trim().length < 3) {
      return;
    }

    reject.mutate(rejectReason.trim(), {
      onSuccess: () => {
        toast.success(`${record.name} rejected.`);
        setShowReject(false);
        setRejectReason('');
      },
    });
  };

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/approval/depots"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-main transition-colors"
          >
            <ArrowLeft size={13} /> Queue
          </Link>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold text-main truncate">{record.name}</h1>
            <button
              onClick={() => copy(record.code, 'code')}
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-main"
            >
              {record.code}
              {copied === 'code' ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
        </div>
        <StatusChip status={record.status} />
      </div>

      {/* The outcome of the last decision, when there was one. */}
      {record.sapRegistration?.lastError && (
        <Card className="p-4 rounded-card border-rose-200 bg-rose-50/60">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={15} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-rose-900">SAP refused the last attempt</p>
              <p className="text-[12px] text-rose-800 mt-0.5 break-words">{record.sapRegistration.lastError}</p>
            </div>
          </div>
        </Card>
      )}

      <ApprovalRouteCard required={required} journey={journey} limit={record.creditLimit} term={record.creditTermDays} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Registration" icon={Store} />
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Code" value={record.code} />
              <Field label="Previous code" value={record.previousCode} />
              <Field label="Type" value={record.type} />
              <Field label="Phone" value={record.phone} />
              <Field label="Email" value={record.email} />
              <Field label="Contact person" value={record.contactPerson} />
              <Field label="Telegram" value={record.telegramUsername} />
              <Field label="Registered" value={when(record.createdAt)} />
              <Field label="Approved" value={when(record.approvedAt)} />
            </dl>
            {record.description && (
              <p className="text-[12.5px] text-muted-foreground mt-4 pt-4 border-t border-surface">{record.description}</p>
            )}
          </Card>

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Address" icon={MapPin} />
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="House no." value={record.address?.houseNo} />
              <Field label="Street" value={record.address?.line1} />
              <Field label="Line 2" value={record.address?.line2} />
              <Field label="District" value={record.address?.district} />
              <Field label="City" value={record.address?.city} />
              <Field label="Province" value={record.address?.province} />
              <Field label="Postal code" value={record.address?.postalCode} />
              <Field label="Region" value={record.address?.region} />
              <Field label="Country" value={record.address?.country} />
            </dl>
            {record.address?.latitude != null && record.address?.longitude != null && (
              <a
                href={`https://www.google.com/maps?q=${record.address.latitude},${record.address.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-primary mt-4"
              >
                <MapPin size={12} /> {record.address.latitude}, {record.address.longitude}
                <ExternalLink size={11} />
              </a>
            )}
          </Card>

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader
              title="Documents"
              icon={FileText}
              count={record.documents.length}
              subtitle={record.documentsComplete ? 'Complete' : 'Required documents are missing'}
            />
            {record.missingRequiredDocuments.length > 0 && (
              <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                Missing: {record.missingRequiredDocuments.join(', ')}
              </p>
            )}
            {docError && (
              <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3 break-words">
                {docError}
              </p>
            )}
            {record.documents.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">Nothing uploaded.</p>
            ) : (
              <>
                {/*
                  Two columns, so the four documents a registration requires land as a
                  2x2 block. A reviewer is comparing a shopfront against an identity card
                  against a tax certificate, and doing that from filenames meant opening
                  four tabs.
                */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((document) => {
                      const source = imageUrls[document.id];
                      const broken = imageFailed[document.id];

                      return (
                        <button
                          key={document.id}
                          onClick={() => source && openInLightbox(document.id)}
                          disabled={!source}
                          className="group text-left rounded-xl border border-surface overflow-hidden bg-accent/20 hover:border-primary/40 transition-colors disabled:cursor-default"
                        >
                          <span className="block relative aspect-[4/3] bg-accent/40">
                            {source ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={source}
                                alt={document.typeDisplay ?? 'Document'}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                              />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                {broken ? <ImageOff size={18} /> : <Loader2 size={16} className="animate-spin" />}
                              </span>
                            )}
                          </span>
                          <span className="block px-2.5 py-2">
                            <span className="block text-[12px] font-medium text-main truncate">
                              {document.typeDisplay ?? document.type ?? 'Document'}
                            </span>
                            <span className="block text-[10.5px] text-muted-foreground truncate">
                              {broken ? 'Could not be loaded' : document.fileName}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Anything that is not a picture keeps the row-and-link treatment. */}
                {files.length > 0 && (
                  <ul className={`space-y-1.5 ${images.length > 0 ? 'mt-3 pt-3 border-t border-surface' : ''}`}>
                    {files.map((document) => (
                      <li key={document.id} className="flex items-center gap-2.5 py-1.5">
                        <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] text-main truncate">
                            {document.typeDisplay ?? document.type ?? 'Document'}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">{document.fileName}</span>
                        </span>
                        {document.url && (
                          <button
                            onClick={() => void viewDocument(document.id)}
                            disabled={openingDoc === document.id}
                            className="text-[11.5px] text-primary inline-flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                          >
                            {openingDoc === document.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <ExternalLink size={10} />
                            )}
                            View
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>

          {record.contacts.length > 0 && (
            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="Contacts" icon={Phone} count={record.contacts.length} />
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {record.contacts.map((contact, index) => (
                  <Field
                    key={contact.id ?? index}
                    label={contact.role ?? 'Contact'}
                    value={[contact.name, contact.phone].filter(Boolean).join(' · ')}
                  />
                ))}
              </dl>
            </Card>
          )}
        </div>

        {/*
          The decision sits first and sticks.

          It used to be the last card in a long right-hand column, below Credit, SAP and
          Business partner, so approving meant scrolling past everything on a page whose
          only purpose is that one choice. Sticky rather than merely first, because the
          reviewer reads the documents on the left and needs the buttons still in reach
          when they get to the bottom of them.

          `order-first` on the column puts it above the detail on a narrow screen too,
          where the grid stacks and a sidebar would otherwise land underneath.
        */}
        <div className="space-y-4 order-first xl:order-none">
          <div className="xl:sticky xl:top-4 xl:z-10">
            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="Decision" icon={CheckCircle2} />

              {decided ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Already {record.status === 'Active' ? 'approved' : (STATUS_LABEL[record.status] ?? record.status).toLowerCase()}. No action left here.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2">
                    <span className="text-[11.5px] text-muted-foreground">Final approval by</span>
                    <LevelBadge required={required} />
                  </div>
                  {record.status === 'PendingApproval' && required.kind === 'level' && required.level === 4 ? (
                    <p className="text-[12px] text-muted-foreground mb-3">
                      Approving records the RSM&rsquo;s endorsement. The National Sales Committee then gives
                      final approval, which registers the depot in SAP.
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground mb-3">
                      Approving sends this depot to SAP. On success its code becomes the customer number SAP
                      issues, and the current code moves to <span className="text-main">previous code</span>.
                    </p>
                  )}

                  {(approve.isError || reject.isError) && (
                    <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3 break-words">
                      {(approve.error ?? reject.error) instanceof Error
                        ? ((approve.error ?? reject.error) as Error).message
                        : 'The decision could not be saved.'}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={onApprove}
                      disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[12.5px] font-medium disabled:opacity-50"
                    >
                      {approve.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Approve
                    </button>
                    <button
                      onClick={() => setShowReject((open) => !open)}
                      disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-surface text-[12.5px] font-medium text-main disabled:opacity-50"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>

                  {showReject && (
                    <div className="mt-3">
                      <textarea
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        rows={3}
                        placeholder="Why is this being refused? The representative sees this."
                        className="w-full text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
                      />
                      <button
                        onClick={onReject}
                        disabled={busy || rejectReason.trim().length < 3}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white text-[12.5px] font-medium disabled:opacity-50"
                      >
                        {reject.isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                        Confirm rejection
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="Credit" icon={CreditCard} />
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Credit limit"
                value={record.creditLimit != null ? record.creditLimit.toLocaleString() : null}
              />
              <Field label="Term (days)" value={record.creditTermDays} />
              <Field label="Limit dated" value={when(record.creditLimitDate)} />
              <Field label="Can trade" value={record.canTrade ? 'Yes' : 'No'} />
            </dl>
          </Card>

          <Card className="p-5 rounded-card border-surface card-shadow">
            <SectionHeader title="SAP" icon={Building2} />
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Customer no." value={sapNumber} />
              <Field label="Status" value={record.sapRegistration?.status} />
              <Field label="Sales org" value={record.sap?.salesOrg} />
              <Field label="Channel" value={record.sap?.distributionChannel} />
              <Field label="Division" value={record.sap?.division} />
              <Field label="Customer group" value={record.sap?.customerGroup} />
              <Field label="Price group" value={record.sap?.priceGroup} />
              <Field label="Payment terms" value={record.sap?.paymentTerms} />
              <Field label="Sales office" value={record.sap?.salesOffice} />
              <Field label="Sales group" value={record.sap?.salesGroup} />
              <Field label="Tax number" value={record.sap?.taxNumber} />
              <Field label="Attempts" value={record.sapRegistration?.attemptCount} />
            </dl>
          </Card>

          {record.businessPartner && (
            <Card className="p-5 rounded-card border-surface card-shadow">
              <SectionHeader title="Business partner" icon={ShieldCheck} />
              <dl className="grid grid-cols-2 gap-4">
                <Field label="BP role" value={record.businessPartner.bpRole} />
                <Field label="Account group" value={record.businessPartner.accountGroup} />
                <Field label="Partner function" value={record.businessPartner.partnerFunction} />
                <Field label="Personnel no." value={record.businessPartner.personnelNumber} />
                <Field label="Search term 1" value={record.businessPartner.searchTerm1} />
                <Field label="Search term 2" value={record.businessPartner.searchTerm2} />
                <Field label="Tax type" value={record.businessPartner.taxType} />
                <Field label="Tax class" value={record.businessPartner.taxClass} />
              </dl>
            </Card>
          )}

        </div>
      </div>

      {shown && imageUrls[shown.id] && (
        <Lightbox
          src={imageUrls[shown.id]}
          title={shown.typeDisplay ?? shown.type ?? 'Document'}
          caption={shown.fileName}
          onClose={closeLightbox}
        />
      )}
    </PageBody>
  );
}

/** Who approves this depot, why, and how far the registration has got. */
function ApprovalRouteCard({
  required,
  journey,
  limit,
  term,
}: {
  required: RequiredLevel;
  journey: ReturnType<typeof depotJourney>;
  limit?: number | null;
  term?: number | null;
}) {
  const [showMatrix, setShowMatrix] = useState(false);

  const reason =
    required.kind === 'level'
      ? `Credit limit ${LIMIT_BANDS[required.row].label} USD at ${TERM_COLUMNS[required.col]}-day terms needs ${APPROVAL_LEVELS[required.level].title} (${APPROVAL_LEVELS[required.level].code}) or above.`
      : required.kind === 'not-defined'
        ? `The policy names no approver for ${LIMIT_BANDS[required.row].label} USD at ${TERM_COLUMNS[required.col]}-day terms (D-09). Escalate before deciding.`
        : required.kind === 'term-over-policy'
          ? `A ${term}-day term is longer than the policy's 90 days, so no level is defined. Escalate before deciding.`
          : 'Set a credit limit and credit term on this depot to know who must approve it.';

  return (
    <Card className="p-5 rounded-card border-surface card-shadow">
      <div className="flex flex-wrap items-start gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-main">Approval route</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{reason}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-muted-foreground tabular-nums">
            {limit != null ? `$${limit.toLocaleString()}` : 'No limit'} · {term != null ? `${term} days` : 'no term'}
          </span>
          <LevelBadge required={required} />
        </div>
      </div>

      <ApprovalJourney journey={journey} />

      <button
        type="button"
        onClick={() => setShowMatrix((v) => !v)}
        className="mt-4 text-[12px] font-medium text-primary hover:underline"
      >
        {showMatrix ? 'Hide approval matrix' : 'Show where this sits in the approval matrix'}
      </button>
      {showMatrix && (
        <div className="mt-3">
          <ApprovalMatrix highlight={required} />
        </div>
      )}
    </Card>
  );
}
