export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function humanize(value: string) {
  return value.replaceAll('_', ' ');
}
