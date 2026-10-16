/**
 * Handing a fetched file to the browser as a save.
 *
 * Shared rather than per-feature because every spreadsheet download in the portal needs
 * the same two non-obvious details — the anchor has to be in the document before it is
 * clicked, and the object URL has to be revoked *later* — and a second copy is a second
 * place for one of them to be missed.
 */

/** Hands a blob to the browser as a save, then releases it. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Each object URL pins its blob in memory until revoked. Deferred rather than
  // immediate: revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
