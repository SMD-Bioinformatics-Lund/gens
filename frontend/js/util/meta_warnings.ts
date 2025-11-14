import { CHROMOSOMES } from "../constants";
import { COPY_NUMBER_COLUMN, MAX_COPY_NUMBER_DEVIATION, Table } from "./table";

export function getTableWarnings(table: Table, sex: Sex) {
  const warnings = [];
  const colNames = table.getColumnNames();
  colNames.forEach((colName, colI) => {
    const column = table.getColumn(colName);
    column.forEach((value, rowI) => {
      const rowName = table.tableData.rowNames[rowI];
      const parsedFloat = parseFloat(value.value);
      if (parsedFloat) {
        const warningMsg = getWarnings(colName, rowName, parsedFloat, sex);
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

function getWarnings(
  cellType: string,
  rowName: string,
  value: number,
  sex: string | null,
): string | null {
  if (cellType == COPY_NUMBER_COLUMN) {
    const chromosome = parseChromosome(rowName);
    if (!chromosome) {
      return null;
    }
    const exceeds = exceedsCopyNumberDeviation(chromosome, value, sex);
    if (exceeds) {
      return "Exceeds copy number deviation (>0.1 difference from 2)";
    }
  }
}

export function parseChromosome(value: string): Chromosome | null {
  if (value in CHROMOSOMES) {
    return value as Chromosome;
  }
  console.warn(`Unable to parse ${value} as chromosome. Expected 1-22,M,F. Returning null.`)
  return null;
}

export function parseSex(value: string): Sex | null {
  if (value in ["M", "F"]) {
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
