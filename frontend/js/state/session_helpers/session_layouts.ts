import { STYLE, TRACK_LAYOUT_VERSION } from "../../constants";
import { loadProfileSettings } from "../../util/storage";

// FIXME: Where should these defaults be used
const trackHeights: TrackHeights = {
  bandCollapsed: STYLE.tracks.trackHeight.m,
  dotCollapsed: STYLE.tracks.trackHeight.m,
  dotExpanded: STYLE.tracks.trackHeight.xl,
};

// FIXME: Seems we need a dedicated "save profile" button
export class SessionProfiles {
  public profile: ProfileSettings;
  public profileKey: string;

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
    }
    this.profile = loadProfile(profile);
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

function loadProfile(profile: ProfileSettings): ProfileSettings | null {
  console.log("Loading profile", profile);

  if (!profile) {
    console.warn("No profile found, using defaults");
    return;
  }

  if (profile.version != TRACK_LAYOUT_VERSION) {
    console.warn(
      `Version mismatch. Found ${profile.version}, Gens is currently on ${TRACK_LAYOUT_VERSION}. Dropping the saved layout`,
    );
    profile = undefined;
    return;
  }

  return profile;
}
