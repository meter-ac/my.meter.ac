const STORAGE_KEY = 'meteracnew.favoriteStation';

export function getFavoriteStation() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setFavoriteStation(nodeId) {
  try {
    localStorage.setItem(STORAGE_KEY, nodeId);
  } catch {
    // localStorage unavailable (private browsing, disabled) — favorite just
    // won't persist across reloads, not worth surfacing an error for.
  }
}

export function clearFavoriteStation() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // see setFavoriteStation
  }
}
