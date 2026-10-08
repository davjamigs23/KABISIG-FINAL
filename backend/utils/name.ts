/**
 * Rule #1: Name Structure
 * Central helper for composing/disassembling names across KABISIG.
 * Panel rec: First + Middle + Last + Suffix stored separately,
 * displayed as "First Middle Last Suffix".
 */

export interface NameParts {
  first_name?: string | null | undefined;
  middle_name?: string | null | undefined;
  last_name?: string | null | undefined;
  suffix?: string | null | undefined;
}

const SUFFIX_VALUES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v', 'jr', 'sr']);

/** Compose display name: "First Middle Last Suffix" (omits empties). */
export function composeFullName(parts: NameParts): string {
  const pieces = [
    (parts.first_name || '').trim(),
    (parts.middle_name || '').trim(),
    (parts.last_name || '').trim(),
    (parts.suffix || '').trim(),
  ].filter((p) => p.length > 0);
  return pieces.join(' ');
}

/** True if a name-part set is complete enough for display. */
export function hasValidNameParts(parts: NameParts): boolean {
  return Boolean((parts.first_name || '').trim() && (parts.last_name || '').trim());
}

/** Normalize suffix (capitalize known values, otherwise return as-is). */
const ROMAN_SUFFIXES = new Set(['ii', 'iii', 'iv', 'v', 'i']);

export function normalizeSuffix(input?: string | null): string | null {
  const s = (input || '').trim();
  if (!s) return null;

  const lower = s.toLowerCase().replace(/\.$/, '');

  // Roman numerals: uppercase fully (III, IV, V, II)
  if (ROMAN_SUFFIXES.has(lower)) {
    return lower.toUpperCase();
  }

  // Jr / Sr: title case with trailing period ('jr.' -> 'Jr.', 'jr' -> 'Jr.')
  if (lower === 'jr' || lower === 'sr') {
    const base = lower.charAt(0).toUpperCase() + lower.slice(1);
    return s.endsWith('.') ? base + '.' : base;
  }

  // Unknown suffix: return as-is
  return s;
}

/**
 * Best-effort split of a single "full_name" string into 4 parts.
 * Used for backward compatibility when a client sends only full_name.
 */
export interface SplitNameParts {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
}

export function splitFullName(fullName: string): SplitNameParts {
  const raw = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!raw) {
    return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  }

  const tokens: string[] = raw.split(' ');

  // Detect trailing suffix (last token)
  let suffix = '';
  const lastToken = tokens[tokens.length - 1] || '';
  if (lastToken && SUFFIX_VALUES.has(lastToken.toLowerCase())) {
    suffix = normalizeSuffix(lastToken) || lastToken;
    tokens.pop();
  }

  if (tokens.length === 0) {
    return { first_name: '', middle_name: '', last_name: '', suffix };
  }
  if (tokens.length === 1) {
    const only = tokens[0] || '';
    return { first_name: only, middle_name: '', last_name: only, suffix };
  }
  if (tokens.length === 2) {
    return { first_name: tokens[0] || '', middle_name: '', last_name: tokens[1] || '', suffix };
  }

  // ≥3 tokens: first = token[0], last = last, middle = everything between
  const first_name = tokens[0] || '';
  const last_name = tokens[tokens.length - 1] || '';
  const middle_name = tokens.slice(1, -1).join(' ');
  return { first_name, middle_name, last_name, suffix };
}

// ============================================================
// resolveName — Rule #1 (Name Structure)
// Central resolver used by all handlers that create/update users.
// Priority: (1) payload split fields, (2) payload full_name,
//           (3) existing split fields, (4) existing full_name (non-placeholder),
//           (5) fallback placeholder, (6) empty.
// ============================================================

export interface ResolvedName {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  full_name: string;
}

export interface ExistingNameRecord {
  first_name?: string | null | undefined;
  middle_name?: string | null | undefined;
  last_name?: string | null | undefined;
  suffix?: string | null | undefined;
  full_name?: string | null | undefined;
}

export interface ResolveNameOptions {
  payload: NameParts & { full_name?: string | null | undefined };
  existing?: ExistingNameRecord | null;
  placeholders?: string[];
  fallback?: { first_name: string; last_name: string; suffix?: string | null };
}

export function resolveName(opts: ResolveNameOptions): ResolvedName {
  const { payload, existing, placeholders = [], fallback } = opts;

  // 1. Payload has both first_name and last_name
  if ((payload.first_name || '').trim() && (payload.last_name || '').trim()) {
    const p = {
      first_name: (payload.first_name || '').trim(),
      middle_name: (payload.middle_name || '').trim(),
      last_name: (payload.last_name || '').trim(),
      suffix: normalizeSuffix(payload.suffix) || '',
    };
    return {
      first_name: p.first_name,
      middle_name: p.middle_name || null,
      last_name: p.last_name,
      suffix: p.suffix || null,
      full_name: composeFullName(p),
    };
  }

  // 2. Payload has full_name → split
  if (payload.full_name && payload.full_name.trim().length > 0) {
    const s = splitFullName(payload.full_name);
    return {
      first_name: s.first_name,
      middle_name: s.middle_name || null,
      last_name: s.last_name,
      suffix: s.suffix || null,
      full_name: composeFullName(s),
    };
  }

  // 3. Existing user has split fields
  if (existing && (existing.first_name || '').trim() && (existing.last_name || '').trim()) {
    const p = {
      first_name: (existing.first_name || '').trim(),
      middle_name: (existing.middle_name || '').trim(),
      last_name: (existing.last_name || '').trim(),
      suffix: normalizeSuffix(existing.suffix) || '',
    };
    return {
      first_name: p.first_name,
      middle_name: p.middle_name || null,
      last_name: p.last_name,
      suffix: p.suffix || null,
      full_name: composeFullName(p),
    };
  }

  // 4. Existing user has full_name (not a placeholder) → split
  const existingFull = (existing?.full_name || '').trim();
  const isPlaceholder = existingFull.length > 0 && placeholders.some((ph) => ph.toLowerCase() === existingFull.toLowerCase());
  if (existingFull && !isPlaceholder) {
    const s = splitFullName(existingFull);
    return {
      first_name: s.first_name,
      middle_name: s.middle_name || null,
      last_name: s.last_name,
      suffix: s.suffix || null,
      full_name: composeFullName(s),
    };
  }

  // 5. Fallback
  if (fallback) {
    const p = {
      first_name: fallback.first_name,
      middle_name: '',
      last_name: fallback.last_name,
      suffix: normalizeSuffix(fallback.suffix) || '',
    };
    return {
      first_name: p.first_name,
      middle_name: null,
      last_name: p.last_name,
      suffix: p.suffix || null,
      full_name: composeFullName(p),
    };
  }

  // 6. Empty
  return { first_name: '', middle_name: null, last_name: '', suffix: null, full_name: '' };
}