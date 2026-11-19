'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface PopupMessage {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  setupLink?: string;
}

interface PopupDialogProps {
  notice: PopupMessage | null;
  onClose: () => void;
}

export default function PopupDialog({ notice, onClose }: PopupDialogProps) {
  const [copiedSetupLink, setCopiedSetupLink] = useState('');
  const [copyError, setCopyError] = useState('');
  if (!notice) return null;

  const isConfirmation = Boolean(notice.onConfirm);
  const setupLink = notice.setupLink;
  const Icon = notice.type === 'success' ? CheckCircle2 : notice.type === 'error' ? AlertCircle : Info;
  const iconClass = notice.type === 'success'
    ? 'bg-emerald-100 text-emerald-600'
    : notice.type === 'error'
      ? 'bg-rose-100 text-rose-600'
      : 'bg-blue-100 text-blue-600';

  const handleConfirm = () => {
    notice.onConfirm?.();
    onClose();
  };

  const handleCopySetupLink = async () => {
    if (!setupLink) return;
    setCopyError('');
    if (!navigator.clipboard?.writeText) {
      setCopyError('Clipboard access is unavailable. Select and copy the link above.');
      return;
    }

    try {
      await navigator.clipboard.writeText(setupLink);
      setCopiedSetupLink(setupLink);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : 'Failed to copy the setup link.');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="popup-dialog-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 id="popup-dialog-title" className="mb-2 text-lg font-bold text-slate-800">{notice.title}</h3>
        <p className="mb-6 whitespace-pre-wrap text-sm text-slate-600">{notice.message}</p>
        {setupLink && (
          <details className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
              Email not received? Click here to copy the setup link manually.
            </summary>
            <div className="mt-3">
              <p className="mb-2 text-xs font-bold text-slate-700">Setup link</p>
              <code className="block max-h-24 select-all overflow-auto break-all rounded-lg bg-white p-2 text-[11px] text-slate-700">
                {setupLink}
              </code>
              <button
                type="button"
                onClick={() => void handleCopySetupLink()}
                className="mt-2 rounded-lg bg-[#091d64] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#102a83]"
              >
                {copiedSetupLink === setupLink ? 'Copied' : 'Copy setup link'}
              </button>
              {copyError && <p role="alert" className="mt-2 text-xs text-rose-700">{copyError}</p>}
            </div>
          </details>
        )}
        {isConfirmation ? (
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 font-bold text-slate-600 hover:bg-slate-50">
              {notice.cancelLabel || 'Cancel'}
            </button>
            <button type="button" onClick={handleConfirm} className="flex-1 rounded-lg bg-[#091d64] py-2 font-bold text-white hover:bg-[#102a83]">
              {notice.confirmLabel || 'Confirm'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={onClose} className="w-full rounded-lg bg-[#091d64] py-2 font-bold text-white hover:bg-[#102a83]">
            Okay, I understand
          </button>
        )}
      </div>
    </div>
  );
}
