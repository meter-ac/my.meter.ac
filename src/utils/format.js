export function timeAgo(unixSeconds) {
  if (!unixSeconds) return 'unknown';
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  // Readings are always within the last couple of hours, so this tier only
  // matters for longer-lived timestamps like a camera's last snapshot.
  if (days < 60) return `${days} days ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatReading(value) {
  return Math.round(value * 10) / 10;
}
