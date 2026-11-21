export interface OfficialNameSource {
  full_name?: string | null;
  name?: string | null;
  sex?: string | null;
  role_id?: number | string | null;
  official_role?: string | null;
  position?: string | null;
}

export function formatOfficialName(user: OfficialNameSource): string;
export function formatOfficialName(
  name: string | null | undefined,
  sex?: string | null,
  roleId?: number | string | null,
  position?: string | null
): string;
export function formatOfficialName(
  nameOrUser: string | null | undefined | OfficialNameSource,
  sex?: string | null,
  roleId?: number | string | null,
  position?: string | null
): string {
  const user = typeof nameOrUser === 'object' && nameOrUser !== null ? nameOrUser : null;
  const rawName = String(user?.full_name ?? user?.name ?? nameOrUser ?? '').trim();
  if (!rawName) return 'Unknown';

  const normalizedName = rawName.toLowerCase();
  if (normalizedName.includes('pending invitation')) return 'Pending Invitation';
  if (['sk chairperson', 'hon. sk chairperson', 'hon. sk kagawad'].includes(normalizedName)) {
    return 'Pending Invitation';
  }

  const cleanName = rawName.replace(/^(Mr\.\/Ms\.|Mr\.|Ms\.|Mrs\.|Hon\.)\s+/i, '').trim();
  const gender = String(user?.sex ?? sex ?? '').toLowerCase();
  const officialPosition = String(user?.official_role || user?.position || position || '').toLowerCase();
  const effectiveRoleId = user?.role_id ?? roleId;

  if (Number(effectiveRoleId) === 1 || Number(effectiveRoleId) === 2 || officialPosition.includes('kagawad')) {
    return `Hon. ${cleanName || 'Unknown'}`;
  }

  if (officialPosition.includes('secretary') || officialPosition.includes('treasurer')) {
    const title = gender === 'male' || gender === 'mr.'
      ? 'Mr.'
      : gender === 'female' || gender === 'ms.' || gender === 'mrs.'
        ? 'Ms.'
        : gender === 'other' || gender === 'mr./ms.'
          ? 'Mr./Ms.'
          : '';
    return title ? `${title} ${cleanName}` : cleanName || 'Unknown';
  }

  return cleanName || 'Unknown';
}

export function getFormattedName(user: OfficialNameSource): string {
  return formatOfficialName(user);
}
