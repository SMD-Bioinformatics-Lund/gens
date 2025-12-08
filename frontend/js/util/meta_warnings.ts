import { CHROMOSOMES } from "../constants";

export const META_WARNING_ROW_CLASS = "meta-table__warning-row";
export const META_WARNING_CELL_CLASS = "meta-table__warning-cell";

export function getMetaWarnings(
  threshold: WarningThreshold,
  rowName: string,
  value: string,
  sex: string | null,
): string | null {
  const parsedFloat = parseFloat(value);
  if (isNaN(parsedFloat)) {
    return null;
  }
  let exceeds;
  if (threshold.kind == "estimated_chromosome_count_deviate") {

    const chromosome = parseChromosome(rowName);
    if (!chromosome) {
      return null;
    }
    exceeds = exceedsCopyNumberDeviation(
      chromosome,
      parsedFloat,
      threshold.max_deviation,
      sex,
    );
  } else if (threshold.kind == "threshold_above") {
    exceeds = parsedFloat > threshold.size;
  } else if (threshold.kind == "threshold_below") {
    exceeds = parsedFloat < threshold.size;
  } else if (threshold.kind == "threshold_deviate") {
    exceeds =
      parsedFloat < threshold.size - threshold.max_deviation ||
      parsedFloat > threshold.size + threshold.max_deviation;
  }

  if (exceeds) {
    return threshold.message + `(${threshold.size})`;
  }
  return null;
}

export function parseChromosome(value: string): Chromosome | null {
  if (CHROMOSOMES.includes(value as Chromosome)) {
    return value as Chromosome;
  }
  console.warn(
    `Unable to parse ${value} as chromosome. Expected 1-22,M,F. Returning null.`,
  );
  return null;
}

export function parseSex(value: string): Sex | null {
  if (["M", "F"].includes(value)) {
    return value as Sex;
  }
  console.warn(
    `Unable to parse ${value} as sex. Expected M or F. Returning null.`,
  );
  return null;
}

function exceedsCopyNumberDeviation(
  chromosome: Chromosome,
  value: number,
  maxDeviation: number,
  sex?: string,
): boolean {

  const normalizedChrom = normalizeChromosomeLabel(chromosome);

  const isSexChromosome = ["X", "Y"].includes(normalizedChrom);

  // If no sex, don't perform testing for X/Y chromosomes
  if (!sex && isSexChromosome) {
    return false;
  }

  const isMale = isMaleSex(sex);
  const targetValue =
    isMale && (normalizedChrom === "X" || normalizedChrom === "Y") ? 1 : 2;
  return Math.abs(value - targetValue) > maxDeviation;
}

function normalizeChromosomeLabel(label: string | undefined): string {
  if (!label) {
    return "";
  }
  return label
    .replace(/[^a-z0-9]/gi, "")
    .replace(/^CHR/i, "")
    .toUpperCase();
}

function isMaleSex(sex?: string): boolean {
  if (!sex) {
    return false;
  }
  const normalized = sex.trim().toLowerCase();
  return normalized === "male" || normalized === "m";
}
