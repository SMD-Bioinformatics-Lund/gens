import {
  DEFAULT_COV_Y_RANGE,
  DEFAULT_VARIANT_THRES,
  PROFILE_SETTINGS_VERSION,
} from "../../constants";
import { USER_PROFILE_PREFIX } from "../../util/storage";
import { SessionProfiles } from "./session_layouts";

function makeProfile(overrides: Partial<ProfileSettings> = {}): ProfileSettings {
  return {
    version: PROFILE_SETTINGS_VERSION,
    profileKey: "tumor",
    layout: null,
    caseDisplayAliases: {},
    sampleDisplayAliases: {},
    colorAnnotationIds: [],
    variantThreshold: 20,
    annotationSelections: [],
    coverageRange: [0, 10],
    trackHeights: {
      bandCollapsed: 10,
      dotCollapsed: 11,
      dotExpanded: 12,
    },
    ...overrides,
  };
}

describe("SessionProfiles validation", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test("invalid saved user profile falls back to default profile", () => {
    const storageKey = `${USER_PROFILE_PREFIX}tumor`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...makeProfile(),
        trackHeights: null,
      }),
    );

    const defaultProfile = makeProfile({ variantThreshold: 42 });
    const profiles = new SessionProfiles(
      { tumor: defaultProfile },
      [{ sampleType: "tumor" } as Sample],
    );

    expect(profiles.getProfile().variantThreshold).toBe(42);
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('saved user profile for key "tumor"'),
    );
  });

  test("invalid default profile falls back to base profile", () => {
    const profiles = new SessionProfiles(
      {
        tumor: makeProfile({
          coverageRange: [0] as unknown as [number, number],
        }),
      },
      [{ sampleType: "tumor" } as Sample],
    );

    expect(profiles.getProfile().variantThreshold).toBe(DEFAULT_VARIANT_THRES);
    expect(profiles.getProfile().coverageRange).toEqual(DEFAULT_COV_Y_RANGE);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('default profile for key "tumor"'),
    );
  });

  test("invalid imported profile falls back to default profile", () => {
    const defaultProfile = makeProfile({ variantThreshold: 55 });
    const profiles = new SessionProfiles(
      { tumor: defaultProfile },
      [{ sampleType: "tumor" } as Sample],
    );

    profiles.loadProfile({} as ProfileSettings);

    expect(profiles.getProfile().variantThreshold).toBe(55);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("imported user profile"),
    );
  });

  test("valid imported profile is applied", () => {
    const profiles = new SessionProfiles(
      { tumor: makeProfile({ variantThreshold: 55 }) },
      [{ sampleType: "tumor" } as Sample],
    );

    profiles.loadProfile(
      makeProfile({
        variantThreshold: 99,
        profileKey: "custom",
      }),
    );

    expect(profiles.getProfile().variantThreshold).toBe(99);
    expect(profiles.getProfile().profileKey).toBe("custom");
  });
});
