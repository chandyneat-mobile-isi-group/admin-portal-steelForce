'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileText, ImageOff, Loader2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Portal } from '@/components/ui/portal';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { saveBlob } from '@/lib/utilities/download';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABEL,
  depotDocuments,
  type DepotDocument,
  type DepotDocumentType,
} from '../data/documents';

/**
 * A depot's registration evidence.
 *
 * Four sections, because that is how a reviewer reads the file: what the shop looks
 * like from outside, what it looks like inside, who the owner is, and whether the
 * paperwork is in order. The backend has five document types — the two tax documents
 * are one question to a reviewer, so they share a section.
 */
type DocumentDto = DepotDocument;

/**
 * Sections keyed by the **wire code**, not the C# enum name.
 *
 * `CustomerDocumentPolicy` is explicit that the codes are the contract: the API emits
 * `STOREFRONT`, while the database column and the enum say `StorefrontPhoto`. Matching
 * on the enum name looks right, matches nothing, and renders "Nothing captured" over a
 * depot that has every photograph — which is exactly what happened here.
 *
 * Both spellings are accepted so a client is not broken by whichever one it meets.
 */
const SECTIONS: { title: string; blurb: string; types: string[] }[] = [
  { title: 'Storefront', blurb: 'The shop from the street', types: ['STOREFRONT', 'StorefrontPhoto'] },
  { title: 'Inside the store', blurb: 'What is actually on the shelves', types: ['INSIDE_STORE', 'InsideStorePhoto'] },
  { title: 'Identity', blurb: "The owner's ID card", types: ['ID_CARD', 'IdCardPhoto'] },
  {
    title: 'Tax & certificates',
    blurb: 'Patent tax, VAT and MoC registration',
    types: ['PATENT_TAX', 'VAT_CERTIFICATE', 'MOC_CERTIFICATE', 'PatentTaxDocument', 'VatCertificate'],
  },
];

/**
 * A readable name for a wire code.
 *
 * The API already sends `typeDisplay`, translated — prefer it. This is the fallback
 * for `missingRequired`, which is a bare list of codes.
 */
function humanise(code: string): string {
  const known = DOCUMENT_TYPE_LABEL[code as DepotDocumentType];
  if (known) return known;
  return code
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function typeOf(doc: DocumentDto): string {
  return doc.type ?? '';
}

/**
 * One thumbnail.
 *
 * Shown as an object URL over the document's bytes, revoked on unmount — every live
 * blob URL pins its image in memory until it is.
 */
function DocumentThumb({
  depotId,
  doc,
  onOpen,
}: {
  depotId: string;
  doc: DocumentDto;
  onOpen: (url: string, doc: DocumentDto) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    // The bytes are produced locally — the uploaded file itself, or a generated stand-in.
    depotDocuments
      .file(depotId, doc.id)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [depotId, doc.id]);

  // Anything the browser cannot render inline gets a file tile instead of a
  // broken image. `isImage` is the server's own judgement on the content type.
  const isPdf = doc.isImage === false || (doc.contentType ?? '').includes('pdf');

  if (failed) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 text-gray-400">
        <ImageOff size={18} />
        <span className="text-[10px]">Unavailable</span>
      </div>
    );
  }

  if (!url) return <div className="skeleton aspect-square rounded-xl" />;

  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title={doc.fileName}
        className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        <FileText size={20} className="text-blue-500" />
        <span className="px-2 text-center text-[10px] leading-tight">{doc.typeDisplay ?? doc.fileName ?? 'PDF'}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(url, doc)}
      className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Plain <img>: the source is a blob URL, which next/image cannot optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={doc.typeDisplay ?? doc.fileName ?? humanise(typeOf(doc))}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </button>
  );
}

export function DepotDocuments({
  depotId,
  onChanged,
}: {
  depotId: string;
  /** Told after an upload, so a parent showing the checklist can re-read it. */
  onChanged?: () => void;
}) {
  const [viewer, setViewer] = useState<{ url: string; doc: DocumentDto } | null>(null);
  const [uploadType, setUploadType] = useState<DepotDocumentType | ''>('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback((signal: AbortSignal) => depotDocuments.list(depotId, signal), [depotId]);
  const { data: set, error, isLoading, refetch } = useRepositoryQuery(['depot-documents', depotId], load);

  const upload = async (files: FileList | null) => {
    const picked = Array.from(files ?? []);
    if (picked.length === 0) return;
    setUploading(true);
    try {
      for (const file of picked) {
        await depotDocuments.upload(depotId, file, uploadType || undefined);
      }
      toast.success(picked.length === 1 ? `${picked[0].name} uploaded.` : `${picked.length} files uploaded.`);
      refetch();
      onChanged?.();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The upload failed.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const download = async (doc: DocumentDto) => {
    try {
      saveBlob(await depotDocuments.file(depotId, doc.id), doc.fileName);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The document could not be downloaded.');
    }
  };

  // Escape closes, and the page behind stops scrolling — a full-screen image that
  // scrolls the list underneath it feels broken.
  useEffect(() => {
    if (!viewer) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null);
    };
    const previousOverflow = document.body.style.overflow;

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewer]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-10 text-center text-[12.5px] text-gray-400">
        Could not load documents for this depot.
      </p>
    );
  }

  const documents = set?.documents ?? [];
  const missing = set?.missingRequired ?? [];

  return (
    <div className="animate-fade-in space-y-5">
      {/* Upload: the type is guessed from the file name unless the reviewer picks one. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-gray-200 p-3">
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value as DepotDocumentType | '')}
          aria-label="Document type"
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Detect type from file name</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
        <span className="text-[11px] text-gray-400">JPG, PNG or PDF</span>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {/* The checklist first: which slot is empty is what decides an approval. */}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-[12px] font-semibold text-amber-800">
              {missing.length} required document{missing.length === 1 ? '' : 's'} still missing
            </p>
            <p className="mt-0.5 text-[11.5px] text-amber-700">
              {missing.map(humanise).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Anything whose type matches no section — a code added server-side after this
          list was written — lands here rather than vanishing. */}
      {documents.filter((doc) => !SECTIONS.some((s) => s.types.includes(typeOf(doc)))).length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-[12.5px] font-bold text-gray-900">Other</h4>
            <span className="text-[11px] text-gray-400">Uncategorised</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {documents
              .filter((doc) => !SECTIONS.some((s) => s.types.includes(typeOf(doc))))
              .map((doc) => (
                <DocumentThumb key={doc.id} depotId={depotId} doc={doc} onOpen={(url, opened) => setViewer({ url, doc: opened })} />
              ))}
          </div>
        </section>
      )}

      {SECTIONS.map((section) => {
        const inSection = documents.filter((doc) => section.types.includes(typeOf(doc)));
        return (
          <section key={section.title}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="text-[12.5px] font-bold text-gray-900">{section.title}</h4>
              <span className="text-[11px] text-gray-400">{section.blurb}</span>
            </div>
            {inSection.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 py-5 text-center text-[11.5px] text-gray-400">
                Nothing captured
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {inSection.map((doc) => (
                  <DocumentThumb
                    key={doc.id}
                    depotId={depotId}
                    doc={doc}
                    onOpen={(url, opened) => setViewer({ url, doc: opened })}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Full-page viewer, rendered through a Portal into <body>.
          
          It cannot stay here: the Card wrapping these tabs carries
          `animate-fade-in-up` with `animation-fill-mode: forwards`, so it keeps a
          `transform` after the animation settles — which makes it the containing block
          for `position: fixed` descendants — and it is `overflow-hidden` on top of
          that. Inside it the overlay was both clipped and sized to the Card rather
          than the viewport.

          The blob URL belongs to the thumbnail that opened it, so this never revokes
          it — doing so would blank the thumbnail underneath. */}
      {viewer && (
        <Portal>
        <AnimatePresence>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={viewer.doc.typeDisplay ?? viewer.doc.fileName ?? 'Document'}
            onClick={() => setViewer(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-isi-ironclad/92 p-4 backdrop-blur-sm sm:p-8"
          >
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void download(viewer.doc);
                }}
                aria-label="Download"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <Download size={18} />
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setViewer(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            {/* Rises slightly as it opens, so the jump to full screen reads as one
                movement rather than a flash. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={viewer.url}
              alt={viewer.doc.typeDisplay ?? viewer.doc.fileName ?? 'Document'}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-isi-xl"
            />

            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 text-center text-[12px] text-white/70">
              {viewer.doc.typeDisplay ?? viewer.doc.fileName ?? humanise(typeOf(viewer.doc))} · click anywhere or press Esc to close
            </p>
          </motion.div>
        </AnimatePresence>
        </Portal>
      )}
    </div>
  );
}
