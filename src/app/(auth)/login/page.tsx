'use client';

import { ThemeToggle } from '@/components/shared/theme-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { BrandMark } from '@/components/shared/brand-logo';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';
import { LoginForm, GuestGuard } from '@/features/auth';

const EASE = [0.22, 1, 0.36, 1] as const;

const HIGHLIGHTS = [
  { icon: TrendingUp, title: 'Plan the field day', body: 'Assign stops, optimise routes and publish to reps in one pass.' },
  { icon: ShieldCheck, title: 'Role-aware by design', body: 'Every module, route and menu respects the permissions of the signed-in role.' },
  { icon: Sparkles, title: 'Built for the floor', body: 'Fast, keyboard-friendly screens for people who work all day in them.' },
];

export default function LoginPage() {
  return (
    <GuestGuard>
      <div className="min-h-screen flex bg-surface">
        {/* Brand panel — hidden below lg so the form owns small screens */}
        <aside className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative overflow-hidden gradient-primary">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(50% 40% at 20% 15%, rgba(255,255,255,0.35) 0%, transparent 60%), radial-gradient(45% 45% at 85% 80%, rgba(56,189,248,0.45) 0%, transparent 65%)',
            }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative flex flex-col justify-between p-10 xl:p-12 w-full">
            <div className="flex items-center gap-3">
              <Image 
                src="/logos/isi-steel-light.svg"
                alt="ISI Steel"
                width={150}
                height={50}
                className="object-contain"
                priority
              />
            </div>

            <div className="max-w-[420px]">
              <motion.h2
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="text-[32px] xl:text-[36px] font-bold text-white leading-[1.15] tracking-tight"
              >
                Run the whole field operation from one place.
              </motion.h2>

              <div className="mt-8 space-y-5">
                {HIGHLIGHTS.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: EASE }}
                    className="flex items-start gap-3.5"
                  >
                    <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                      <item.icon size={17} className="text-white" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-white">
                        {item.title}
                      </span>
                      <span className="block text-[12.5px] text-white/70 leading-relaxed mt-0.5">
                        {item.body}
                      </span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-white/60">
              © {new Date().getFullYear()} ISI Group. All rights reserved.
            </p>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div className="flex items-center gap-2.5 lg:invisible">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center overflow-hidden">
                <BrandMark size={32} />
              </div>
              <p className="text-[14px] font-extrabold text-main">SteelForce</p>
            </div>
            <div className="flex items-center gap-1.5">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-5 sm:px-8 pb-12">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </main>
      </div>
    </GuestGuard>
  );
}
