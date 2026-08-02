const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfWeek(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatCalendarDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// GitHub-contributions-style grid layout, shared by every calendar view
// (Nodes daily low/high, EEA single-value history). rows: array of objects
// with a `date` field (YYYY-MM-DD) — every other field is preserved as-is
// onto the resulting cell, so callers can carry whatever values they need
// (min/max for a dual grid, a single `value` for a single grid, etc).
export function buildCalendarGridLayout(rows) {
  if (!rows || rows.length === 0) return null;
  const gridStart = startOfWeek(`${rows[0].date}T00:00:00Z`);
  let lastMonth = null;
  const monthLabels = [];
  const cells = rows.map((r) => {
    const date = new Date(`${r.date}T00:00:00Z`);
    const dayOffset = Math.round((date.getTime() - gridStart.getTime()) / DAY_MS);
    const week = Math.floor(dayOffset / 7);
    const month = date.getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push({ week, label: MONTH_NAMES[month] });
      lastMonth = month;
    }
    return { ...r, dateStr: r.date, week, dayOfWeek: dayOffset % 7 };
  });
  const weeks = Math.max(...cells.map((c) => c.week)) + 1;
  return { cells, weeks, monthLabels };
}
