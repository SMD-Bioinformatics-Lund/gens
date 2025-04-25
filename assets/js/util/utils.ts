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

export function prefixNts(nts: number): string {
  if (nts < 10 ** 4) {
    return `${nts} bp`;
  } else if (nts < 10 ** 7) {
    return `${Math.round(nts / 10 ** 3)} kb`;
  } else {
    return `${Math.round(nts / 10 ** 6)} mb`;
  }
}

export function prettyRange(start: number, end: number): string {
  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
}
