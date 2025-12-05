import {
  DEFAULT_COV_Y_RANGE,
  STYLE,
  PROFILE_SETTINGS_VERSION,
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

    const userProfile = loadProfileSettings(profileKey);
    this.defaultProfiles = defaultProfiles;
    this.baseTrackLayout = null;
    const defaultProfile = cloneProfile(defaultProfiles[profileKey]);

    const baseProfile = {
      version: PROFILE_SETTINGS_VERSION,
      profileKey,
      layout: null,
      colorAnnotationId: null,
      variantThreshold: 0,
      annotationSelections: [],
      coverageRange: DEFAULT_COV_Y_RANGE,
      trackHeights: defaultTrackHeights,
    };

    const profile: ProfileSettings =
      userProfile || defaultProfile || baseProfile;

    console.log("User profile", userProfile);
    console.log("Default profile", defaultProfile);
    console.log("Base profile", baseProfile);
    console.log("Used profile", profile);

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

  public setColorAnnotation(id: string | null) {
    this.profile.colorAnnotationId = id;
    this.save();
  }

  public getColorAnnotation(): string | null {
    return this.profile.colorAnnotationId;
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

  // Is this the one that should go back to the default?
  public resetTrackLayout() {

    const defaultProfile = cloneProfile(this.defaultProfiles[this.profileKey]);

    const baseProfile = {
      version: PROFILE_SETTINGS_VERSION,
      profileKey: this.profileKey,
      layout: null,
      colorAnnotationId: null,
      variantThreshold: 0,
      annotationSelections: [],
      coverageRange: DEFAULT_COV_Y_RANGE,
      trackHeights: defaultTrackHeights,
    };

    const baseLayoutProfile: ProfileSettings = this.baseTrackLayout
      ? { ...baseProfile, layout: this.baseTrackLayout }
      : baseProfile;

    const profile: ProfileSettings = defaultProfile || baseLayoutProfile;
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
    this.baseTrackLayout = layout
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
      samples.map((s) => (s.sampleType ? s.sampleType : "unknown")).sort(),
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
