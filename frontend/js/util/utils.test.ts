import {
  formatCaseLabel,
  getCaseLabel,
  getSampleLabel,
  normalizeAlias,
} from "./utils";

describe("Alias label helpers", () => {
  test("normalizeAlias trims and keeps non-empty values", () => {
    expect(normalizeAlias("  Display Label  ")).toBe("Display Label");
  });

  test("normalizeAlias returns null for missing or empty input", () => {
    expect(normalizeAlias()).toBeNull();
    expect(normalizeAlias(null)).toBeNull();
    expect(normalizeAlias("   ")).toBeNull();
  });

  test("getSampleLabel uses sample alias when present", () => {
    expect(getSampleLabel("sample-id", "  Proband  ")).toBe("Proband");
  });

  test("getSampleLabel falls back to sample id when alias is missing", () => {
    expect(getSampleLabel("sample-id", null)).toBe("sample-id");
    expect(getSampleLabel("sample-id", " ")).toBe("sample-id");
  });

  test("getCaseLabel prefers case alias over display case id", () => {
    expect(getCaseLabel("case-id", "display-case-id", " Case Alias ")).toBe(
      "Case Alias",
    );
  });

  test("getCaseLabel falls back to current case formatting", () => {
    expect(getCaseLabel("case-id", "display-case-id", null)).toBe(
      formatCaseLabel("case-id", "display-case-id"),
    );
    expect(getCaseLabel("case-id", null, " ")).toBe(
      formatCaseLabel("case-id", null),
    );
  });
});
