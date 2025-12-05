import { DEFAULT_COV_Y_RANGE, STYLE, TRACK_HEIGHTS, PROFILE_SETTINGS_VERSION as PROFILE_SETTINGS_VERSION } from "../../constants";
import { loadProfileSettings } from "../../util/storage";

// FIXME: Where should these defaults be used
const trackHeights: TrackHeights = {
  bandCollapsed: STYLE.tracks.trackHeight.m,
  dotCollapsed: STYLE.tracks.trackHeight.m,
  dotExpanded: STYLE.tracks.trackHeight.xl,
};

// FIXME: Seems we need a dedicated "save profile" button
export class SessionProfiles {
  private profile: ProfileSettings;
  private profileKey: string;

  constructor(
    defaultProfiles: Record<string, ProfileSettings>,
    samples: Sample[],
  ) {
    const profileKey = this.computeProfileSignature(samples);
    this.profileKey = profileKey;

    let profile = null;
    const userProfile = loadProfileSettings(profileKey);
    if (userProfile != null) {
      console.log("User profile found");
      profile = userProfile;
    } else if (!defaultProfiles[profileKey]) {
      console.log("Default profile used");
      profile = defaultProfiles[profileKey];
    } else {
      const profile: ProfileSettings = {
        version: PROFILE_SETTINGS_VERSION,
        profileKey: "unknown",
        // FIXME: How to default this one?
        trackLayout: null,
        colorAnnotationId: null,
        variantThreshold: 0,
        annotationSelections: [],
        coverageRange: DEFAULT_COV_Y_RANGE,
        trackHeights
      }
    }
    this.profile = profile;
    // this.profile = loadProfile(profile);
  }

  private save() {
    console.log("FIXME SAVE IT");
  }

  public getProfile(): ProfileSettings {
    return this.profile;
  }

  public getTrackHeights(): TrackHeights {
    return this.profile.trackHeights;
  }

  public setTrackHeights(heights: TrackHeights) {
    this.profile.trackHeights = heights;
  }

  public getCoverageRange(): [number, number] {
    return this.profile.coverageRange;
  }

  public setCoverageRange(range: [number, number]) {
    this.profile.coverageRange = range;
  }

  public setColorAnnotation(id: string | null) {
    this.profile.colorAnnotationId = id;
  }

  public getColorAnnotation(): string | null {
    return this.profile.colorAnnotationId;
  }

  public getAnnotationSelections(): string[] {
    return this.profile.annotationSelections;
  }

  public setAnnotationSelections(ids: string[]): void {
    this.profile.annotationSelections = ids;
  }

  public setVariantThreshold(threshold: number) {
    this.profile.variantThreshold = threshold;
  }

  // Is this the one that should go back to the default?
  public resetTrackLayout() {
    this.profile.trackLayout = null;
  }

  public getTrackLayout(): TrackLayout {
    return this.profile.trackLayout;
  }

  public setTrackLayout(layout: TrackLayout) {
    this.profile.trackLayout = layout;
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
  }

  private computeProfileSignature(samples: Sample[]): string {
    const types = new Set(
      samples.map((s) => (s.sampleType ? s.sampleType : "unknown")).sort(),
    );

    return Array.from(types).join("+");

    // const signature = Array.from(types).join("+");
    // return `v${TRACK_LAYOUT_VERSION}.${genomeBuild}.${signature}`;
  }

  // public getProfile(): ProfileSettings {
  //   return {
  //     version: TRACK_LAYOUT_VERSION,
  //     profileKey: this.layoutProfileKey,
  //     layout: this.trackLayout,
  //     colorAnnotationId: this.colorAnnotationId,
  //     annotationSelections: this.annotationSelections,
  //     coverageRange: this.coverageRange,
  //     trackHeights: this.trackHeights,
  //     variantThreshold: this.variantThreshold,
  //   };
  // }
}

function cloneProfile(
  profile?: ProfileSettings | null,
): ProfileSettings | null {
  if (!profile) {
    return null;
  }

  return JSON.parse(JSON.stringify(profile)) as ProfileSettings;
}

// function loadProfile(profile: ProfileSettings): ProfileSettings | null {
//   console.log("Loading profile", profile);

//   if (!profile) {
//     console.warn("No profile found, using defaults");
//     return;
//   }

//   if (profile.version != TRACK_LAYOUT_VERSION) {
//     console.warn(
//       `Version mismatch. Found ${profile.version}, Gens is currently on ${TRACK_LAYOUT_VERSION}. Dropping the saved layout`,
//     );
//     profile = undefined;
//     return;
//   }

//   return profile;
// }
