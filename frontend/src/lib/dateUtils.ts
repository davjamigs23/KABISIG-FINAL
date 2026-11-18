const PHILIPPINE_TIME_ZONE = 'Asia/Manila';

type DateValue = string | number | Date;

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
