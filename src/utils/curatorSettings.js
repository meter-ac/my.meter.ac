const STORAGE_KEY = 'meteracnew.curatorSettings';

// Options aimed at people curating/QA-ing the network rather than casual
// visitors — kept in one small settings object so future additions (e.g. a
// staleness threshold override) don't each need their own storage key.
const DEFAULTS = {
  useTukeyFences: true,
  showOfflineCameras: true,
};

export function getCuratorSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setCuratorSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable (private browsing, disabled) — setting just
    // won't persist across reloads, not worth surfacing an error for.
  }
}
