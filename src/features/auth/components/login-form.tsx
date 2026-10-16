'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { authorizeRoute, landingRouteFor } from '@/lib/auth/authorization';
import { PROTOTYPE_CREDENTIALS } from '@/infrastructure/auth/repository';
import type { AuthFailureReason } from '@/lib/auth/types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const EASE = [0.22, 1, 0.36, 1] as const;

const ERROR_COPY: Record<AuthFailureReason, string> = {
  invalid_credentials: 'Incorrect email or password. Use the test account shown below.',
  account_locked: 'Your account is locked. Contact your administrator.',
  account_disabled: 'This account has been disabled. Contact your administrator.',
  email_not_confirmed: 'Confirm your email address before signing in.',
  password_expired: 'Your password has expired. Please set a new password.',
  session_expired: 'Your session expired. Please sign in again.',
  network_error: 'We could not reach the sign-in service. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(trimmed)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
  return errors;
}

export function LoginForm() {
  const { signIn, status, error, clearError, rememberedEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const pending = status === 'authenticating';

  // Prefill from "remember me" — the email only; the password is never stored.
  useEffect(() => {
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
      passwordRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, [rememberedEmail]);

  // ⌘/Ctrl+Enter submits from anywhere in the form.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const session = await signIn({ email, password, remember });
    if (!session) {
      setPassword('');
      passwordRef.current?.focus();
      return;
    }

    // Honour the guard's `next` hint only when this session may actually open it.
    // Following it blindly would drop the user on a 403 immediately after a
    // successful sign-in. `//` is rejected too — that is an off-site URL.
    const home = landingRouteFor(session.permissions);
    const next = searchParams.get('next');
    const nextIsSafe =
      next !== null &&
      next.startsWith('/') &&
      !next.startsWith('//') &&
      authorizeRoute(next, session.permissions).allowed;

    router.replace(nextIsSafe ? next : home);
  };

  const fillTestAccount = () => {
    setEmail(PROTOTYPE_CREDENTIALS.email);
    setPassword(PROTOTYPE_CREDENTIALS.password);
    setShowPassword(false);
    setFieldErrors({});
    clearError();
    passwordRef.current?.focus();
  };

  const onFieldChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (error) clearError();
    if (submitted) {
      const nextEmail = setter === setEmail ? value : email;
      const nextPassword = setter === setPassword ? value : password;
      setFieldErrors(validate(nextEmail, nextPassword));
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <h1 className="text-[26px] font-bold text-main tracking-tight">Welcome back</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1.5">
          Sign in to the SteelForce admin portal.
        </p>
      </motion.div>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        {/* Server-side error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-card bg-rose-500/10 border border-rose-500/20"
              >
                <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 mt-px flex-shrink-0" />
                <p className="text-[12.5px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  {ERROR_COPY[error]}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Field
          id="email"
          label="Email"
          icon={Mail}
          error={fieldErrors.email}
          inputRef={emailRef}
          type="email"
          value={email}
          onChange={onFieldChange(setEmail)}
          placeholder="you@company.com"
          autoComplete="username"
          disabled={pending}
        />

        <Field
          id="password"
          label="Password"
          icon={Lock}
          error={fieldErrors.password}
          inputRef={passwordRef}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={onFieldChange(setPassword)}
          placeholder="••••••••••"
          autoComplete="current-password"
          disabled={pending}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/50 transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={() => setRemember((v) => !v)}
            className="group flex items-center gap-2.5 text-[12.5px] text-muted-foreground hover:text-main transition-colors"
          >
            <span
              className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-all duration-200 ${
                remember
                  ? 'gradient-primary border-transparent'
                  : 'border-surface group-hover:border-primary/40'
              }`}
            >
              <AnimatePresence>
                {remember && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15, ease: EASE }}
                  >
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            Remember me
          </button>

          <button
            type="button"
            onClick={() =>
              toast.info('Password recovery', {
                description: `This prototype has one test account: ${PROTOTYPE_CREDENTIALS.email} / ${PROTOTYPE_CREDENTIALS.password}`,
              })
            }
            className="text-[12.5px] font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <motion.button
          type="submit"
          disabled={pending}
          whileTap={{ scale: 0.985 }}
          className="w-full h-11 rounded-card gradient-primary text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-80 disabled:cursor-not-allowed transition-opacity"
        >
          <AnimatePresence mode="wait" initial={false}>
            {pending ? (
              <motion.span
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2 size={15} className="animate-spin" /> Signing in…
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                Sign in <ArrowRight size={15} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <p className="text-center text-[11px] text-muted-foreground">
          Press <Kbd>⌘</Kbd> <Kbd>↵</Kbd> to sign in
        </p>
      </form>

      {/* Prototype test account. This build has no backend: the only valid sign-in
          is the fixed test account below, so it is shown openly to testers. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
        className="mt-8 pt-6 border-t border-surface"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Prototype test account
        </p>
        <div className="flex items-center gap-3 p-3 rounded-card border border-surface bg-accent/20">
          <span className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Info size={15} className="text-white" />
          </span>
          <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed">
            <span className="block text-main">
              Email <span className="font-semibold">{PROTOTYPE_CREDENTIALS.email}</span>
            </span>
            <span className="block text-muted-foreground">
              Password <span className="font-semibold text-main">{PROTOTYPE_CREDENTIALS.password}</span>
            </span>
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={fillTestAccount}
            className="h-8 px-3 rounded-lg border border-surface text-[11.5px] font-semibold text-primary hover:border-primary/30 hover:bg-accent/40 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            Fill in
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  error,
  inputRef,
  trailing,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  trailing?: React.ReactNode;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-main mb-1.5">
        {label}
      </label>
      <div className="relative group">
        <Icon
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none"
        />
        <input
          id={id}
          ref={inputRef}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full h-11 pl-10 ${
            trailing ? 'pr-11' : 'pr-3.5'
          } rounded-card bg-background/60 border text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:ring-4 transition-all duration-200 ${
            error
              ? 'border-rose-500/50 focus:border-rose-500/60 focus:ring-rose-500/10'
              : 'border-surface focus:border-primary/40 focus:ring-primary/10'
          }`}
          {...props}
        />
        {trailing && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/60 border border-surface text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
