'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { landingRouteFor } from '@/lib/auth/authorization';
import { roleMetaFor } from '@/lib/permissions';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, LogIn, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared shell for 401 / 403 / 404.
 *
 * Deliberately standalone rather than inside the portal: a user who is not
 * authorised for a page should not be handed the app chrome around it.
 */
export function ErrorPage({
  code,
  title,
  description,
  icon: Icon,
  tone,
  detail,
}: {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  detail?: string;
}) {
  const { isAuthenticated, permissions, role, user } = useAuth();
  const router = useRouter();
  const home = isAuthenticated ? landingRouteFor(permissions) : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-5 py-12">
      <div
        aria-hidden
        className="fixed inset-0 opacity-[0.06] dark:opacity-[0.1] pointer-events-none"
        style={{
          background: `radial-gradient(55% 45% at 50% 35%, ${tone} 0%, transparent 70%)`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full max-w-[460px] text-center"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="w-16 h-16 rounded-card mx-auto flex items-center justify-center"
          style={{ background: `${tone}1F` }}
        >
          <Icon size={28} style={{ color: tone }} strokeWidth={2} />
        </motion.div>

        <p
          className="mt-6 text-[52px] font-bold leading-none tracking-tight"
          style={{ color: tone }}
        >
          {code}
        </p>
        <h1 className="mt-2 text-[20px] font-bold text-main tracking-tight">{title}</h1>
        <p className="mt-2.5 text-[13.5px] text-muted-foreground leading-relaxed">{description}</p>

        {detail && (
          <p className="mt-4 inline-block px-3 py-1.5 rounded-card bg-muted/60 border border-surface text-[11.5px] text-muted-foreground font-mono break-all">
            {detail}
          </p>
        )}

        {isAuthenticated && user && role && (
          <div className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-muted-foreground">
            <span>Signed in as {user.name}</span>
            <span
              className={`inline-flex items-center px-2 py-[3px] rounded-full border text-[10px] font-semibold ${roleMetaFor(role).badge}`}
            >
              {roleMetaFor(role).label}
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto h-10 px-4 rounded-card border border-surface text-[12.5px] font-semibold text-main hover:bg-accent/50 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={14} /> Go back
          </button>
          <Link
            href={home}
            className="w-full sm:w-auto h-10 px-4 rounded-card gradient-primary text-white text-[12.5px] font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
          >
            {isAuthenticated ? (
              <>
                <Home size={14} /> Back to dashboard
              </>
            ) : (
              <>
                <LogIn size={14} /> Go to sign in
              </>
            )}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
