'use client';

import { useEffect } from 'react';

export default function GlobalFormBehavior() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const target = e.target as HTMLElement;
      if (!target || target.tagName !== 'TEXTAREA') return;
      const form = target.closest('form') as HTMLFormElement | null;
      if (!form) return;
      e.preventDefault();
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  return null;
}
