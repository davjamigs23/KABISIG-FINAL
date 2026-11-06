const ACTION_LABELS: Record<string, string> = {
  'UPDATE_USER_CREDENTIALS': 'Updated User Credentials',
  'UPDATE_USER_EMAIL': 'Updated User Email',
  'UPDATE_BARANGAY_SETTINGS': 'Updated Barangay Settings',
  'ASSIGN_CHAIRPERSON': 'Assigned New Chairperson',
  'APPROVE_YOUTH': 'Approved Youth Registration',
  'REJECT_YOUTH': 'Rejected Youth Registration',
  'CREATE_PROGRAM': 'Created Program',
  'UPDATE_PROGRAM': 'Updated Program',
  'DELETE_PROGRAM': 'Deleted Program',
  'LOG_EXPENSE': 'Logged Disbursement',
  'RECORD_EXPENSE': 'Recorded Expense',
  'ALLOCATE_BUDGET': 'Allocated Budget',
  'UPDATE_BUDGET': 'Updated Budget',
  'APPROVE_DOCUMENT': 'Approved Document',
  'REJECT_DOCUMENT': 'Rejected Document',
  'SUBMIT_DOCUMENT': 'Submitted Document',
  'SUBMIT_FEEDBACK': 'Submitted Feedback',
  'CREATE_ANNOUNCEMENT': 'Created Announcement',
  'PUBLISH_ANNOUNCEMENT': 'Published Announcement',
  'APPROVE_ACCOUNT': 'Approved Account',
  'REJECT_ACCOUNT': 'Rejected Account',
  'SUSPEND_USER': 'Suspended User',
  'REACTIVATE_USER': 'Reactivated User',
  'TRANSFER_CHAIRPERSON': 'Transferred Chairperson',
  'SEND_INVITATION': 'Sent SK Official Invitation',
  'SET_TOTAL_BUDGET': 'Set Total SK Budget',
  'RECORD_ATTENDANCE': 'Recorded Attendance',
};

export function formatAuditAction(action: string | null | undefined): string {
  if (!action) return 'N/A';
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtAmount(n: any): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-PH');
}

export function formatAuditDetails(detailsOrAction: any, maybeDetails?: any): string {
  let details = maybeDetails !== undefined ? maybeDetails : detailsOrAction;
  if (!details) return 'N/A';

  // Parse JSON string if needed
  if (typeof details === 'string') {
    const cleaned = details.replace(/\s*\(Barangay:\s*[^)]*\)\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') details = parsed;
      else return cleaned;
    } catch {
      return cleaned;
    }
  }

  // Barangay Settings Update (clean output - skip FY unless changed)
  if (details.updated_by || details.chairperson || details.active_fiscal_year) {
    const parts: string[] = [];
    if (details.updated_by) parts.push('Updated By: ' + details.updated_by);
    else if (details.chairperson) parts.push('Chairperson: ' + details.chairperson);
    if (details.chairpersonEmail) parts.push('Email: ' + details.chairpersonEmail);
    if (details.barangay_name) parts.push('Barangay: ' + details.barangay_name);
    if (parts.length > 0) return parts.join(' | ');
  }

  // Diff format
  if (details.changes && typeof details.changes === 'object') {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(details.changes)) {
      const v: any = val;
      if (!v) continue;
      parts.push(key.replace(/_/g, ' ').toUpperCase() + ': ' + (v.old || 'None') + ' -> ' + (v.new || 'None'));
    }
    if (parts.length > 0) return parts.join(' | ');
  }

  // Email change
  if (details.old_email || details.new_email) {
    return 'Email: ' + (details.old_email || 'None') + ' -> ' + (details.new_email || 'None');
  }

  // Expense
  if (details.gross_amount !== undefined || details.net_amount !== undefined) {
    const amt = details.gross_amount !== undefined ? details.gross_amount : details.net_amount;
    const parts: string[] = ['Recorded ' + fmtAmount(amt)];
    if (details.title) parts.push('for "' + details.title + '"');
    if (details.budget_category) parts.push('under ' + details.budget_category);
    return parts.join(' ');
  }

  // Budget
  if (details.amount !== undefined && details.category) {
    const parts: string[] = ['Allocated ' + fmtAmount(details.amount)];
    parts.push('to ' + details.category);
    if (details.fiscal_year) parts.push('(FY ' + details.fiscal_year + ')');
    return parts.join(' ');
  }

  // Fallback (skip noisy keys — including active_fiscal_year now)
  const skipKeys = ['reason', 'updated_by', 'barangay_name', 'target_name', 'target_barangay', 'active_fiscal_year'];
  try {
    const entries = Object.entries(details).filter(([k, v]) => v !== undefined && v !== null && !skipKeys.includes(k));
    if (entries.length > 0) {
      return entries.map(([k, v]) => {
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ': ' + val;
      }).join(' | ');
    }
  } catch {}

  return 'System update recorded';
}