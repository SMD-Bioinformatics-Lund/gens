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

    let userProfile = loadProfileSettings(
      profileKey,
      PROFILE_SETTINGS_VERSION,
    );
    if (
      userProfile != null &&
      userProfile.version != null &&
      userProfile.version !== PROFILE_SETTINGS_VERSION
    ) {
      console.error(
        `Gens profile version mismatch for key "${profileKey}". ` +
          `Found v${userProfile.version}, expected v${PROFILE_SETTINGS_VERSION}. ` +
          "Falling back to no profile. Ask your admin to update this profile.",
      );
      userProfile = null;
    }
    this.defaultProfiles = defaultProfiles;
    this.baseTrackLayout = null;
    let defaultProfile = cloneProfile(defaultProfiles[profileKey]);

    if (
      defaultProfile.version != null &&
      defaultProfile.version !== PROFILE_SETTINGS_VERSION
    ) {
      console.error(
        `Gens profile version mismatch for key "${profileKey}". ` +
          `Found v${defaultProfile.version}, expected v${PROFILE_SETTINGS_VERSION}. ` +
          "Falling back to no profile. Ask your admin to update this profile.",
      );
      defaultProfile = null;
    }

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

    const profile: ProfileSettings =
      userProfile || defaultProfile || baseProfile;

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

    const profile: ProfileSettings = defaultProfile || baseLayoutProfile;

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
    this.profile = profile;
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
