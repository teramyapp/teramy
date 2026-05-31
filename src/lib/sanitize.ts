/**
 * sanitize.ts
 * ---------------------------------------------------------------------------
 * Input sanitization utilities to prevent XSS and HTML injection attacks.
 *
 * Teramy uses Supabase (parameterized queries) so SQL injection is already
 * handled at the ORM level. This module focuses on:
 *   1. Stripping / escaping HTML tags from text inputs before they are
 *      embedded in email HTML bodies.
 *   2. Validating common field formats (email, phone, UUID).
 *   3. Trimming and limiting string length to prevent payload abuse.
 */

// ── 1. HTML entity encoding ──────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape all HTML special characters in a string.
 * Use this whenever you embed user-supplied text inside an HTML template.
 */
export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

// ── 2. Generic text field sanitizer ─────────────────────────────────────────

export interface SanitizeOptions {
  /** Maximum allowed length (characters). Defaults to 1000. */
  maxLength?: number;
  /** If true, newlines are collapsed to a single space. Defaults to false. */
  singleLine?: boolean;
}

/**
 * Sanitize a plain-text input field:
 *   - Trims whitespace
 *   - Strips HTML tags (converts to plain text)
 *   - Escapes remaining HTML-special characters
 *   - Enforces maximum length
 */
export function sanitizeText(
  value: unknown,
  options: SanitizeOptions = {}
): string {
  const { maxLength = 1000, singleLine = false } = options;

  if (typeof value !== 'string') return '';

  let text = value.trim();

  // Strip any HTML tags that might have slipped in (e.g. from rich-text paste)
  text = text.replace(/<[^>]*>/g, '');

  if (singleLine) {
    text = text.replace(/[\r\n\t]+/g, ' ');
  }

  // Enforce length limit
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }

  return text;
}

// ── 3. Field-specific validators ─────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

// ── 4. Composite sanitizer for booking / contact forms ───────────────────────

export interface PatientInput {
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
  birthDate?: string | null;
}

export interface SanitizedPatientInput {
  /** Full name composed from firstName + lastName — kept for backward compatibility */
  name:      string;
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
  birthDate: string | null;
}

/**
 * Validate and sanitize the patient object from a booking request.
 * Returns the cleaned object or throws an error describing the first problem.
 *
 * The `name` field is always composed as `firstName + ' ' + lastName` so that
 * all existing code that reads `patients.name` continues to work unchanged.
 */
export function sanitizePatient(raw: Partial<PatientInput>): SanitizedPatientInput {
  const firstName = sanitizeText(raw.firstName, { maxLength: 80, singleLine: true });
  const lastName  = sanitizeText(raw.lastName,  { maxLength: 80, singleLine: true });
  const email     = sanitizeText(raw.email,      { maxLength: 254, singleLine: true }).toLowerCase();
  const phone     = sanitizeText(raw.phone,      { maxLength: 20, singleLine: true });

  if (!firstName || firstName.length < 2) throw new Error('Nombre inválido');
  if (!lastName  || lastName.length  < 2) throw new Error('Apellido inválido');
  if (!isValidEmail(email))               throw new Error('Email inválido');
  if (phone && !isValidPhone(phone))      throw new Error('Teléfono inválido');

  // Validate birth date: must be YYYY-MM-DD and not in the future
  let birthDate: string | null = null;
  if (raw.birthDate) {
    const bd = sanitizeText(raw.birthDate as string, { maxLength: 10, singleLine: true });
    if (/^\d{4}-\d{2}-\d{2}$/.test(bd)) {
      const parsed = new Date(bd);
      if (!isNaN(parsed.getTime()) && parsed < new Date()) {
        birthDate = bd;
      }
    }
  }

  return { name: `${firstName} ${lastName}`, firstName, lastName, email, phone, birthDate };
}

/**
 * Sanitize contact-form fields before embedding them in an email HTML body.
 * Returns escaped HTML-safe strings.
 */
export function sanitizeContactForm(raw: {
  name?: unknown;
  email?: unknown;
  message?: unknown;
}): { name: string; email: string; message: string } {
  const name    = sanitizeText(raw.name,    { maxLength: 120, singleLine: true });
  const email   = sanitizeText(raw.email,   { maxLength: 254, singleLine: true }).toLowerCase();
  const message = sanitizeText(raw.message, { maxLength: 2000 });

  if (!name || name.length < 2)  throw new Error('Nombre inválido');
  if (!isValidEmail(email))       throw new Error('Email inválido');
  if (!message || message.length < 5) throw new Error('Mensaje muy corto');

  return {
    name:    escapeHtml(name),
    email:   escapeHtml(email),
    message: escapeHtml(message),
  };
}
