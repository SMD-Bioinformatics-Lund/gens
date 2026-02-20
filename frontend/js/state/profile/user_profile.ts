import { getProfileValidationErrors } from "./profile_schema";


/**
 * Defined default profiles may not have been updated to the latest profile
 * version (as defined by the constant PROFILE_SETTINGS_VERSION).
 * These should not be used and give clear errors.
 */
export function getVersionCompatibleDefaultProfiles(
  defaultProfiles: Record<string, ProfileSettings>,
): Record<string, ProfileSettings> {
  const compatibleProfiles: Record<string, ProfileSettings> = {};

  for (const [profileKey, profile] of Object.entries(defaultProfiles)) {
    const validProfile = validateProfileCandidate(
      profile,
      `default profile for key "${profileKey}"`,
    );
    if (validProfile == null) {
      continue;
    }
    compatibleProfiles[profileKey] = validProfile;
  }

  return compatibleProfiles;
}

export function cloneProfile(
  profile?: ProfileSettings | null,
): ProfileSettings | null {
  if (!profile) {
    return null;
  }

  return JSON.parse(JSON.stringify(profile)) as ProfileSettings;
}

export function normalizeProfile(profile: ProfileSettings): ProfileSettings {
  return {
    ...profile,
    caseDisplayAliases: profile.caseDisplayAliases ?? {},
    sampleDisplayAliases: profile.sampleDisplayAliases ?? {},
  };
}

// FIXME: There are too many layers here
export function validateProfileCandidate(
  profile: unknown,
  sourceDescription: string,
): ProfileSettings | null {
  if (profile == null) {
    return null;
  }

  const errors = getProfileValidationErrors(profile);
  if (errors.length > 0) {
    console.error(
      `Gens profile validation failed for ${sourceDescription}. ` +
        `Falling back to regular profile handling. ${errors.join("; ")}`,
    );
    return null;
  }

  return normalizeProfile(profile as ProfileSettings);
}

