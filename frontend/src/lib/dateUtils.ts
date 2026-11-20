const PHILIPPINE_TIME_ZONE = 'Asia/Manila';

type DateValue = string | number | Date;

export function formatBirthdate(dateString: string | null | undefined): string {
  if (!dateString) return '';

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(dateString);
  let date: Date;

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);

    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return '';
    }
  } else {
    date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
  }

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

export function getPhilippineDateString(value: DateValue = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') => {
    const value = parts.find((item) => item.type === type)?.value;
    if (!value) throw new RangeError(`Unable to format Philippine date part: ${type}`);
    return value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatPhilippineDate(
  value: DateValue,
  locales?: string | string[],
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(locales, { ...options, timeZone: PHILIPPINE_TIME_ZONE });
}

export function formatPhilippineDateTime(
  value: DateValue,
  locales?: string | string[],
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(locales, { ...options, timeZone: PHILIPPINE_TIME_ZONE });
}
