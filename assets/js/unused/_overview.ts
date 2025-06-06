// Overview canvas definition

import { BaseScatterTrack } from "./_track";
import { create, get } from "../util/fetch";
import {
  createGraph,
  drawPoints,
  drawGraphLines,
  drawText,
  drawRotatedText,
} from "./_draw";

import { drawTrackDeprecated } from "./_navigation";
import { CHROMOSOMES, FONT_SIZE } from "../constants";

export class OverviewCanvas extends BaseScatterTrack {
  fullPlotWidth: number;
  plotHeight: number;
  titleMargin: number;
  legendMargin: number;
  x: number;
  y: number;
  leftRightPadding: number;
  topBottomPadding: number;
  leftmostPoint: number;
  patternCanvas: HTMLCanvasElement;
  baf: _InteractiveFeature;
  log2: _InteractiveFeature;
  disabledChroms: string[];
  width: number;
  height: number;
  staticCanvas: HTMLCanvasElement;
  markerElem: HTMLElement;
  dims: _ChromosomeDims;
  chromPos: _ChromosomePos[];

  constructor(
    xPos: number,
    fullPlotWidth: number,
    lineMargin: number,
    near: number,
    far: number,
    caseId: string,
    sampleName: string,
    genomeBuild: number,
    hgFileDir: string
  ) {
    super({ caseId, sampleName, genomeBuild, hgFileDir });

    // Plot variables
    this.fullPlotWidth = fullPlotWidth; // Width for all chromosomes to fit in
    this.plotHeight = 180; // Height of one plot
    this.titleMargin = 10; // Margin between plot and title
    this.legendMargin = 45; // Margin between legend and plot
    this.x = xPos; // Starting x-position for plot
    this.y = 20 + this.titleMargin + 2 * lineMargin; // Starting y-position for plot
    this.leftRightPadding = 2; // Padding for left and right in graph
    this.topBottomPadding = 8; // Padding for top and bottom in graph
    this.leftmostPoint = this.x + 10; // Draw y-values for graph left of this point

    // Setup canvas for repeated patterns
    this.patternCanvas = document.createElement("canvas");
    const size = 20;
    this.patternCanvas.width = size;
    this.patternCanvas.height = size;
    const patternCtx = this.patternCanvas.getContext("2d");
    patternCtx.fillStyle = "#E6E9ED";
    patternCtx.strokeStyle = "#4C6D94";
    patternCtx.lineWidth = Math.round(size / 10);
    patternCtx.lineCap = "square";
    patternCtx.fillRect(0, 0, size, size);
    patternCtx.moveTo(size / 2, 0);
    patternCtx.lineTo(size, size / 2);
    patternCtx.moveTo(0, size / 2);
    patternCtx.lineTo(size / 2, size);
    patternCtx.stroke();

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: "#000000", // Viz color
    };

    // Log2 ratio values
    this.log2 = {
      yStart: 3.0, // Start value for y axis
      yEnd: -3.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: "#000000", // Viz color
    };

    // Canvas variables
    this.disabledChroms = [];
    this.width = document.body.clientWidth; // Canvas width
    this.height = this.y + 2 * this.plotHeight + 2 * this.topBottomPadding; // Canvas height
    this.drawCanvas.width = parseInt(this.width.toString());
    this.drawCanvas.height = parseInt(this.height.toString());
    this.staticCanvas = document.getElementById(
      "overview-static"
    ) as HTMLCanvasElement;

    // Initialize marker div element
    this.markerElem = document.getElementById("overview-marker");
    this.markerElem.style.height = this.plotHeight * 2 + "px";
    this.markerElem.style.marginTop =
      0 - (this.plotHeight + this.topBottomPadding) * 2 + "px";

    // FIXME: What does this mean? What is the type? Something to ponder here
    // Set dimensions of overview canvases
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    this.getOverviewChromDim().then(() => {
      // Select a chromosome in overview track
      this.staticCanvas.addEventListener("mousedown", (event) => {
        event.stopPropagation();
        const selectedChrom = this.pixelPosToGenomicLoc(event.x);
        if (!this.disabledChroms.includes(selectedChrom.chrom)) {
          // Dont update if chrom previously selected
          // Move interactive view to selected region
          const chrom = selectedChrom.chrom;
          const start = 1;
          const end = this.dims[chrom].size - 1;
          // Mark region
          this.markRegion({ chrom, start, end });
          drawTrackDeprecated({ chrom, start, end }); // redraw canvas
        }
      });
      this.staticCanvas.parentElement.addEventListener(
        "mark-region",
        (event: CustomEvent) => {
          this.markRegion({ ...event.detail.region });
        }
      );
    });
  }

  pixelPosToGenomicLoc(pixelpos: number) {
    const match = {} as {chrom?: string, pos?: number};
    for (const my_chr of CHROMOSOMES) {
      const chr = this.dims[my_chr] as {x_pos: number, width: number, size: number};
      if (pixelpos > chr.x_pos && pixelpos < chr.x_pos + chr.width) {
        match.chrom = my_chr;
        match.pos = Math.floor((chr.size * (pixelpos - chr.x_pos)) / chr.width);
      }
    }
    return match;
  }

  async getOverviewChromDim() {
    await get("get-overview-chrom-dim", {
      x_pos: this.x,
      y_pos: this.y,
      plot_width: this.fullPlotWidth,
      genome_build: this.genomeBuild,
    }).then((result: {chrom_dims: _ChromosomeDims}) => {
      this.dims = result.chrom_dims;
      this.chromPos = CHROMOSOMES.map((chrom) => {
        return {
          region: `${chrom}:0-None`,
          x_pos: this.dims[chrom].x_pos + this.leftRightPadding,
          y_pos: this.dims[chrom].y_pos,
          x_ampl: this.dims[chrom].width - 2 * this.leftRightPadding,
        };
      });
    });
  }

  markRegion({ chrom, start, end }) {
    if (this.dims !== undefined) {
      const scale = this.dims[chrom].width / this.dims[chrom].size;
      const overviewMarker = document.getElementById("overview-marker");

      let markerStartPos, markerWidth;
      // Calculate position and size of marker
      if ((end - start) * scale < 2) {
        markerStartPos = 1 + (this.dims[chrom].x_pos + start * scale);
        markerWidth = 2;
      } else {
        markerStartPos = 1.5 + (this.dims[chrom].x_pos + start * scale);
        markerWidth = Math.max(2, Math.ceil((end - start) * scale) - 1);
      }

      // Update the dom element
      overviewMarker.style.left = markerStartPos + "px";
      overviewMarker.style.width = markerWidth + "px";
    }
  }

  async drawOverviewPlotSegment({
    canvas,
    chrom,
    width,
    chromCovData,
  }: {
    canvas: HTMLCanvasElement;
    chrom: string;
    width: number;
    // eslint-disable-next-line
    chromCovData: any;
  }) {
    // Draw chromosome title
    const ctx = canvas.getContext("2d");
    drawText({
      ctx,
      x: chromCovData.x_pos - this.leftRightPadding + width / 2,
      y: chromCovData.y_pos - this.titleMargin,
      text: chromCovData.chrom,
      fontProp: 10,
      align: "center",
    });

    // Draw rotated y-axis legends
    if (chromCovData.x_pos < this.leftmostPoint) {
      drawRotatedText({
        ctx,
        text: "B Allele Freq",
        textSize: FONT_SIZE["large"],
        posx: chromCovData.x_pos - this.legendMargin,
        posy: chromCovData.y_pos + this.plotHeight / 2,
        rotDegrees: -Math.PI / 2,
        color: this.titleColor,
      });
      drawRotatedText({
        ctx,
        text: "Log2 Ratio",
        textSize: FONT_SIZE["large"],
        posx: chromCovData.x_pos - this.legendMargin,
        posy: chromCovData.y_pos + 1.5 * this.plotHeight,
        rotDegrees: -Math.PI / 2,
        color: this.titleColor,
      });
    }
    // Draw BAF
    createGraph({
      ctx,
      x: chromCovData.x_pos - this.leftRightPadding,
      y: chromCovData.y_pos,
      width,
      height: this.plotHeight,
      yMargin: this.topBottomPadding,
      yStart: this.baf.yStart,
      yEnd: this.baf.yEnd,
      step: this.baf.step,
      addTicks: chromCovData.x_pos < this.leftmostPoint,
      color: this.borderColor,
      open: chrom !== CHROMOSOMES[0],
    });
    drawGraphLines({
      ctx,
      x: chromCovData.x_pos,
      y: chromCovData.y_pos,
      yStart: this.baf.yStart,
      yEnd: this.baf.yEnd,
      stepLength: this.baf.step,
      yMargin: this.topBottomPadding,
      width: width,
      height: this.plotHeight,
    });

    // Draw Log 2 ratio
    createGraph({
      ctx,
      x: chromCovData.x_pos - this.leftRightPadding,
      y: chromCovData.y_pos + this.plotHeight,
      width,
      height: this.plotHeight,
      yMargin: this.topBottomPadding,
      yStart: this.log2.yStart,
      yEnd: this.log2.yEnd,
      step: this.log2.step,
      addTicks: chromCovData.x_pos < this.leftmostPoint,
      color: this.borderColor,
      open: chrom !== CHROMOSOMES[0],
    });
    drawGraphLines({
      ctx,
      x: chromCovData.x_pos,
      y: chromCovData.y_pos + this.plotHeight,
      yStart: this.log2.yStart,
      yEnd: this.log2.yEnd,
      stepLength: this.log2.step,
      yMargin: this.topBottomPadding,
      width: width,
      height: this.plotHeight,
    });
    // Plot scatter data
    if (chromCovData.baf.length > 0 || chromCovData.data.length > 0) {
      drawPoints({
        ctx,
        data: chromCovData.baf,
        color: this.baf.color,
      });
      drawPoints({
        ctx,
        data: chromCovData.data,
        color: this.log2.color,
      });
    } else {
      const pattern = ctx.createPattern(this.patternCanvas, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(
        chromCovData.x_pos,
        chromCovData.y_pos + 1,
        width - 2,
        this.plotHeight * 2 - 2
      );
      this.disabledChroms.push(chrom);
    }
  }

  async drawOverviewContent(_printing) {
    await this.getOverviewChromDim();
    // query gens for coverage values
    const covData = await create("get-multiple-coverages", {
      case_id: this.caseId,
      sample_id: this.sampleName,
      genome_build: this.genomeBuild,
      plot_height: this.plotHeight,
      chromosome_pos: this.chromPos,
      top_bottom_padding: this.topBottomPadding,
      baf_y_start: this.baf.yStart,
      baf_y_end: this.baf.yEnd,
      log2_y_start: this.log2.yStart,
      log2_y_end: this.log2.yEnd,
      overview: "True",
      reduce_data: 1,
    });
    for (const [chrom, res] of Object.entries(covData.results)) {
      this.drawOverviewPlotSegment({
        canvas: this.staticCanvas,
        chrom: chrom,
        width: this.dims[chrom].width,
        chromCovData: res,
      });
    }
  }
}
