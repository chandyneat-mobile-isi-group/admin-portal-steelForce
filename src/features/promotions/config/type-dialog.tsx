'use client';

/** Create or edit a promotion type. The code is fixed once created. */

import { useState } from 'react';
import { Loader2, Shapes } from 'lucide-react';
import { Modal } from '@/components/feedback/feedback';
import { FEED_KINDS, promotionErrorCode, promotionErrorMessage, type PromotionTypeDto } from '../catalog-api';
import { useSavePromotionType } from '../hooks';

export const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

export const inputClass =
  'w-full h-9 rounded-lg border border-surface bg-transparent px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60';

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-main">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] font-medium text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[10.5px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function TypeDialog({ type, onClose }: { type: PromotionTypeDto | null | 'new'; onClose: () => void }) {
  const editing = type && type !== 'new' ? type : null;
  const save = useSavePromotionType();

  const [code, setCode] = useState(editing?.code ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [feedKind, setFeedKind] = useState(editing?.feedKind ?? 'general');
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 10));
  const [attempted, setAttempted] = useState(false);

  const errors = {
    code: editing ? undefined : !CODE_PATTERN.test(code.trim()) ? 'Start with a letter, then letters, digits or _ (max 64).' : undefined,
    name: !name.trim() ? 'Name is required.' : name.trim().length > 128 ? 'At most 128 characters.' : undefined,
    description: description.length > 1024 ? 'At most 1024 characters.' : undefined,
    feedKind: !feedKind.trim() ? 'Choose a feed group.' : feedKind.length > 64 ? 'At most 64 characters.' : undefined,
  };
  const serverCode = promotionErrorCode(save.error);
  const codeFromServer =
    serverCode === 'Promotion.TypeCodeTaken' || serverCode === 'Promotion.CatalogCodeInvalid' ? promotionErrorMessage(save.error) : undefined;
  const shown = (k: keyof typeof errors) => (attempted ? errors[k] : undefined) ?? (k === 'code' ? codeFromServer : undefined);

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
          feedKind: feedKind.trim(),
          sortOrder: Number(sortOrder) || 0,
        },
      },
      { onSuccess: onClose }
    );
  };

  const knownKind = (FEED_KINDS as readonly string[]).includes(feedKind);

  return (
    <Modal
      open={type !== null}
      onClose={onClose}
      icon={Shapes}
      title={editing ? `Edit ${editing.name}` : 'New promotion type'}
      subtitle={editing ? `Code ${editing.code} cannot change` : 'Appears in the promotion form as soon as it is saved'}
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
            {editing ? 'Save changes' : 'Create type'}
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <FormField label="Code" error={shown('code')} hint="What promotions store. Fixed once created.">
            <input
              value={code}
              disabled={Boolean(editing)}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder="FactoryPickup"
              className={`${inputClass} font-mono`}
            />
          </FormField>
          <FormField label="Sort order">
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        <FormField label="Name" error={shown('name')}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={128} placeholder="Factory pickup discount" className={inputClass} />
        </FormField>
        <FormField label="Description" error={shown('description')} hint={`${description.length}/1024`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} h-auto py-2`}
            placeholder="When this kind of discount is given."
          />
        </FormField>
        <FormField label="Feed group" error={shown('feedKind')} hint="Groups the card in the mobile incentives feed.">
          <div className="flex gap-2">
            <select
              value={knownKind ? feedKind : '__custom'}
              onChange={(e) => setFeedKind(e.target.value === '__custom' ? '' : e.target.value)}
              className={`${inputClass} sm:w-56`}
            >
              {FEED_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              <option value="__custom">Other…</option>
            </select>
            {!knownKind && (
              <input value={feedKind} onChange={(e) => setFeedKind(e.target.value)} placeholder="customKind" className={`${inputClass} font-mono`} />
            )}
          </div>
        </FormField>

        {save.isError && !codeFromServer && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {promotionErrorMessage(save.error, 'The type could not be saved.')}
          </p>
        )}
      </div>
    </Modal>
  );
}
