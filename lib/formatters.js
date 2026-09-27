// Pure formatting helpers shared across the UI.
// No DOM access, no network access — safe to import from server or client components.

/**
 * Convert a number of minutes into a compact human label.
 * 0        -> '0m'
 * 45       -> '45m'
 * 85       -> '1h 25m'
 * 120      -> '2h'
 */
export function formatDuration(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return '0m';

  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Localized short date, e.g. '14 Mar 2024'.
 * Returns an empty string for missing/invalid input.
 */
export function formatDate(iso, locale = 'en-GB') {
  if (!iso) return '';
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch (err) {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Localized short date + time, e.g. '14 Mar 2024, 09:31'.
 */
export function formatDateTime(iso, locale = 'en-GB') {
  if (!iso) return '';
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (err) {
    return date.toISOString().replace('T', ' ').slice(0, 16);
  }
}

/**
 * Integer percentage (0-100) of completed against total.
 * Guards against division by zero and out-of-range values.
 */
export function percent(completed, total) {
  const done = Number(completed);
  const all = Number(total);

  if (!Number.isFinite(done) || !Number.isFinite(all) || all <= 0) return 0;

  const value = Math.round((done / all) * 100);
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

const LEVEL_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * Human label for a course level slug.
 */
export function levelLabel(level) {
  if (!level || typeof level !== 'string') return 'All levels';
  const key = level.trim().toLowerCase();
  if (LEVEL_LABELS[key]) return LEVEL_LABELS[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

/**
 * Human label for a lesson progress status.
 */
export function statusLabel(status) {
  if (!status || typeof status !== 'string') return 'Not started';
  const key = status.trim().toLowerCase();
  return STATUS_LABELS[key] || 'Not started';
}

/**
 * Truncate text to `max` characters, appending an ellipsis when cut.
 */
export function truncate(text, max = 120) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const limit = Number(max);

  if (!Number.isFinite(limit) || limit <= 0) return '';
  if (str.length <= limit) return str;

  return `${str.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

/**
 * Parse the free-form tools field (JSON array or comma separated string)
 * into a clean array of labels.
 */
export function parseTools(tools) {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools.map((t) => String(t).trim()).filter(Boolean);

  const raw = String(tools).trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch (err) {
      // fall through to comma splitting
    }
  }

  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Format a plural-aware count, e.g. pluralize(1, 'lesson') -> '1 lesson'.
 */
export function pluralize(count, singular, plural) {
  const n = Number(count);
  const safe = Number.isFinite(n) ? n : 0;
  const word = safe === 1 ? singular : plural || `${singular}s`;
  return `${safe} ${word}`;
}

/**
 * Initials for an avatar-style mark, e.g. 'Ada Lovelace' -> 'AL'.
 */
export function initials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default {
  formatDuration,
  formatDate,
  formatDateTime,
  percent,
  levelLabel,
  statusLabel,
  truncate,
  parseTools,
  pluralize,
  initials,
};