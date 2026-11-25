'use client';

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface PopupMessage {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

interface PopupDialogProps {
  notice: PopupMessage | null;
  onClose: () => void;
}

export default function PopupDialog({ notice, onClose }: PopupDialogProps) {
  if (!notice) return null;

  const isConfirmation = Boolean(notice.onConfirm);
  const Icon = notice.type === 'success' ? CheckCircle2 : notice.type === 'error' || notice.type === 'warning' ? AlertCircle : Info;
  const iconClass = notice.type === 'success'
    ? 'bg-emerald-100 text-emerald-600'
    : notice.type === 'error'
      ? 'bg-rose-100 text-rose-600'
      : notice.type === 'warning'
        ? 'bg-amber-100 text-amber-600'
        : 'bg-blue-100 text-blue-600';

  const handleConfirm = () => {
    notice.onConfirm?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="popup-dialog-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 id="popup-dialog-title" className="mb-2 text-lg font-bold text-slate-800">{notice.title}</h3>
        <p className="mb-6 whitespace-pre-wrap text-sm text-slate-600">{notice.message}</p>
        {isConfirmation ? (
          <div className="flex gap-2">
            <button type="button" data-escape-close onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 font-bold text-slate-600 hover:bg-slate-50">
              {notice.cancelLabel || 'Cancel'}
            </button>
            <button type="button" onClick={handleConfirm} className="flex-1 rounded-lg bg-[#091d64] py-2 font-bold text-white hover:bg-[#102a83]">
              {notice.confirmLabel || 'Confirm'}
            </button>
          </div>
        ) : (
          <button type="button" data-escape-close onClick={onClose} className="w-full rounded-lg bg-[#091d64] py-2 font-bold text-white hover:bg-[#102a83]">
            Okay, I understand
          </button>
        )}
      </div>
    </div>
  );
}
