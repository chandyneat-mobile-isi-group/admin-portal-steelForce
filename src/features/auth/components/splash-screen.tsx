'use client';

import { motion } from 'framer-motion';
import { BrandMark } from '@/components/shared/brand-logo';

/**
 * Shown while the stored session is being read and verified.
 *
 * This is what stands between app launch and the portal: the shell is not
 * mounted behind it, so there is nothing to flash through.
 */
export function SplashScreen({ message = 'Preparing your workspace…' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface">
      {/* Ambient wash — the same brand gradient, at low intensity */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 40%, #004A98 0%, transparent 70%), radial-gradient(40% 40% at 70% 70%, #4F92DA 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center"
      >
        <div className="relative">
          <motion.span
            className="absolute inset-0 rounded-2xl gradient-primary"
            animate={{ opacity: [0.35, 0.1, 0.35], scale: [1, 1.35, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-blue-500/25 overflow-hidden">
            <BrandMark size={64} />
          </div>
        </div>

        <p className="mt-5 text-[17px] font-extrabold text-main tracking-tight">SteelForce</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary mt-0.5">
          Admin Portal
        </p>

        <div className="mt-6 h-[3px] w-40 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full w-1/3 rounded-full gradient-primary"
            animate={{ x: ['-120%', '340%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <p className="mt-3 text-[11.5px] text-muted-foreground">{message}</p>
      </motion.div>
    </div>
  );
}
