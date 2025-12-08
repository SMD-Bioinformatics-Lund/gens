import { CHROMOSOMES } from "../constants";
import { Table } from "./table";

export const META_WARNING_ROW_CLASS = "meta-table__warning-row";
export const META_WARNING_CELL_CLASS = "meta-table__warning-cell";

// export function getTableWarnings(table: Table, sex: Sex): CellWarning[] {
//   const warnings = [];
//   const colNames = table.getColumnNames();
//   colNames.forEach((colName, colI) => {
//     const column = table.getColumn(colName);
//     column.forEach((value, rowI) => {
//       const rowName = table.tableData.rowNames[rowI];
//       const warningMsg = getMetaWarnings(colName, rowName, value.value, sex);
//       if (warningMsg != null) {
//         const warning: CellWarning = {
//           colName,
//           position: rowI,
//           warning: warningMsg,
//         };
//         warnings.push(warning);
//       }
//     });
//     // const colWarnings = getColumnWarnings(colName, column);
//   });
//   return warnings;
// }

// FIXME: The filters should be configured from config
// I.e. name, size, directions
export function getMetaWarnings(
  threshold: MetaWarningThreshold,
  rowName: string,
  value: string,
  sex: string | null,
): string | null {
  const parsedFloat = parseFloat(value);
  if (isNaN(parsedFloat)) {
    return null;
  }

  // FIXME: Look over this
  let exceeds;
  if (threshold.type == "chromosome") {
    const chromosome = parseChromosome(rowName);
    if (!chromosome) {
      return null;
    }
    exceeds = exceedsCopyNumberDeviation(
      chromosome,
      parsedFloat,
      threshold.size,
      sex,
    );
  } else if (threshold.direction == "above") {
    exceeds = parsedFloat > threshold.size;
  } else if (threshold.direction == "below") {
    exceeds = parsedFloat < threshold.size;
  } else if (threshold.direction == "both") {
    exceeds = parsedFloat < threshold.size || parsedFloat > threshold.size;
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
  const normalizedRow = normalizeChromosomeLabel(chromosome);
  const isMale = isMaleSex(sex);
  const targetValue =
    isMale && (normalizedRow === "X" || normalizedRow === "Y") ? 1 : 2;
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
