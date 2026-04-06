export function ensureDate(value: Date | string | number | null | undefined) {
  if (value instanceof Date) {
    return value;
  }

  if (value === null || value === undefined) {
    throw new Error('Expected a date value but received nothing');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return date;
}
