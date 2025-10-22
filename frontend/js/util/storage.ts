export const TRACK_LAYOUT_PREFIX = "gens.trackLayout.";

export function saveProfileToBrowser(
  profileKey: string,
  layout: ProfileSettings,
): void {
  saveToBrowserSession(layout, `${TRACK_LAYOUT_PREFIX}${profileKey}`);
}

export function loadProfileSettings(
  profileKey: string,
): ProfileSettings | null {
  return loadFromBrowserSession(
    `${TRACK_LAYOUT_PREFIX}${profileKey}`,
  ) as ProfileSettings | null;
}

function saveToBrowserSession(value: StorageValue, key: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save key ${key} values ${value}`, e);
  }
}

function loadFromBrowserSession(key: string): null | StorageValue {
  try {
    const stored = localStorage.getItem(key);
    if (stored == null) {
      return null;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.warn(`Failed to load key ${key}`, e);
  }
}
