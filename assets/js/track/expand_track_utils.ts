// FIXME: Unit testing is needed for this function
/**
 * Get the number of prior ranges overlapping the current target
 * Also calculates the first free "lane", i.e. the first position where no range is present
 * Assumes ranges sorted on their start position
 */
export function getOverlapInfo(
  ranges: { id: string; start: number; end: number }[],
): {
  bandOverlaps: Record<string, { nOverlapping: number; lane: number }>;
  numberLanes: number;
} {
  const bandOverlaps: Record<string, { nOverlapping: number; lane: number }> =
    {};

  // Set of active ranges
  let overlapping: { start: number; end: number; lane: number }[] = [];

  // Go over each range
  ranges.forEach((currBand) => {
    const passed: { start: number; end: number; lane: number }[] = [];

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

    if (bandOverlaps[currBand.id] != null) {
      console.error(`ID ${currBand.id} is present multiple times`);
    }
    const currTrackInfo = {
      nOverlapping: overlapping.length,
      lane: currentLane,
    };
    // Store lane and n overlapping info for the current band
    bandOverlaps[currBand.id] = currTrackInfo;

    overlapping.push({
      start: currBand.start,
      end: currBand.end,
      lane: currentLane,
    });
  });

  // FIXME: Refactor this
  const maxLane = Math.max(
    ...Object.values(bandOverlaps).map((band) => band.lane),
  );
  const numberLanes = maxLane + 1;

  return {
    bandOverlaps,
    numberLanes,
  };
}

export function getTrackHeight(
  trackHeight: number,
  numberTracks: number,
  trackPadding: number,
  bandPadding: number,
  showLabels: boolean,
): number {

  // FIXME
  const labelHeight = showLabels ? 20 : 0;

  const singleBandHeight = trackHeight - (trackPadding + bandPadding) * 2;

  const multiTrackHeight =
    trackPadding * 2 + (singleBandHeight + bandPadding * 2 + labelHeight) * numberTracks;
  return multiTrackHeight;
}
