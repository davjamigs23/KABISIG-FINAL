export function formatAuditDetails(action: string, details: any): string {
  if (!details) return '—';
  let d: any = details;
  let extraText = '';
  
  if (typeof d === 'string') {
    // Extract "(Barangay: X)" if appended to the JSON string
    const bgyMatch = d.match(/\(Barangay:\s*(.*?)\)$/);
    if (bgyMatch) {
      extraText = `(Barangay: ${bgyMatch[1]})`;
      d = d.replace(/\(Barangay:\s*.*?\)$/, '').trim();
    }
    try { d = JSON.parse(d); } catch { return details; }
  }

  const parts: string[] = [];
  
  if (action === 'INVITE_SK_OFFICIAL') {
    if (d.official_role) parts.push(`Invited as ${d.official_role}`);
    if (d.official_email) parts.push(`Email: ${d.official_email}`);
    if (d.assigned_by) parts.push(`Assigned by ${d.assigned_by}`);
    if (d.invitation_method) parts.push(`Delivery: ${String(d.invitation_method).replace(/_/g, ' ')}`);
  } else if (action === 'ASSIGN_SK_CHAIRPERSON') {
    if (d.chairperson_email) parts.push(`Chairperson email: ${d.chairperson_email}`);
    if (d.assigned_by) parts.push(`Assigned by ${d.assigned_by}`);
  } else if (action === 'TRANSFER_CHAIRMANSHIP') {
    if (d.outgoing_email) parts.push(`From ${d.outgoing_email}`);
    if (d.incoming_email) parts.push(`To ${d.incoming_email}`);
    if (d.reason) parts.push(`Reason: ${d.reason}`);
  } else if (action === 'CANCEL_CHAIRPERSON_INVITATION') {
    if (d.cancelled_email) parts.push(`Cancelled invite: ${d.cancelled_email}`);
  } else if (action === 'UPDATE_USER_EMAIL') {
    if (d.new_email) parts.push(`New email: ${d.new_email}`);
  } else if (action === 'APPROVE_USER' || action === 'REJECT_USER') {
    if (d.user_email) parts.push(`User: ${d.user_email}`);
    if (d.role) parts.push(`Role: ${d.role}`);
    if (d.reason) parts.push(`Reason: ${d.reason}`);
  } else if (action.includes('SPAM') || action.includes('RESTRICT')) {
    if (d.reason) parts.push(`Reason: ${d.reason}`);
  }

  // Fallback for unknown actions
  if (parts.length === 0) {
    for (const [key, value] of Object.entries(d)) {
      if (value === null || value === undefined || value === '' || key === 'setup_url' || key === 'barangay_id') continue;
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      parts.push(`${label}: ${String(value)}`);
    }
  }

  return (parts.join(' • ') + ' ' + extraText).trim() || '—';
}