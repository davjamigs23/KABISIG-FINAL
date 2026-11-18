export function formatOfficialName(
  name: string | null | undefined,
  sex?: string | null,
  roleId?: number | string | null,
  position?: string | null
): string {
  const rawName = String(name || '').trim();
  if (!rawName) return 'Unknown';

  const normalizedName = rawName.toLowerCase();
  if (normalizedName.includes('pending invitation')) return 'Pending Invitation';
  if (['sk chairperson', 'hon. sk chairperson', 'hon. sk kagawad'].includes(normalizedName)) {
    return 'Pending Invitation';
  }

  const cleanName = rawName.replace(/^(Mr\.\/Ms\.|Mr\.|Ms\.|Mrs\.|Hon\.)\s+/i, '').trim();
  const gender = String(sex || '').toLowerCase();
  const officialPosition = String(position || '').toLowerCase();

  if (Number(roleId) === 2 || officialPosition.includes('kagawad')) {
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
