// Utility functions
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

export function getVisibleXCoordinates(
  screenPositions: ScreenPositions,
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
export function isElementOverlapping(first: any, second: any) {
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
export function isWithinElementBbox(element: ElementCoords, point: Point) {
  return (
    element.x1 < point.x &&
    point.x < element.x2 &&
    element.y1 < point.y &&
    point.y < element.y2
  );
}

export function isWithinElementVisibleBbox(
  element: DisplayElement,
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
export function transformMap<T>(
  orig: Record<string, any>,
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

export function removeChildren(container: HTMLElement) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

// FIXME: Unit testing is needed for this function
/**
 * Get the number of prior ranges overlapping the current target
 * Also calculates the first free "lane", i.e. the first position where no range is present
 * Assumes ranges sorted on their start position
 */
export function getOverlapInfo(
  ranges: { id: string; start: number; end: number }[],
): Record<string, { nOverlapping: number; lane: number }> {
  const returnInfo: Record<string, { nOverlapping: number; lane: number }> = {};

  // Set of active ranges
  let overlapping: { start: number; end: number; lane: number }[] = [];

  // Go over each range
  ranges.forEach((currBand) => {
    const passed: {start: number, end: number, lane: number}[] = [];

    // Check for active ranges no longer overlapping the latest range
    overlapping.forEach((overlapBand) => {
      if (currBand.start >= overlapBand.end) {
        passed.push(overlapBand);
      }
    });

    // Remove those passed
    passed.forEach((passedBand) => {
      const index = overlapping.indexOf(passedBand);
      overlapping.splice(index, 1);
    });

    // Find the first now available lane (n(overlapping)+1 is the common case)
    const lanesInUse = new Set(overlapping.map((band) => band.lane));
    let currentLane = lanesInUse.size;
    for (let i = 0; i < lanesInUse.size; i++) {
      if (!lanesInUse.has(i)) {
        currentLane = i;
        break;
      }
    }

    if (returnInfo[currBand.id] != null) {
      console.error(`ID ${currBand.id} is present multiple times`);
    }
    const currTrackInfo = {
      nOverlapping: overlapping.length,
      lane: currentLane,
    };
    // Store lane and n overlapping info for the current band
    returnInfo[currBand.id] = currTrackInfo;

    overlapping.push({
      start: currBand.start,
      end: currBand.end,
      lane: currentLane,
    });
  });

  return returnInfo;
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
 * range1 is a superset of range2, i.e.:
 * 
 * range1[0] ---------------------- range1[1]
 *        range2[0] -------- range2[1]
 */
export function rangeSurroundsRange(range1: Rng, range2: Rng): boolean {
  return range1[0] <= range2[0] && range1[1] >= range2[1];
}

export function range1OverlapsRange2(range1: Rng, range2: Rng): boolean {
  return pointInRange(range1[0], range2) || pointInRange(range1[0], range2)
}
