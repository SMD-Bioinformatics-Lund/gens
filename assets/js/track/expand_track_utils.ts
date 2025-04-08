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
  
  export function getTrackHeight(
    trackHeight: number,
    numberTracks: number,
    trackPadding: number,
    bandPadding: number,
  ): number {
    const singleBandHeight = trackHeight - (trackPadding + bandPadding) * 2;
    const multiTrackHeight =
      trackPadding * 2 + (singleBandHeight + bandPadding * 2) * numberTracks;
    return multiTrackHeight;
  }