import {
  DEFAULT_COV_Y_RANGE,
  STYLE,
  PROFILE_SETTINGS_VERSION,
  DEFAULT_VARIANT_THRES,
  NO_SAMPLE_TYPE_DEFAULT,
} from "../../constants";
import { loadProfileSettings, saveProfileToBrowser } from "../../util/storage";

const defaultTrackHeights: TrackHeights = {
  bandCollapsed: STYLE.tracks.trackHeight.m,
  dotCollapsed: STYLE.tracks.trackHeight.m,
  dotExpanded: STYLE.tracks.trackHeight.xl,
};

const REQUIRED_PROFILE_KEYS = [
  "version",
  "profileKey",
  "layout",
  "colorAnnotationIds",
  "variantThreshold",
  "annotationSelections",
  "coverageRange",
  "trackHeights",
];

const OPTIONAL_PROFILE_KEYS = ["fileName"];

const ALLOWED_PROFILE_KEYS = new Set([
  ...REQUIRED_PROFILE_KEYS,
  ...OPTIONAL_PROFILE_KEYS,
]);

export class SessionProfiles {
  private profile: ProfileSettings;
  private profileKey: string;
  private defaultProfiles: Record<string, ProfileSettings>;
  private baseTrackLayout: TrackLayout | null;

  constructor(
    defaultProfiles: Record<string, ProfileSettings>,
    samples: Sample[],
  ) {
    const profileKey = this.computeProfileSignature(samples);
    this.profileKey = profileKey;

    let userProfile = loadProfileSettings(profileKey, PROFILE_SETTINGS_VERSION);
    if (userProfile != null && !hasExpectedProfileSettingsKeys(userProfile)) {
      logProfileSettingsKeyMismatch(
        userProfile,
        `stored user profile for key "${profileKey}"`,
      );
      userProfile = null;
    }
    if (userProfile != null && userProfile.version !== PROFILE_SETTINGS_VERSION) {
      console.error(
        `Gens profile version mismatch for key "${profileKey}". ` +
          `Found v${userProfile.version ?? "missing"}, expected v${PROFILE_SETTINGS_VERSION}. ` +
          "Falling back to no profile. Ask your admin to update this profile.",
      );
      userProfile = null;
    }
    this.defaultProfiles = getVersionCompatibleDefaultProfiles(defaultProfiles);
    this.baseTrackLayout = null;
    const defaultProfile = cloneProfile(this.defaultProfiles[profileKey]);

    const baseProfile = {
      version: PROFILE_SETTINGS_VERSION,
      profileKey,
      layout: null,
      colorAnnotationIds: [],
      variantThreshold: DEFAULT_VARIANT_THRES,
      annotationSelections: [],
      coverageRange: DEFAULT_COV_Y_RANGE,
      trackHeights: defaultTrackHeights,
    };

    const profile = normalizeProfile(
      userProfile || defaultProfile || baseProfile,
    );

    const profileType = userProfile
      ? "user"
      : defaultProfile
        ? "default"
        : "none";
    console.log(`Used profile (type: ${profileType})`, profile);

    profile.profileKey = profileKey;
    this.profile = profile;
  }

  private save() {
    saveProfileToBrowser(this.profileKey, this.profile);
  }

  public getProfile(): ProfileSettings {
    return this.profile;
  }

  public getTrackHeights(): TrackHeights {
    return this.profile.trackHeights;
  }

  public setTrackHeights(heights: TrackHeights) {
    this.profile.trackHeights = heights;
    this.save();
  }

  public hasDefaultProfile(): boolean {
    return this.defaultProfiles[this.profileKey] != null;
  }

  public getDefaultProfile(): ProfileSettings | null {
    return cloneProfile(this.defaultProfiles[this.profileKey]);
  }

  public getCoverageRange(): [number, number] {
    return this.profile.coverageRange;
  }

  public setCoverageRange(range: [number, number]) {
    this.profile.coverageRange = range;
    this.save();
  }

  public setColorAnnotations(ids: string[]) {
    this.profile.colorAnnotationIds = ids;
    this.save();
  }

  public getColorAnnotations(): string[] {
    return this.profile.colorAnnotationIds;
  }

  public getAnnotationSelections(): string[] {
    return this.profile.annotationSelections;
  }

  public setAnnotationSelections(ids: string[]): void {
    this.profile.annotationSelections = ids;
    this.save();
  }

  public setVariantThreshold(threshold: number) {
    this.profile.variantThreshold = threshold;
    this.save();
  }

  public resetTrackLayout() {
    const defaultProfile = cloneProfile(this.defaultProfiles[this.profileKey]);

    const baseProfile = {
      version: PROFILE_SETTINGS_VERSION,
      profileKey: this.profileKey,
      layout: null,
      colorAnnotationIds: [],
      variantThreshold: DEFAULT_VARIANT_THRES,
      annotationSelections: [],
      coverageRange: DEFAULT_COV_Y_RANGE,
      trackHeights: defaultTrackHeights,
    };

    const baseLayoutProfile: ProfileSettings = this.baseTrackLayout
      ? { ...baseProfile, layout: this.baseTrackLayout }
      : baseProfile;

    const profile = normalizeProfile(defaultProfile || baseLayoutProfile);

    const profileType = defaultProfile ? "default" : "none";
    console.log(`Used profile (type: ${profileType})`, profile);

    this.profile = profile;
    this.save();
  }

  public getTrackLayout(): TrackLayout {
    return this.profile.layout;
  }

  public setTrackLayout(layout: TrackLayout) {
    this.profile.layout = layout;

    this.save();
  }

  public setBaseTrackLayout(layout: TrackLayout) {
    this.baseTrackLayout = layout;
  }

  public getVariantThreshold(): number {
    return this.profile.variantThreshold;
  }

  public getLayoutProfileKey(): string {
    return this.profile.profileKey;
  }

  public loadProfile(profile: ProfileSettings): void {
    if (!hasExpectedProfileSettingsKeys(profile)) {
      logProfileSettingsKeyMismatch(profile, "imported profile settings");
      this.resetTrackLayout();
      return;
    }
    this.profile = normalizeProfile(profile);
  }

  public updateProfileKey(samples: Sample[]): void {
    this.profileKey = this.computeProfileSignature(samples);
    this.profile.profileKey = this.profileKey;
  }

  private computeProfileSignature(samples: Sample[]): string {
    const types = new Set(
      samples
        .map((s) => (s.sampleType ? s.sampleType : NO_SAMPLE_TYPE_DEFAULT))
        .sort(),
    );

    return Array.from(types).join("+");
  }
}

function cloneProfile(
  profile?: ProfileSettings | null,
): ProfileSettings | null {
  if (!profile) {
    return null;
  }

  return JSON.parse(JSON.stringify(profile)) as ProfileSettings;
}

function normalizeProfile(profile: ProfileSettings): ProfileSettings {
  return { ...profile };
}

/**
 * Defined default profiles may not have been updated to the latest profile
 * version (as defined by the constant PROFILE_SETTINGS_VERSION).
 * These should not be used and give clear errors.
 */
function getVersionCompatibleDefaultProfiles(
  defaultProfiles: Record<string, ProfileSettings>,
): Record<string, ProfileSettings> {
  const compatibleProfiles: Record<string, ProfileSettings> = {};

  for (const [profileKey, profile] of Object.entries(defaultProfiles)) {
    if (!hasExpectedProfileSettingsKeys(profile)) {
      logProfileSettingsKeyMismatch(
        profile,
        `default profile for key "${profileKey}"`,
      );
      continue;
    }
    if (profile.version !== PROFILE_SETTINGS_VERSION) {
      console.error(
        `Gens profile version mismatch for key "${profileKey}". ` +
          `Found v${profile.version ?? "missing"}, expected v${PROFILE_SETTINGS_VERSION}. ` +
          "Ignoring default profile. Ask your admin to update this profile.",
      );
      continue;
    }
    compatibleProfiles[profileKey] = profile;
  }

  return compatibleProfiles;
}

export function hasExpectedProfileSettingsKeys(
  profile: unknown,
): profile is ProfileSettings {
  if (profile == null || typeof profile !== "object" || Array.isArray(profile)) {
    return false;
  }

  const keys = Object.keys(profile);
  const missingKeys = REQUIRED_PROFILE_KEYS.filter((key) => !(key in profile));
  const unexpectedKeys = keys.filter((key) => !ALLOWED_PROFILE_KEYS.has(key));

  return missingKeys.length === 0 && unexpectedKeys.length === 0;
}

function logProfileSettingsKeyMismatch(profile: unknown, context: string): void {
  if (profile == null || typeof profile !== "object" || Array.isArray(profile)) {
    console.error(
      `Gens profile key mismatch for ${context}. Expected profile object. Falling back to no profile.`,
    );
    return;
  }

  const keys = Object.keys(profile);
  const missingKeys = REQUIRED_PROFILE_KEYS.filter((key) => !(key in profile));
  const unexpectedKeys = keys.filter((key) => !ALLOWED_PROFILE_KEYS.has(key));
  const mismatchReasons: string[] = [];

  if (missingKeys.length > 0) {
    mismatchReasons.push(`missing keys: ${missingKeys.join(", ")}`);
  }

  if (unexpectedKeys.length > 0) {
    mismatchReasons.push(`unexpected keys: ${unexpectedKeys.join(", ")}`);
  }

  console.error(
    `Gens profile key mismatch for ${context}. ${mismatchReasons.join("; ")}. Falling back to no profile.`,
  );
}
