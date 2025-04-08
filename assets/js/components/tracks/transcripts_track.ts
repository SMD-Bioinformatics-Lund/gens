import { getOverlapInfo, getTrackHeight } from "../../track/expand_track_utils";
import { getBandYScale, getBoundBoxes, rangeSize } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class TranscriptsTrack extends CanvasTrack {
  renderData: TranscriptsTrackData | null;
  getRenderData: () => Promise<TranscriptsTrackData>;

  async initialize(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<TranscriptsTrackData>,
  ) {
    const expandable = true;
    super.initializeCanvas(label, trackHeight, expandable);
    this.initializeTooltip();
    this.getRenderData = getRenderData;
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    const { xRange, transcripts } = this.renderData;

    const dimensions = super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    const { numberLanes, bandOverlaps } = getOverlapInfo(transcripts);
    const yScale = getBandYScale(
      STYLE.bandTrack.trackPadding,
      STYLE.bandTrack.bandPadding,
      this.expanded ? numberLanes : 1,
      this.dimensions.height,
    );

    transcripts.forEach((transcript) => {
      const bandNOverlap = bandOverlaps[transcript.id].lane;
      let yRange = yScale(bandNOverlap, this.expanded);

      const y1 = yRange[0];
      const y2 = yRange[1];
      const edgeColor = STYLE.bandTrack.edgeColor;

      const renderBand = {
        id: transcript.id,
        start: transcript.start,
        end: transcript.end,
        y1,
        y2,
        color: "blue",
        edgeColor,
        label: transcript.id,
      };

      transcript.band = renderBand;

      return transcript;
    });

    if (this.expanded) {
      const style = STYLE.bandTrack;
      const expandedHeight = getTrackHeight(
        style.trackHeight.thin,
        numberLanes,
        style.trackPadding,
        style.bandPadding,
      );

      this.assignedHeight = expandedHeight;
    }

    const transcriptBands = transcripts.map((tr) => tr.band);
    this.hoverTargets = getBoundBoxes(transcriptBands, xScale);

    renderBorder(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const ntsPerPx = this.getNtsPerPixel(xRange);
    console.log(ntsPerPx);

    const zoomThres = 100000;

    if (ntsPerPx > zoomThres) {
      console.log("Rendering bands");
      renderBands(this.ctx, transcriptBands, xScale);
    } else {
      console.log("Rendering transcripts");
      // renderBands(this.ctx, transcriptBands, xScale);
      // renderTranscripts(this.ctx, transcripts, xScale);
      transcripts.forEach((tr) => drawTranscript(this.ctx, tr, xScale));
    }
  }
}

function drawTranscript(
  ctx: CanvasRenderingContext2D,
  transcript: RenderTranscript,
  xScale: (number) => number,
) {
  const band = transcript.band;

  const y1 = band.y1;
  const y2 = band.y2;
  const height = y2 - y1;

  // Body
  const xPxStart = xScale(band.start);
  const xPxEnd = xScale(band.end);
  ctx.fillStyle = STYLE.colors.lightGray;
  const width = xPxEnd - xPxStart;
  ctx.fillRect(xPxStart, y1, width, height);

  transcript.exons.forEach((exon) => {
    // Exons
    const xPxStart = xScale(exon.start);
    const xPxEnd = xScale(exon.end);
    ctx.fillStyle = "purple";
    const width = xPxEnd - xPxStart;
    ctx.fillRect(xPxStart, y1, width, height);
  })
}

customElements.define("transcripts-track", TranscriptsTrack);
