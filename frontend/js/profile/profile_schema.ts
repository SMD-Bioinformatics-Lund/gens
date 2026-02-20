import { PROFILE_SETTINGS_VERSION } from "../constants";

type ProfileSchemaRule = {
  field: keyof ProfileSettings;
  optional?: boolean;
  isValid: (value: unknown) => boolean;
  getError: (value: unknown) => string;
};

export function getProfileValidationErrors(profile: unknown): string[] {
  if (!isRecord(profile)) {
    return ["Profile must be an object"];
  }

  const errors = validateProfileAgainstSchema(profile, PROFILE_SCHEMA);
  return errors;
}

function validateProfileAgainstSchema(
  profile: Record<string, unknown>,
  schema: ReadonlyArray<ProfileSchemaRule>,
): string[] {
  const errors: string[] = [];

  for (const rule of schema) {
    const value = profile[rule.field];

    if (value === undefined) {
      if (!rule.optional) {
        errors.push(`${rule.field} is required`);
      }
      continue;
    }

    if (rule.optional && value === null) {
      continue;
    }

    if (!rule.isValid(value)) {
      errors.push(rule.getError(value));
    }
  }

  return errors;
}

const PROFILE_SCHEMA: ReadonlyArray<ProfileSchemaRule> = [
  {
    field: "version",
    isValid: (value) =>
      Number.isInteger(value) && value === PROFILE_SETTINGS_VERSION,
    getError: (value) =>
      !Number.isInteger(value)
        ? "version must be an integer"
        : `version mismatch (found v${value}, expected v${PROFILE_SETTINGS_VERSION})`,
  },
  {
    field: "profileKey",
    isValid: isNonEmptyString,
    getError: () => "profileKey must be a non-empty string",
  },
  {
    field: "fileName",
    optional: true,
    isValid: (value) => typeof value === "string",
    getError: () => "fileName must be a string when provided",
  },
  {
    field: "layout",
    isValid: isTrackLayoutOrNull,
    getError: () => "layout must be null or a valid track layout object",
  },
  {
    field: "caseDisplayAliases",
    optional: true,
    isValid: isStringRecord,
    getError: () => "caseDisplayAliases must be a string-to-string map",
  },
  {
    field: "sampleDisplayAliases",
    optional: true,
    isValid: isStringRecord,
    getError: () => "sampleDisplayAliases must be a string-to-string map",
  },
  {
    field: "colorAnnotationIds",
    isValid: isStringArray,
    getError: () => "colorAnnotationIds must be an array of strings",
  },
  {
    field: "variantThreshold",
    isValid: isFiniteNumber,
    getError: () => "variantThreshold must be a finite number",
  },
  {
    field: "annotationSelections",
    isValid: isStringArray,
    getError: () => "annotationSelections must be an array of strings",
  },
  {
    field: "coverageRange",
    isValid: isCoverageRange,
    getError: () => "coverageRange must be a [number, number] tuple",
  },
  {
    field: "trackHeights",
    isValid: isTrackHeights,
    getError: () =>
      "trackHeights must contain numeric bandCollapsed, dotCollapsed and dotExpanded",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === "string");
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === "boolean");
}

function isCoverageRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => isFiniteNumber(item))
  );
}

function isTrackHeights(value: unknown): value is TrackHeights {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.bandCollapsed === "number" &&
    Number.isFinite(value.bandCollapsed) &&
    typeof value.dotCollapsed === "number" &&
    Number.isFinite(value.dotCollapsed) &&
    typeof value.dotExpanded === "number" &&
    Number.isFinite(value.dotExpanded)
  );
}

function isTrackLayout(value: unknown): value is TrackLayout {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isStringArray(value.order) &&
    isBooleanRecord(value.hidden) &&
    isBooleanRecord(value.expanded)
  );
}

function isTrackLayoutOrNull(value: unknown): value is TrackLayout | null {
  return value === null || isTrackLayout(value);
}
