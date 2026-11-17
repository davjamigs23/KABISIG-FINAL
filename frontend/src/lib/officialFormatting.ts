export interface OfficialNameDetails {
  full_name?: string | null;
  role_id: number | string;
  official_role?: string | null;
  position?: string | null;
  sex?: string | null;
  gender_title?: string | null;
}

export function formatOfficialName(
  official: OfficialNameDetails,
  fallback = 'Name not listed'
): string {
  const name = String(official.full_name || '').trim();
  if (!name || name.toLowerCase() === 'pending invitation') return name || fallback;

  const roleId = Number(official.role_id);
  const position = String(official.position || official.official_role || '').toLowerCase();
  if (/^hon\.\s/i.test(name) || /^(mr\.|ms\.)\s/i.test(name)) return name;
  const ambiguousTitle = /^mr\.\/ms\.\s*/i.test(name);
  const displayName = ambiguousTitle ? name.replace(/^mr\.\/ms\.\s*/i, '') : name;

  if (roleId === 2 || (roleId === 3 && position.includes('kagawad'))) return `Hon. ${name}`;
  if (roleId === 3 && (position.includes('secretary') || position.includes('treasurer'))) {
    const sex = String(official.sex || '').toLowerCase();
    const title = official.gender_title || (sex === 'male' ? 'Mr.' : sex === 'female' ? 'Ms.' : 'Mr./Ms.');
    return `${title} ${displayName}`;
  }
  return name;
}
