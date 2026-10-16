'use client';

import { repColor } from '@/features/planning/lib/tokens';
import type { SalesRep } from '@/features/planning/types';

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-xl', text: 'text-[10px]', dot: 'w-2 h-2 -bottom-0 -right-0' },
  md: { box: 'w-11 h-11 rounded-2xl', text: 'text-[13px]', dot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5' },
  lg: { box: 'w-14 h-14 rounded-[18px]', text: 'text-[16px]', dot: 'w-3 h-3 -bottom-0.5 -right-0.5' },
} as const;

/**
 * Initials avatar tinted with the rep's identity hue — the same hue the map
 * uses for that rep's route, so a card and a polyline are visibly the same person.
 */
export function RepAvatar({
  rep,
  size = 'md',
  showStatus = true,
}: {
  rep: SalesRep;
  size?: keyof typeof SIZES;
  showStatus?: boolean;
}) {
  const s = SIZES[size];
  const color = repColor(rep.avatarHue);

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${s.box} flex items-center justify-center font-bold text-white shadow-sm`}
        style={{
          background: `linear-gradient(135deg, ${color} 0%, hsl(${rep.avatarHue}, 76%, 62%) 100%)`,
        }}
      >
        <span className={s.text}>{rep.initials}</span>
      </div>
      {showStatus && (
        <span
          className={`absolute ${s.dot} rounded-full border-2 border-card`}
          style={{ background: rep.online ? '#2C9942' : '#ADBACA' }}
        />
      )}
    </div>
  );
}
