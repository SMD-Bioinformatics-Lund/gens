// import { getOverlapInfo, getTrackHeight } from "../../track/expand_track_utils";
// import { getBandYScale, getBoundBoxes, rangeSize } from "../../track/utils";
// import { STYLE } from "../../util/constants";
// import { CanvasTrack } from "./canvas_track";
// import { getLinearScale, renderBands, renderBorder } from "./render_utils";

// export class TranscriptsTrack extends CanvasTrack {
//   renderData: TranscriptsTrackData | null;
//   getRenderData: () => Promise<TranscriptsTrackData>;

//   async initialize(
//     label: string,
//     trackHeight: number,
//     getRenderData: () => Promise<TranscriptsTrackData>,
//   ) {
//     super.initializeCanvas(label, trackHeight);
//     this.initializeTooltip();
//     this.initializeExpander(trackHeight);
//     this.getRenderData = getRenderData;
//   }

//   async render(updateData: boolean) {
//     if (updateData || this.renderData == null) {
//       this.renderData = await this.getRenderData();
//     }

//     const { xRange, transcripts } = this.renderData;
//     const ntsPerPx = this.getNtsPerPixel(xRange);
//     console.log(ntsPerPx);
//     const showDetails = ntsPerPx < STYLE.tracks.zoomLevel.showDetails;
//     const dimensions = super.syncDimensions();
//     const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

//     const { numberLanes, bandOverlaps } = getOverlapInfo(transcripts);
//     const labelSize = (this.isExpanded() && showDetails) ? 20 : 0;
//     const yScale = getBandYScale(
//       STYLE.bandTrack.trackPadding,
//       STYLE.bandTrack.bandPadding,
//       this.isExpanded() ? numberLanes : 1,
//       this.dimensions.height,
//       labelSize
//     );

//     transcripts.forEach((transcript) => {
//       const bandNOverlap = bandOverlaps[transcript.id].lane;
//       let yRange = yScale(bandNOverlap, this.isExpanded());

//       const y1 = yRange[0];
//       const y2 = yRange[1];
//       const edgeColor = STYLE.bandTrack.edgeColor;

//       const renderBand = {
//         id: transcript.id,
//         start: transcript.start,
//         end: transcript.end,
//         y1,
//         y2,
//         color: "blue",
//         edgeColor,
//         label: transcript.id,
//       };

//       transcript.band = renderBand;

//       return transcript;
//     });

//     this.setExpandedTrackHeight(numberLanes, showDetails);

//     const transcriptBands = transcripts.map((tr) => tr.band);
//     this.hoverTargets = getBoundBoxes(transcriptBands, xScale);
//     renderBorder(this.ctx, dimensions, STYLE.tracks.edgeColor);

//     transcripts.forEach((tr) =>
//       drawTranscript(this.ctx, tr, xScale, showDetails, this.isExpanded()),
//     );
//   }

//   // setExpandedTrackHeight(numberLanes: number, showLabels: boolean) {
//   //   // Assign expanded height (only needed to do once atm actually)
//   //   const style = STYLE.bandTrack;
//   //   // FIXME: Do this based on the zoom / current region
//   //   const expandedHeight = getTrackHeight(
//   //     style.trackHeight.thin,
//   //     numberLanes,
//   //     style.trackPadding,
//   //     style.bandPadding,
//   //     showLabels,
//   //   );
//   //   super.setExpandedHeight(expandedHeight);
//   // }
// }

// customElements.define("transcripts-track", TranscriptsTrack);
