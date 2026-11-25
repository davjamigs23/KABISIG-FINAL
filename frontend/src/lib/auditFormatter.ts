const ACTION_LABELS: Record<string, string> = {
  'UPDATE_USER_CREDENTIALS': 'Updated User Credentials',
  'UPDATE_USER_EMAIL': 'Updated User Email',
  'EMAIL_CHANGE': 'Updated User Email',
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

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${formatKey(key)}: ${formatValue(item)}`)
      .join('; ');
  }
  return String(value);
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatAmount(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatValue(value);
}

export function formatAuditDetails(detailsOrAction: any, maybeDetails?: any): string {
  const action = maybeDetails !== undefined && typeof detailsOrAction === 'string'
    ? detailsOrAction
    : '';
  let details = maybeDetails !== undefined ? maybeDetails : detailsOrAction;
  if (details === null || details === undefined || details === '') return 'No additional details were recorded.';

  if (typeof details === 'string') {
    const cleaned = details.replace(/\s*\(Barangay:\s*[^)]*\)\s*$/, '').trim();
    try {
      details = JSON.parse(cleaned);
    } catch {
      return cleaned || 'No additional details were recorded.';
    }
  }
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return formatValue(details);
  }

  const record = details as Record<string, any>;
  const title = record.title || record.subject;
  const documentType = record.document_type || record.type || record.category;
  const fileName = record.file_name || record.filename;

  if (action === 'SUBMIT_DOCUMENT') {
    const kind = documentType ? `${formatValue(documentType)} ` : '';
    const titleText = title ? ` titled '${formatValue(title)}'` : '';
    const fileText = fileName ? ` (File: ${formatValue(fileName)})` : '';
    return `Uploaded a ${kind}document${titleText}${fileText}.`;
  }
  if (action === 'APPROVE_DOCUMENT') {
    return `Approved the document${title ? ` titled '${formatValue(title)}'` : ''}.`;
  }
  if (action === 'REJECT_DOCUMENT') {
    const reason = record.feedback || record.reason;
    return `Rejected the document${title ? ` titled '${formatValue(title)}'` : ''}${reason ? `: ${formatValue(reason)}.` : '.'}`;
  }
  if (action === 'CREATE_ANNOUNCEMENT' || action === 'PUBLISH_ANNOUNCEMENT') {
    const verb = action === 'PUBLISH_ANNOUNCEMENT' ? 'Published' : 'Created';
    return `${verb} the announcement${title ? ` titled '${formatValue(title)}'` : ''}.`;
  }
  if (action === 'SUBMIT_FEEDBACK') {
    return `Submitted feedback${title ? ` titled '${formatValue(title)}'` : ''}.`;
  }
  if (record.old_email || record.new_email) {
    return `Changed the email from ${formatValue(record.old_email)} to ${formatValue(record.new_email)}.`;
  }
  if (record.gross_amount !== undefined || record.net_amount !== undefined) {
    const amount = record.gross_amount !== undefined ? record.gross_amount : record.net_amount;
    const item = title ? ` for '${formatValue(title)}'` : '';
    const category = record.budget_category ? ` under ${formatValue(record.budget_category)}` : '';
    return `Recorded an expense of ${formatAmount(amount)}${item}${category}.`;
  }
  if (record.amount !== undefined && record.category) {
    const fiscalYear = record.fiscal_year ? ` for fiscal year ${formatValue(record.fiscal_year)}` : '';
    return `Allocated ${formatAmount(record.amount)} to ${formatValue(record.category)}${fiscalYear}.`;
  }
  if (record.changes && typeof record.changes === 'object') {
    const changes = Object.entries(record.changes as Record<string, unknown>).map(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const change = value as { old?: unknown; new?: unknown };
        return `${formatKey(key)} changed from ${formatValue(change.old)} to ${formatValue(change.new)}.`;
      }
      return `${formatKey(key)} was updated to ${formatValue(value)}.`;
    });
    if (changes.length) return changes.join('\n');
  }
  if (record.outgoing_name || record.incoming_email) {
    const outgoing = record.outgoing_name ? `${formatValue(record.outgoing_name)}'s role` : "the outgoing Chairperson's role";
    const incoming = record.incoming_email ? ` to ${formatValue(record.incoming_email)}` : '';
    return `Transferred ${outgoing}${incoming}${record.reason ? ` (${formatValue(record.reason)})` : ''}.`;
  }

  const hiddenKeys = new Set(['id', 'user_id', 'tenant_id', 'storage_path', 'updated_by', 'active_fiscal_year']);
  const entries = Object.entries(record).filter(([key, value]) => (
    value !== undefined
    && value !== null
    && !hiddenKeys.has(key)
  ));
  if (!entries.length) return 'System update recorded.';
  return entries
    .map(([key, value]) => `${formatKey(key)}: ${formatValue(value)}.`)
    .join('\n');
}