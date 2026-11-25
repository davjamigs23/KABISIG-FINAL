import type { SystemAuditLog } from '../types';
import { formatPhilippineDateTime } from '../lib/dateUtils';
import { formatAuditDetails } from '../lib/auditFormatter';

function getDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function AuditDetailsView({ action, details }: { action: string; details: string }) {
  const formatted = formatAuditDetails(action, details);
  const lines = formatted.split(/\r?\n/).filter(Boolean);
  if (lines.length > 1) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
        {lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
      </ul>
    );
  }
  return <p className="text-xs text-slate-600">{formatted}</p>;
}

export default function AuditLogAccordion({ logs }: { logs: SystemAuditLog[] }) {
  const grouped = new Map<string, SystemAuditLog[]>();
  for (const log of logs) {
    const key = getDateKey(log.timestamp);
    grouped.set(key, [...(grouped.get(key) || []), log]);
  }
  const dates = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  if (!logs.length) {
    return <p className="rounded-xl border border-slate-100 p-6 text-center text-xs font-bold text-slate-400">No audit logs recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {dates.map(date => (
        <details key={date} className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer rounded-xl bg-slate-50 px-4 py-3 text-xs font-extrabold text-[#091d64]">
            {date} <span className="ml-2 text-slate-500">({grouped.get(date)?.length || 0} events)</span>
          </summary>
          <div className="space-y-2 p-3">
            {(grouped.get(date) || []).map(log => (
              <details key={log.id} className="rounded-lg border border-slate-100">
                <summary className="cursor-pointer px-3 py-3 text-xs">
                  <span className="font-bold text-slate-800">{log.user} ({log.role})</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-mono font-semibold text-[#091d64]">{log.action.replace(/_/g, ' ')}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {formatPhilippineDateTime(log.timestamp, undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <AuditDetailsView action={log.action} details={log.details} />
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
