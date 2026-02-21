import { hasExpectedProfileSettingsKeys } from "./session_layouts";

describe("Profile settings key validation", () => {
  test("accepts required keys and optional keys", () => {
    const profile = {
      version: 3,
      profileKey: "proband",
      fileName: "profile.json",
      layout: null,
      caseDisplayAliases: {},
      sampleDisplayAliases: {},
      colorAnnotationIds: [],
      variantThreshold: 10,
      annotationSelections: [],
      coverageRange: [-3, 3],
      trackHeights: {
        bandCollapsed: 45,
        dotCollapsed: 45,
        dotExpanded: 200,
      },
    };

    expect(hasExpectedProfileSettingsKeys(profile)).toBe(true);
  });

  test("rejects profile missing required keys", () => {
    const profile = {
      version: 3,
      profileKey: "proband",
      layout: null,
      colorAnnotationIds: [],
      variantThreshold: 10,
      annotationSelections: [],
      coverageRange: [-3, 3],
    };

    expect(hasExpectedProfileSettingsKeys(profile)).toBe(false);
  });

  test("rejects profile with unexpected keys", () => {
    const profile = {
      version: 3,
      profileKey: "proband",
      layout: null,
      colorAnnotationIds: [],
      variantThreshold: 10,
      annotationSelections: [],
      coverageRange: [-3, 3],
      trackHeights: {
        bandCollapsed: 45,
        dotCollapsed: 45,
        dotExpanded: 200,
      },
      someUnexpectedKey: true,
    };

    expect(hasExpectedProfileSettingsKeys(profile)).toBe(false);
  });

  test("rejects non-object values", () => {
    expect(hasExpectedProfileSettingsKeys(null)).toBe(false);
    expect(hasExpectedProfileSettingsKeys([])).toBe(false);
    expect(hasExpectedProfileSettingsKeys("profile")).toBe(false);
  });
});
