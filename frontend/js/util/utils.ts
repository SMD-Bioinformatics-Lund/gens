import { COMBINED_SAMPLE_ID_DIVIDER } from "../constants";

export function getVisibleYCoordinates(
  element: { y1: number; y2: number },
  minHeight: number = 4,
) {
  let y1 = Math.round(element.y1);
  let y2 = Math.round(element.y2);
  const height = y2 - y1;
  if (height < minHeight) {
    y1 = Math.round(y1 - (minHeight - height) / 2);
    y2 = Math.round(y2 + (minHeight - height) / 2);
  }
  return { y1, y2 };
}

// FIXME: Make it deal with sub-bands as well
export function getBoundBoxes(
  bands,
  xScale: Scale,
  getLabel: (band: RenderBand) => string,
): HoverBox[] {
  return bands.map((band) => {
    return {
      label: getLabel(band),
      x1: xScale(band.start),
      x2: xScale(band.end),
      y1: band.y1,
      y2: band.y2,
    };
  });
}

export function getBandYScale(
  topBottomPad: number,
  bandPad: number,
  numberTracks: number,
  renderingHeight: number,
  labelSize: number = 0,
): BandYScale {
  return (pos: number, expanded: boolean) => {
    const renderingArea =
      renderingHeight - topBottomPad * 2 - bandPad * numberTracks;

    const trackHeight = renderingArea / numberTracks;

    let yShift = 0;
    if (expanded) {
      yShift = pos * trackHeight;
    }
    const y1 = topBottomPad + yShift + bandPad;
    const y2 = topBottomPad + yShift + trackHeight - bandPad - labelSize;

    return [y1, y2];
  };
}

export function getVisibleXCoordinates(
  screenPositions: _ScreenPositions,
  feature: { start: number; end: number },
  scale: number,
  minWidth: number = 4,
) {
  let x1 = Math.round(
    Math.max(0, feature.start - screenPositions.start) * scale,
  );
  let x2 = Math.round(
    Math.min(screenPositions.end, feature.end - screenPositions.start) * scale,
  );
  if (x2 - x1 < minWidth) {
    x1 = Math.round(x1 - (minWidth - (x2 - x1) / 2));
    x2 = Math.round(x2 + (minWidth - (x2 - x1) / 2));
  }
  return { x1, x2 };
}

// Check if two geometries are overlapping
// each input is an object with start/ end coordinates
// f          >----------------<
// s   >---------<
export function isElementOverlapping(
  first: { start: number; end: number },
  second: { start: number; end: number },
) {
  if (
    (first.start > second.start && first.start < second.end) || //
    (first.end > second.start && first.end < second.end) ||
    (second.start > first.start && second.start < first.end) ||
    (second.end > first.start && second.end < first.end)
  ) {
    return true;
  }
  return false;
}

// check if point is within an element
export function isWithinElementBbox(element: Box, point: Point) {
  return (
    element.x1 < point.x &&
    point.x < element.x2 &&
    element.y1 < point.y &&
    point.y < element.y2
  );
}

export function isWithinElementVisibleBbox(
  element: _DisplayElement,
  point: Point,
) {
  return (
    element.visibleX1 < point.x &&
    point.x < element.visibleX2 &&
    element.visibleY1 < point.y &&
    point.y < element.visibleY2
  );
}

// Convert to 32bit integer
export function stringToHash(in_str: string): number {
  let hash = 0;
  if (in_str.length === 0) return hash;
  for (let i = 0; i < in_str.length; i++) {
    const char = in_str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Given a map key -> object
 * Extract a map key -> object.value
 */
export function transformMap<A, T>(
  orig: Record<string, A>,
  extract: (string) => T,
): Record<string, T> {
  const entries = Object.entries(orig);
  const extracted: [string, T][] = entries.map(([key, data]) => [
    key,
    extract(data),
  ]);
  return Object.fromEntries(extracted);
}

export function rangeSize(range: [number, number]): number {
  return range[1] - range[0];
}

export function padRange(range: Rng, pad: number): Rng {
  return [range[0] + pad, range[1] - pad];
}

export function clampRange(range: Rng, min: number, max: number): Rng {
  const clampedMin = Math.max(range[0], min);
  const clampedMax = Math.min(range[1], max);
  return [clampedMin, clampedMax];
}

export function removeChildren(container: HTMLElement) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

export function zip<A, B>(a: A[], b: B[]): [A, B][] {
  if (a.length !== b.length) {
    throw Error(`Arrays are of different length: ${a.length} ${b.length}`);
  }
  return a.map((key, idx) => [key, b[idx]]);
}

export function pointInRange(point: number, range: Rng): boolean {
  return point > range[0] && point < range[1];
}

/**
 * Check if either end of target range is inside parent range
 *
 * @param targetRange
 * @param parentRange
 */
export function rangeInRange(targetRange: Rng, parentRange: Rng): boolean {
  return (
    pointInRange(targetRange[0], parentRange) ||
    pointInRange(targetRange[1], parentRange)
  );
}

/**
 * range1 is a superset of range2, i.e.:
 *
 * range1[0] ---------------------- range1[1]
 *        range2[0] -------- range2[1]
 */
export function rangeSurroundsRange(range1: Rng, range2: Rng): boolean {
  return range1[0] <= range2[0] && range1[1] >= range2[1];
}

export function range1OverlapsRange2(range1: Rng, range2: Rng): boolean {
  return pointInRange(range1[0], range2) || pointInRange(range1[0], range2);
}

export function eventInBox(
  point: { offsetX: number; offsetY: number },
  box: Box,
): boolean {
  return (
    point.offsetX >= box.x1 &&
    point.offsetX <= box.x2 &&
    point.offsetY >= box.y1 &&
    point.offsetY <= box.y2
  );
}

/**
 * @param nts
 * @param sizeNumber Optional number to set size.
 * Useful if you want the same prefix for a collection of values.
 * @returns
 */
export function prefixNts(nts: number, sizeNumber?: number): string {
  if (sizeNumber == null) {
    sizeNumber = nts;
  }
  if (sizeNumber < 10 ** 4) {
    return `${nts} bp`;
  } else if (sizeNumber < 10 ** 7) {
    return `${Math.round(nts / 10 ** 3)} kb`;
  } else {
    return `${Math.round(nts / 10 ** 6)} mb`;
  }
}

export function prettyRange(start: number, end: number): string {
  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
}

export function sortRange(range: Rng): Rng {
  return range.sort((a, b) => a - b) as Rng;
}

export function scaleRange(range: Rng, scale: Scale): Rng {
  return [scale(range[0]), scale(range[1])];
}

export function generateID() {
  const ts = Date.now().toString(36);
  const randBuf = crypto.getRandomValues(new Uint32Array(2));
  // build a 64-bit BigInt without any `n` literals
  const shift32 = BigInt(32);
  const high = BigInt(randBuf[0]) << shift32;
  const low = BigInt(randBuf[1]);
  const rand64 = (high | low).toString(36);
  return `${ts}-${rand64}`;
}

export function generateTicks(range: Rng, step: number): number[] {
  const factor = 1000;
  // Factor needed as ceil works with integers
  const first = Math.ceil((range[0] * factor) / (step * factor)) * step;

  const ticks = [];
  for (let v = first; v <= range[1]; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

/**
 * Tick size calculations for y-axis
 * Values are selected manually at the moment
 * If this grows, it might have to be automated
 */
export function getTickSize(range: Rng): number {
  const size = rangeSize(range);

  if (size > 3) {
    return 1;
  }
  if (size > 1.5) {
    return 0.5;
  }
  if (size > 0.75) {
    return 0.25;
  }
  return 0.1;
}

export function populateSelect(
  select: HTMLSelectElement,
  options: { id: string; label: string }[],
  includeNoSelect: boolean,
) {
  removeChildren(select);

  const getOption = (id: string, label: string) => {
    const opt = document.createElement("option") as HTMLOptionElement;
    opt.value = id;
    opt.innerHTML = label;
    return opt;
  };

  if (includeNoSelect) {
    select.appendChild(getOption("", "---"));
  }
  for (const option of options) {
    select.appendChild(getOption(option.id, option.label));
  }
}

export function sumArray(arr: number[]): number {
  let acc = 0;
  for (const val of arr) {
    acc += val;
  }
  return acc;
}

export function spliceMany<T>(arr: T[], inds: number[]) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (inds.includes(i)) {
      arr.splice(i, 1);
    }
  }
}

export function removeOne<T>(arr: T[], matchFn: (arg: T) => boolean): T {
  let foundIndex = -1;
  let count = 0;

  for (let i = 0; i < arr.length; i++) {
    if (matchFn(arr[i])) {
      count++;
      foundIndex = i;
      if (count > 1) {
        break;
      }
    }
  }

  if (count !== 1) {
    throw new Error(
      `${count} matches found for ${arr}. This function expects strictly one.`,
    );
  }

  const [removed] = arr.splice(foundIndex, 1);
  return removed;
}

export function div(): HTMLDivElement {
  return document.createElement("div") as HTMLDivElement;
}

export function getMainSample(samples: Sample[]): Sample {
  const mainSample = samples.find((s) =>
    ["proband", "tumor"].includes(s.sampleType),
  );
  if (mainSample != null) {
    return mainSample;
  }
  return samples[0];
}

export function setDiff<T>(set1: Set<T>, set2: Set<T>): Set<T> {
  const diff = new Set<T>();
  for (const val of set1) {
    if (!set2.has(val)) {
      diff.add(val);
    }
  }
  return diff;
}

export function getSampleKey(sample: SampleIdentifier): string {
  return `${sample.caseId}${COMBINED_SAMPLE_ID_DIVIDER}${sample.sampleId}${COMBINED_SAMPLE_ID_DIVIDER}${sample.genomeBuild}`;
}

export function getSampleIdentifierFromID(id: string): SampleIdentifier {
  const fields = id.split(COMBINED_SAMPLE_ID_DIVIDER);
  if (fields.length !== 3) {
    throw new Error(
      `"Expected three identifiers for the sample, found ${fields} in ${COMBINED_SAMPLE_ID_DIVIDER}`,
    );
  }
  const sample = {
    caseId: fields[0],
    sampleId: fields[1],
    genomeBuild: Number.parseInt(fields[2]),
  };
  return sample;
}

export function downloadAsJSON(object: unknown, filename: string) {
  const serialized = JSON.stringify(object, null, 2);
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
