/**
 * Rule #1: Name Structure — client-side helper
 * Mirrors backend/utils/name.ts for consistency.
 */

export interface NameParts {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
}

const SUFFIX_VALUES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v', 'jr', 'sr']);
const ROMAN_SUFFIXES = new Set(['ii', 'iii', 'iv', 'v', 'i']);

export function composeFullName(parts: NameParts): string {
  return [parts.first_name, parts.middle_name, parts.last_name, parts.suffix]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' ');
}

export function normalizeSuffix(input?: string | null): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  const lower = s.toLowerCase().replace(/\.$/, '');
  if (ROMAN_SUFFIXES.has(lower)) return lower.toUpperCase();
  if (lower === 'jr' || lower === 'sr') {
    const base = lower.charAt(0).toUpperCase() + lower.slice(1);
    return s.endsWith('.') ? base + '.' : base;
  }
  return s;
}

export interface SplitNameParts {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
}

export function splitFullName(fullName: string): SplitNameParts {
  const raw = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  const tokens: string[] = raw.split(' ');
  let suffix = '';
  const lastToken = tokens[tokens.length - 1] || '';
  if (lastToken && SUFFIX_VALUES.has(lastToken.toLowerCase())) {
    suffix = normalizeSuffix(lastToken) || lastToken;
    tokens.pop();
  }
  if (tokens.length === 0) return { first_name: '', middle_name: '', last_name: '', suffix };
  if (tokens.length === 1) {
    const only = tokens[0] || '';
    return { first_name: only, middle_name: '', last_name: only, suffix };
  }
  if (tokens.length === 2) {
    return { first_name: tokens[0] || '', middle_name: '', last_name: tokens[1] || '', suffix };
  }
  return {
    first_name: tokens[0] || '',
    middle_name: tokens.slice(1, -1).join(' '),
    last_name: tokens[tokens.length - 1] || '',
    suffix,
  };
}