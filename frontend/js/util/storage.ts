import { IDB_CACHE } from "../constants";
import { idbDeleteDatabase } from "./indexeddb";

export const USER_PROFILE_PREFIX = "gens.trackLayout.";

export function saveProfileToBrowser(
  profileKey: string,
  layout: ProfileSettings,
): void {
  saveToBrowserSession(layout, `${USER_PROFILE_PREFIX}${profileKey}`);
}

export function loadProfileSettings(
  profileKey: string,
  expectedVersion?: number,
): ProfileSettings | null {
  const storageKey = `${USER_PROFILE_PREFIX}${profileKey}`;
  const stored = loadFromBrowserSession(storageKey) as ProfileSettings | null;
  if (!stored) {
    return null;
  }

  if (expectedVersion != null && stored.version !== expectedVersion) {
    console.error(
      `Gens profile validation failed for saved user profile key "${profileKey}". ` +
        `Expected version ${expectedVersion}, found ${stored.version ?? "missing"}. ` +
        "Removing invalid saved profile and falling back to default/base profile.",
    );
    localStorage.removeItem(storageKey);
    return null;
  }

  return stored;
}

export async function clearCachedData(): Promise<void> {
  clearProfileSettings();
  await clearIndexedDbCache();
}

function clearProfileSettings(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key && key.startsWith(USER_PROFILE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

async function clearIndexedDbCache(): Promise<void> {
  try {
    await idbDeleteDatabase(IDB_CACHE.dbName);
  } catch (error) {
    console.warn(`Failed to delete IndexedDB cache ${IDB_CACHE.dbName}`, error);
  }
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
