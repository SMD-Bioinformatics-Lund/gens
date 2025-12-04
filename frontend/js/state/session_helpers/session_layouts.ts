import { COV_Y_RANGE, DEFAULT_VARIANT_THRES } from "../../constants";
import { loadProfileSettings } from "../../util/storage";

export class SessionProfiles {
  private profileKey: string;
  private defaultProfiles: Record<string, ProfileSettings>;

  // Loaded parameters
  private layoutProfileKey: string;
  private profileSignature: string;
  // private fallbackProfile: ProfileSettings | null;
  private trackHeights: TrackHeights;
  private colorAnnotationId: string | null = null;
  private annotationSelections: string[] = [];
  private coverageRange: Rng = COV_Y_RANGE;
  private variantThreshold: number = DEFAULT_VARIANT_THRES;
  private trackLayout: TrackLayout | null = null;

  constructor(
    defaultProfiles: Record<string, ProfileSettings>,
    samples: Sample[],
  ) {
    const profileKey = this.computeProfileSignature(samples);

    let profile = null;
    const userProfile = loadProfileSettings(this.layoutProfileKey);
    if (userProfile != null) {
      console.log("User profile found");
      profile = userProfile;
    } else if (!this.defaultProfiles[this.profileSignature]) {
      console.log("Default profile used");
      profile = this.defaultProfiles[this.profileSignature];
    }
    this.loadProfile(profile);
  }

  public loadProfile(profile: ProfileSettings): void {
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

    this.variantThreshold = profile.variantThreshold;
    this.trackLayout = profile.layout;
    this.trackHeights = profile.trackHeights;
    this.colorAnnotationId = profile.colorAnnotationId;
    this.coverageRange = profile.coverageRange;

    // A pre-selected track might disappear if the db is updated
    this.annotationSelections = [];
    for (const loadedSelectionId of profile.annotationSelections) {
      if (!this.idToAnnotSource[loadedSelectionId]) {
        console.warn(`Selection ID ${loadedSelectionId} not found, skipping`);
        continue;
      }
      this.annotationSelections.push(loadedSelectionId);
    }
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
}

function cloneProfile(
  profile?: ProfileSettings | null,
): ProfileSettings | null {
  if (!profile) {
    return null;
  }

  return JSON.parse(JSON.stringify(profile)) as ProfileSettings;
}
