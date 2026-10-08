import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// Formats a raw numeric input string into thousands-separated display form.
// Examples: "1000000" -> "1,000,000"   "1234.5" -> "1,234.5"   "12.345" -> "12.34"
export function formatCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  const intPart = parts[0] || '';
  const decPart = parts.slice(1).join('').slice(0, 2);
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart.length > 0 ? formattedInt + '.' + decPart : formattedInt;
}
