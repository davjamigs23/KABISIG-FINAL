'use client';

import { useEffect } from 'react';

export default function GlobalFormBehavior() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !e.repeat) {
        const modalCandidates = Array.from(document.querySelectorAll<HTMLElement>(
          '[role="dialog"], [aria-modal="true"], [class~="fixed"][class~="inset-0"]'
        )).filter((element) => {
          const style = window.getComputedStyle(element);
          return element.getClientRects().length > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && element.getAttribute('aria-hidden') !== 'true';
        });

        const topModal = modalCandidates.reduce<HTMLElement | null>((top, candidate) => {
          if (!top) return candidate;
          const candidateZIndex = Number.parseInt(window.getComputedStyle(candidate).zIndex, 10) || 0;
          const topZIndex = Number.parseInt(window.getComputedStyle(top).zIndex, 10) || 0;
          return candidateZIndex >= topZIndex ? candidate : top;
        }, null);

        if (topModal) {
          const buttons = Array.from(topModal.querySelectorAll<HTMLButtonElement>('button'))
            .filter((button) => !button.disabled && button.getClientRects().length > 0);
          const isBackButton = (button: HTMLButtonElement) => {
            const label = `${button.getAttribute('aria-label') || ''} ${button.title || ''} ${button.textContent || ''}`;
            return button.hasAttribute('data-escape-back')
              || /(^|\s)(back|return)(\s|$)/i.test(label)
              || Boolean(button.querySelector('svg.lucide-arrow-left, svg.lucide-chevron-left'));
          };
          const isCloseButton = (button: HTMLButtonElement) => {
            const label = `${button.getAttribute('aria-label') || ''} ${button.title || ''} ${button.textContent || ''}`.trim();
            return button.hasAttribute('data-escape-close')
              || /\b(close|cancel|dismiss)\b/i.test(label)
              || /^okay,\s*i understand$/i.test(label)
              || Boolean(button.querySelector('svg.lucide-x'));
          };
          const actionButton = buttons.find(isBackButton)
            || buttons.find(isCloseButton);

          if (actionButton) {
            e.preventDefault();
            actionButton.click();
            return;
          }
        }
      }

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
