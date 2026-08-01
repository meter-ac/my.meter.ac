export function timeAgo(unixSeconds) {
  if (!unixSeconds) return 'unknown';
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

export function formatReading(value) {
  return Math.round(value * 10) / 10;
}
