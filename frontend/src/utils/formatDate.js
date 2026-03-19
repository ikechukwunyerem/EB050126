// src/utils/formatDate.js

const _dateFormatter = new Intl.DateTimeFormat('en-NG', {
  day:   'numeric',
  month: 'short',
  year:  'numeric',
});

const _dateTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  day:    'numeric',
  month:  'short',
  year:   'numeric',
  hour:   '2-digit',
  minute: '2-digit',
});

/** Format as "12 Jan 2025" */
export function formatDate(dateString) {
  if (!dateString) return '';
  return _dateFormatter.format(new Date(dateString));
}

/** Format as "12 Jan 2025, 14:30" */
export function formatDateTime(dateString) {
  if (!dateString) return '';
  return _dateTimeFormatter.format(new Date(dateString));
}

/** Format as "3 days ago", "just now", etc. */
export function formatRelative(dateString) {
  if (!dateString) return '';
  const date  = new Date(dateString);
  const now   = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs  = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs  / 24);

  if (diffSecs < 60)  return 'just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHrs  < 24)  return `${diffHrs}h ago`;
  if (diffDays < 30)  return `${diffDays}d ago`;
  return formatDate(dateString);
}
