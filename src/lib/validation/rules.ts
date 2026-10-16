/**
 * Shared field-validation primitives.
 *
 * These exist so "is this a valid email" has one answer across the portal. The
 * login form and the new-customer wizard previously each carried their own
 * copy of this regex, which is exactly how two screens end up disagreeing about
 * whether an address is acceptable.
 *
 * Keep these primitives dumb and message-free. Feature validators compose them
 * and own the wording, because copy is translated and these are not.
 *
 * The backend remains authoritative. Client validation exists to give fast
 * feedback, not to decide what is allowed.
 */

/** Loose by design: the only reliable email check is sending mail to it. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cambodian numbers are entered with spaces, dashes, and an optional +855. */
const PHONE_PATTERN = /^\+?[\d\s-]{6,20}$/;

export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function isPresent(value: string | null | undefined): boolean {
  return !isBlank(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}
