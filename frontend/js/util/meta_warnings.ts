import { CHROMOSOMES } from "../constants";
import { Table } from "./table";

// FIXME: Hard-coded. We need some basic customizable system for this.
// Maybe the admin can configure the thresholds through CLI?
const COPY_NUMBER_COLUMN = "Estimated chromosomal copy numbers";
const MAX_COPY_NUMBER_DEVIATION = 0.1;

// FIXME: These needs to be split so mismatch and % are their own columns
const MISMATCH_FATHER = "Mismatch father";
const MISMATCH_MOTHER = "Mismatch mother";
const MAX_PERC_MISMATCH_DEVIATION = 0.1;

export const META_WARNING_ROW_CLASS = "meta-table__warning-row";
export const META_WARNING_CELL_CLASS = "meta-table__warning-cell";


export function getTableWarnings(table: Table, sex: Sex): CellWarning[] {
  const warnings = [];
  const colNames = table.getColumnNames();
  colNames.forEach((colName, colI) => {
    const column = table.getColumn(colName);
    column.forEach((value, rowI) => {
      const rowName = table.tableData.rowNames[rowI];
      const warningMsg = getCellWarning(colName, rowName, value.value, sex);
      if (warningMsg != null) {
        const warning: CellWarning = {
          colName,
          position: rowI,
          warning: warningMsg,
        };
        warnings.push(warning);
      }
    });
    // const colWarnings = getColumnWarnings(colName, column);
  });
  return warnings;
}

export function getCellWarning(
  cellType: string,
  rowName: string,
  value: string,
  sex: string | null,
): string | null {
  if (cellType == COPY_NUMBER_COLUMN) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return null;
    }

    const chromosome = parseChromosome(rowName);
    if (!chromosome) {
      return null;
    }
    const exceeds = exceedsCopyNumberDeviation(chromosome, parsedFloat, sex);
    if (exceeds) {
      return "Exceeds copy number deviation (>0.1 difference from 2)";
    }
    return null;
  }

  if (cellType == MISMATCH_FATHER || cellType == MISMATCH_MOTHER) {

    // FIXME: Count (perc%) format, clean up before merge

    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return null;
    }

    const exceeds = parsedFloat > MAX_PERC_MISMATCH_DEVIATION;
    if (exceeds) {
      return "Exceeds percentage deviation (>1%)"
    }
  }
}

export function parseChromosome(value: string): Chromosome | null {
  if (CHROMOSOMES.includes(value as Chromosome)) {
    return value as Chromosome;
  }
  console.warn(`Unable to parse ${value} as chromosome. Expected 1-22,M,F. Returning null.`)
  return null;
}

export function parseSex(value: string): Sex | null {
  if (["M", "F"].includes(value)) {
    return value as Sex;
  }
  console.warn(`Unable to parse ${value} as sex. Expected M or F. Returning null.`)
  return null;
}

function exceedsCopyNumberDeviation(
  chromosome: Chromosome,
  value: number,
  sex?: string,
): boolean {
  const normalizedRow = normalizeChromosomeLabel(chromosome);
  const isMale = isMaleSex(sex);
  const targetValue =
    isMale && (normalizedRow === "X" || normalizedRow === "Y") ? 1 : 2;
  return Math.abs(value - targetValue) > MAX_COPY_NUMBER_DEVIATION;
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
