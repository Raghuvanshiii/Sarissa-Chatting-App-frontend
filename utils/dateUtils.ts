/**
 * Utility functions for chat message stream date dividers
 */

/**
 * Checks whether two message timestamps fall on different calendar days (local time)
 */
export function isDifferentCalendarDay(
  date1Input: string | Date | number,
  date2Input: string | Date | number
): boolean {
  const d1 = new Date(date1Input);
  const d2 = new Date(date2Input);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
}

/**
 * Formats a message timestamp into a chat date divider label:
 * - "Today" if from current day
 * - "Yesterday" if from the previous day
 * - Day of week (e.g. "Monday", "Tuesday") if older than yesterday but within 7 days
 * - Formatted date (e.g. "2 October 2026") if older than 1 week
 */
export function formatMessageDateDivider(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  // Normalize to local midnight for exact calendar day difference
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const diffMs = startOfToday - startOfMsgDay;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays > 1 && diffDays < 7) {
    // Day of the week (e.g. "Monday", "Tuesday")
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }

  // Older than 1 week: display the date
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a user's lastSeen timestamp:
 * - "last seen recently" if within 2 minutes or missing/invalid
 * - "last seen at 22:30" if from today
 * - "last seen yesterday" if from yesterday
 * - "last seen recently" for older dates/fallback
 */
export function formatLastSeen(dateInput?: string | Date | number | null): string {
  if (!dateInput) return 'last seen recently';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'last seen recently';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // If active within the last 2 minutes or future clock skew
  if (diffMs < 2 * 60 * 1000) {
    return 'last seen recently';
  }

  // Format time as HH:mm in 24-hour format (e.g. 22:30)
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Normalize to local midnight for exact calendar day difference
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfMsgDay) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return `last seen at ${timeStr}`;
  }

  if (diffDays === 1) {
    return 'last seen yesterday';
  }

  return 'last seen recently';
}

