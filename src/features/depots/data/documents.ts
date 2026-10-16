import { DEPOT_APPROVAL_DATABASE, type DepotDocumentItem } from '@/features/approvals/depot-approval-data';
import { createPersistentStore, mockDelay, mockId, pdfBlob } from '@/services/mock';
import type { Depot } from '../repositories/types';
import { depotStore } from './depot-store';

/**
 * A depot's registration evidence, for the static prototype.
 *
 * Documents are generated deterministically from the depot the first time they are
 * read, so 200 accounts do not need 1,000 rows of seed data. Only a depot somebody
 * has uploaded to is written to storage. The bytes are produced locally — an SVG
 * "photograph" or a one-page PDF — so viewing and downloading hand the tester a real
 * file. An uploaded file's own bytes are kept in memory for the tab; after a reload
 * the record survives and the preview falls back to a generated placeholder.
 */

/** Wire codes, as the platform's document policy names them. */
export const DOCUMENT_TYPES = [
  'STOREFRONT',
  'INSIDE_STORE',
  'ID_CARD',
  'PATENT_TAX',
  'VAT_CERTIFICATE',
  'MOC_CERTIFICATE',
  'BANK_STATEMENT',
] as const;

export type DepotDocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<DepotDocumentType, string> = {
  STOREFRONT: 'Storefront photo',
  INSIDE_STORE: 'Inside the store',
  ID_CARD: 'Owner ID card',
  PATENT_TAX: 'Patent tax certificate',
  VAT_CERTIFICATE: 'VAT certificate',
  MOC_CERTIFICATE: 'MoC registration',
  BANK_STATEMENT: 'Bank statement',
};

/** What a registration cannot be approved without. */
export const REQUIRED_DOCUMENTS: readonly DepotDocumentType[] = ['STOREFRONT', 'INSIDE_STORE', 'ID_CARD', 'PATENT_TAX'];

export interface DepotDocument {
  id: string;
  type: DepotDocumentType;
  typeDisplay: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  isImage: boolean;
}

export interface DepotDocumentSet {
  depotId: string;
  documents: DepotDocument[];
  missingRequired: string[];
  isComplete: boolean;
}

const CATEGORY_TYPE: Record<DepotDocumentItem['category'], DepotDocumentType> = {
  storefront: 'STOREFRONT',
  interior: 'INSIDE_STORE',
  owner_id: 'ID_CARD',
  patent_tax: 'PATENT_TAX',
  moc_cert: 'MOC_CERTIFICATE',
  bank_statement: 'BANK_STATEMENT',
};

const IMAGE_TYPES: readonly DepotDocumentType[] = ['STOREFRONT', 'INSIDE_STORE', 'ID_CARD'];

function hashOf(text: string): number {
  return text.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

function fileSlug(name: string): string {
  return name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function generatedDocument(depot: Depot, type: DepotDocumentType, n: number): DepotDocument {
  const image = IMAGE_TYPES.includes(type);
  const slug = fileSlug(depot.name);
  return {
    id: `${depot.id}-doc-${n}`,
    type,
    typeDisplay: DOCUMENT_TYPE_LABEL[type],
    fileName: `${slug}_${type.toLowerCase()}.${image ? 'jpg' : 'pdf'}`,
    contentType: image ? 'image/svg+xml' : 'application/pdf',
    sizeBytes: 380_000 + (hashOf(depot.id + type) % 2_400_000),
    uploadedAt: depot.submittedAt ?? `${depot.createdAt}T09:00:00.000Z`,
    isImage: image,
  };
}

/**
 * The documents a depot starts with. Trading accounts are complete; about a third of
 * the field registrations are missing one required item, because that is the usual
 * reason a registration stalls.
 */
function generatedDocuments(depot: Depot): DepotDocument[] {
  const fixture = DEPOT_APPROVAL_DATABASE[depot.id];
  if (fixture) {
    return fixture.documents.map((doc) => {
      const type = CATEGORY_TYPE[doc.category];
      const image = doc.fileType === 'image';
      return {
        id: `${depot.id}-${doc.id}`,
        type,
        typeDisplay: doc.title,
        fileName: doc.fileName,
        contentType: image ? 'image/svg+xml' : 'application/pdf',
        sizeBytes: Math.round(parseFloat(doc.fileSize) * 1_048_576) || 1_200_000,
        uploadedAt: depot.submittedAt ?? new Date().toISOString(),
        isImage: image,
      };
    });
  }

  const types: DepotDocumentType[] = [...REQUIRED_DOCUMENTS];
  const hash = hashOf(depot.id);
  if (hash % 3 === 0) types.push('VAT_CERTIFICATE');

  // Master accounts imported from SAP were documented long ago.
  if (depot.submittedAt) {
    if (hash % 6 === 1) types.splice(types.indexOf('PATENT_TAX'), 1);
    if (hash % 6 === 2) types.splice(types.indexOf('INSIDE_STORE'), 1);
  }
  return types.map((type, i) => generatedDocument(depot, type, i + 1));
}

/** Only depots someone has uploaded to or created are persisted. */
const documentStore = createPersistentStore<Record<string, DepotDocument[]>>('depots.documents', () => ({}));

/** Bytes of files uploaded this session, by document id. */
const uploadedBlobs = new Map<string, Blob>();

function depotOf(depotId: string): Depot {
  const depot = depotStore.get().find((d) => d.id === depotId);
  if (!depot) throw new Error('This depot no longer exists.');
  return depot;
}

function documentsOf(depot: Depot): DepotDocument[] {
  return documentStore.get()[depot.id] ?? generatedDocuments(depot);
}

function summarise(depotId: string, documents: DepotDocument[]): DepotDocumentSet {
  const present = new Set(documents.map((d) => d.type));
  const missingRequired = REQUIRED_DOCUMENTS.filter((type) => !present.has(type));
  return { depotId, documents, missingRequired, isComplete: missingRequired.length === 0 };
}

/** Synchronous summary for list projections that only need counts. */
export function documentSummary(depot: Depot): DepotDocumentSet {
  return summarise(depot.id, documentsOf(depot));
}

function guessType(fileName: string): DepotDocumentType {
  const name = fileName.toLowerCase();
  if (/store|front|sign|facade/.test(name)) return 'STOREFRONT';
  if (/inside|interior|shelf|warehouse/.test(name)) return 'INSIDE_STORE';
  if (/id|passport|identity/.test(name)) return 'ID_CARD';
  if (/patent|tax/.test(name)) return 'PATENT_TAX';
  if (/vat/.test(name)) return 'VAT_CERTIFICATE';
  if (/moc|commerce|registration/.test(name)) return 'MOC_CERTIFICATE';
  if (/bank|statement/.test(name)) return 'BANK_STATEMENT';
  return 'STOREFRONT';
}

const SCENE: Record<string, { sky: string; ground: string; caption: string }> = {
  STOREFRONT: { sky: '#cfe3f7', ground: '#8a8f98', caption: 'Storefront' },
  INSIDE_STORE: { sky: '#e9e2d4', ground: '#b9a582', caption: 'Inside the store' },
  ID_CARD: { sky: '#e6edf5', ground: '#c9d6e6', caption: 'Owner ID card' },
};

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** A stand-in photograph: recognisably the right kind of picture, labelled with the depot. */
function photoSvg(depot: Depot, doc: DepotDocument, note?: string): Blob {
  const scene = SCENE[doc.type] ?? SCENE.STOREFRONT;
  const name = escapeXml(depot.name);
  const lines = escapeXml(note ?? `${depot.code} · ${depot.district || depot.province}`);
  let body: string;
  if (doc.type === 'ID_CARD') {
    body = `
      <rect x="140" y="110" width="520" height="330" rx="22" fill="#fff" stroke="#9fb3c8" stroke-width="3"/>
      <rect x="140" y="110" width="520" height="62" rx="22" fill="#004A98"/>
      <text x="400" y="151" font-size="24" fill="#fff" text-anchor="middle" font-family="Helvetica">KINGDOM OF CAMBODIA · NATIONAL ID</text>
      <rect x="175" y="200" width="150" height="190" rx="10" fill="#d5dde7"/>
      <circle cx="250" cy="265" r="42" fill="#a9b6c6"/><rect x="195" y="318" width="110" height="60" rx="30" fill="#a9b6c6"/>
      <text x="355" y="240" font-size="22" fill="#1f2937" font-family="Helvetica">${escapeXml(depot.contactPerson || 'Owner')}</text>
      <text x="355" y="280" font-size="18" fill="#6b7280" font-family="Helvetica">ID 0${(hashOf(depot.id) % 900000000) + 100000000}</text>
      <text x="355" y="315" font-size="18" fill="#6b7280" font-family="Helvetica">Expires 2031</text>`;
  } else if (doc.type === 'INSIDE_STORE') {
    const racks = [0, 1, 2, 3]
      .map((i) => `<rect x="${110 + i * 150}" y="150" width="120" height="260" fill="#7d6a4f"/>${[0, 1, 2, 3, 4]
        .map((j) => `<rect x="${118 + i * 150}" y="${162 + j * 48}" width="104" height="10" fill="#9aa3ad"/>`)
        .join('')}`)
      .join('');
    body = `${racks}<rect x="0" y="410" width="800" height="190" fill="${scene.ground}"/>`;
  } else {
    body = `
      <rect x="120" y="170" width="560" height="290" fill="#f4f1ea" stroke="#6b7280" stroke-width="3"/>
      <rect x="140" y="120" width="520" height="70" fill="#004A98"/>
      <text x="400" y="166" font-size="30" fill="#fff" text-anchor="middle" font-family="Helvetica" font-weight="bold">${name}</text>
      <rect x="170" y="230" width="200" height="230" fill="#566170"/>
      <rect x="420" y="230" width="220" height="140" fill="#a8c7e6" stroke="#6b7280" stroke-width="3"/>
      <rect x="0" y="460" width="800" height="140" fill="${scene.ground}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${scene.sky}"/>${body}
    <rect x="0" y="540" width="800" height="60" fill="rgba(15,23,42,0.6)"/>
    <text x="24" y="568" font-size="20" fill="#fff" font-family="Helvetica" font-weight="bold">${escapeXml(scene.caption)} · ${name}</text>
    <text x="24" y="590" font-size="14" fill="#e5e7eb" font-family="Helvetica">${lines}</text>
  </svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

function generatedFile(depot: Depot, doc: DepotDocument, note?: string): Blob {
  if (doc.isImage) return photoSvg(depot, doc, note);
  return pdfBlob(doc.typeDisplay, [
    depot.name,
    `Depot code: ${depot.code}`,
    `Registration no.: ${depot.registrationNo || '-'}`,
    `Address: ${depot.address}`,
    `Owner: ${depot.contactPerson}`,
    `File: ${doc.fileName}`,
    `Uploaded: ${doc.uploadedAt.slice(0, 10)}`,
    ...(note ? [note] : []),
  ]);
}

export const depotDocuments = {
  async list(depotId: string, signal?: AbortSignal): Promise<DepotDocumentSet> {
    await mockDelay(undefined, signal);
    return summarise(depotId, documentsOf(depotOf(depotId)));
  },

  /** Adds a file to the depot's evidence. The type is guessed from the name when not given. */
  async upload(depotId: string, file: File, type?: DepotDocumentType): Promise<DepotDocument> {
    await mockDelay(450);
    const depot = depotOf(depotId);
    const docType = type ?? guessType(file.name);
    const contentType = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/octet-stream');
    const doc: DepotDocument = {
      id: mockId('doc'),
      type: docType,
      typeDisplay: DOCUMENT_TYPE_LABEL[docType],
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      isImage: contentType.startsWith('image/'),
    };
    uploadedBlobs.set(doc.id, file);
    const current = documentsOf(depot);
    documentStore.update((all) => ({ ...all, [depotId]: [...current, doc] }));
    return doc;
  },

  /** Starts a newly created depot with no evidence, rather than generated documents. */
  initialise(depotId: string): void {
    documentStore.update((all) => ({ ...all, [depotId]: all[depotId] ?? [] }));
  },

  async remove(depotId: string, documentId: string): Promise<void> {
    await mockDelay();
    const current = documentsOf(depotOf(depotId));
    uploadedBlobs.delete(documentId);
    documentStore.update((all) => ({ ...all, [depotId]: current.filter((d) => d.id !== documentId) }));
  },

  /** The bytes behind a document, produced locally. */
  async file(depotId: string, documentId: string, signal?: AbortSignal): Promise<Blob> {
    await mockDelay(120, signal);
    const depot = depotOf(depotId);
    const doc = documentsOf(depot).find((d) => d.id === documentId);
    if (!doc) throw new Error('This document is no longer on file.');
    const uploaded = uploadedBlobs.get(doc.id);
    if (uploaded) return uploaded;
    const lost = documentStore.get()[depotId]?.some((d) => d.id === doc.id) && doc.id.startsWith('doc-');
    return generatedFile(depot, doc, lost ? 'Uploaded in an earlier session - original bytes not kept by the prototype.' : undefined);
  },
};
