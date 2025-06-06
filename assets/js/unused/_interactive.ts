// Functions for rendering the interactive canvas

import {
  drawRotatedText,
  drawPoints,
  drawText,
  createGraph,
  drawVerticalTicks,
  drawGraphLines,
} from "./_draw";
import {
  drawTrackDeprecated,
  zoomIn,
  zoomOut,
  keyLogger,
  limitRegionToChromosome,
  readInputField,
} from "./_navigation";
import { get } from "../util/fetch";
import { BaseScatterTrack } from "./_track";

export class InteractiveCanvas extends BaseScatterTrack {
  x: number;
  y: number;
  plotWidth: number;
  titleMargin: number;
  legendMargin: number;
  leftRightPadding: number;
  topBottomPadding: number;
  extraWidth: number;
  plotHeight: number;
  titleYPos: number | null;
  titleBbox: { x: number; y: number; width: number; height: number } | null;
  canvasHeight: number;
  // eslint-disable-next-line
  inputField: any;
  offscreenPosition: _OffscreenPosition;
  onscreenPosition: _OnscreenPosition;

  baf: _InteractiveFeature;
  log2: _InteractiveFeature;

  drawWidth: number;

  allowDraw: boolean;

  contentCanvas: HTMLCanvasElement;
  staticCanvas: HTMLCanvasElement;
  loadingDiv: HTMLElement;
  markerElem: HTMLElement;
  markingRegion: boolean;
  drag: boolean;
  // eslint-disable-next-line
  dragStart: any;
  // eslint-disable-next-line
  dragEnd: any;
  scale: number;

  chromosome: string;

  constructor(
    inputField,
    lineMargin,
    near,
    far,
    caseId,
    sampleName,
    genomeBuild,
    hgFileDir,
  ) {
    super({ caseId, sampleName, genomeBuild, hgFileDir });
    // The canvas input field to display and fetch chromosome range from
    this.inputField = inputField;
    // Plot variable
    this.titleMargin = 80; // Margin between plot and title
    this.legendMargin = 45; // Margin between legend and plot
    this.leftRightPadding = 2; // Padding for left and right in graph
    this.topBottomPadding = 8; // margin for top and bottom in graph
    this.plotWidth = Math.min(
      1500,
      0.9 * document.body.clientWidth - this.legendMargin,
    ); // Width of one plot
    this.extraWidth = this.plotWidth / 1.5; // Width for loading in extra edge data
    this.plotHeight = 180; // Height of one plot
    this.x = document.body.clientWidth / 2 - this.plotWidth / 2; // X-position for first plot
    this.y = 10 + 2 * lineMargin + this.titleMargin; // Y-position for first plot
    this.titleYPos = null;
    this.titleBbox = null;
    this.canvasHeight =
      2 + this.y + 2 * (this.leftRightPadding + this.plotHeight); // Height for whole canvas

    // setup objects for tracking the positions of draw and content canvases
    this.offscreenPosition = { start: null, end: null, scale: null };
    this.onscreenPosition = { start: null, end: null };

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: "#000000", // Viz color
    };

    // Log2 ratio values
    this.log2 = {
      yStart: 4.0, // Start value for y axis
      yEnd: -4.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: "#000000", // Viz color
    };

    // Setup draw canvas
    this.drawWidth = Math.max(
      this.plotWidth + 2 * this.extraWidth,
      document.body.clientWidth,
    ); // Draw-canvas width
    this.drawCanvas.width = 500;
    this.drawCanvas.height = 100;
    // this.drawCanvas.width = parseInt(this.drawWidth.toString());
    // this.drawCanvas.height = parseInt(this.canvasHeight.toString());

    // Setup visible canvases
    this.contentCanvas = document.getElementById(
      "interactive-content",
    ) as HTMLCanvasElement;
    this.staticCanvas = document.getElementById(
      "interactive-static",
    ) as HTMLCanvasElement;

    this.staticCanvas.width = 500;
    this.staticCanvas.height = 200;
    // this.staticCanvas.width = this.contentCanvas.width =
    //     document.body.clientWidth;
    // this.staticCanvas.height = this.contentCanvas.height =
    //     this.canvasHeight;
    // this.drawCanvas = this.contentCanvas

    // // Setup loading div dimensions
    // this.loadingDiv = document.getElementById("loading-div");
    // this.loadingDiv.style.width = `${this.plotWidth - 2.5}px`;
    // this.loadingDiv.style.left = `${this.x + 2}px`;
    // this.loadingDiv.style.top = `${this.y + 82}px`;
    // this.loadingDiv.style.height = `${this.plotHeight * 2 - 2.5}px`;

    // // Initialize marker div
    // this.markerElem = document.getElementById("interactive-marker");
    // this.markerElem.style.height = `${this.plotHeight * 2}px`;
    // this.markerElem.style.top = `${this.y + 131}px`;

    // State values
    this.allowDraw = true;

    // Listener values
    this.markingRegion = false;
    this.drag = false;
    this.dragStart = {};
    this.dragEnd = {};

    this.scale = this.calcScale();

    // Setup listeners
    // update chromosome title event
    this.contentCanvas.addEventListener(
      "update-title",
      // eslint-disable-next-line
      (event: any) => {
        const len = event.detail.bands.length;
        if (len > 0) {
          const bandIds =
            len === 1
              ? event.detail.bands[0].id
              : `${event.detail.bands[0].id}-${event.detail.bands[len - 1].id}`;
          this.drawCanvas
            .getContext("2d")
            .clearRect(
              this.titleBbox.x,
              this.titleBbox.y,
              this.titleBbox.width,
              this.titleBbox.height,
            );
          this.titleBbox = this.drawTitle(
            `Chromosome ${event.detail.chrom}; ${bandIds}`,
          );
          this.blitChromName({ textPosition: this.titleBbox });
        }
      },
    );
    // redraw events
    this.contentCanvas.parentElement.addEventListener(
      "draw",
      (event: CustomEvent<_RegionDetail>) => {
        this.drawInteractiveContent({
          ...event.detail.region,
          ...event.detail,
        });
      },
    );
    // navigation events
    this.contentCanvas.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      if (this.allowDraw && !this.drag) {
        if (keyLogger.heldKeys.Control) {
          zoomOut();
        } else {
          // Related to dragging
          // If region should be marked
          if (keyLogger.heldKeys.Shift) {
            this.markingRegion = true;
          }
          // Make sure scale factor is updated
          this.scale = this.calcScale();
          // store coordinates
          this.dragStart = {
            x: event.x,
            y: event.y,
          };
          this.dragEnd = {
            x: event.x,
            y: event.y,
          };
          this.drag = true;
        }
      }
    });

    // When in active dragging of the canvas
    this.contentCanvas.addEventListener("mousemove", (event) => {
      event.preventDefault();
      event.stopPropagation();
      // If region should be marked
      if (keyLogger.heldKeys.Shift && this.allowDraw) {
        this.markingRegion = true;
      }
      if (this.drag) {
        this.dragEnd = {
          x: event.x,
          y: event.y,
        };

        if (this.markingRegion) {
          this.markRegion({
            start: this.dragStart.x,
            end: this.dragEnd.x,
          });
        } else {
          // pan content canvas
          this.panContent(this.dragEnd.x - this.dragStart.x);
        }
      }
    });

    // When stop dragging
    this.contentCanvas.addEventListener("mouseup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      // reset marking region
      if (this.markingRegion) {
        this.markingRegion = false;
        this.resetRegionMarker();
        const scale = this.calcScale();
        const rawStart =
          this.onscreenPosition.start +
          Math.round((this.dragStart.x - this.x) / scale);
        const rawEnd =
          rawStart + Math.round((this.dragEnd.x - this.dragStart.x) / scale);
        // sort positions so lowest number is allways start
        const [start, end] = [rawStart, rawEnd].sort((a, b) => a - b);
        // if shift - click, zoom in a region 10
        if (end - start < 10) {
          zoomIn();
        } else {
          drawTrackDeprecated({
            chrom: this.chromosome,
            start: start,
            end: end,
            exclude: ["cytogenetic-ideogram"],
            force: true,
          });
        }
      } else if (this.drag) {
        // reload window when stop draging
        drawTrackDeprecated({
          ...readInputField(),
          force: true,
        });
      }
      // reset dragging behaviour
      this.markingRegion = false;
      this.drag = false;
    });
  }

  // Draw static content for interactive canvas
  async drawStaticContent() {
    const linePadding = 2;
    const staticContext = this.staticCanvas.getContext("2d");

    // Fill background colour
    staticContext.fillStyle = "#F7F9F9";
    staticContext.fillRect(
      0,
      0,
      this.staticCanvas.width,
      this.staticCanvas.height,
    );

    // Make content area visible
    // content window
    staticContext.clearRect(
      this.x + linePadding,
      this.y + linePadding,
      this.plotWidth,
      this.staticCanvas.height,
    );
    // area for ticks above content area
    staticContext.clearRect(
      0,
      0,
      this.staticCanvas.width,
      this.y + linePadding,
    );

    // Draw rotated y-axis legends
    drawRotatedText({
      ctx: staticContext,
      text: "B Allele Freq",
      textSize: 18,
      posx: this.x - this.legendMargin,
      posy: this.y + this.plotHeight / 2,
      rotDegrees: -Math.PI / 2,
      color: this.titleColor,
    });
    drawRotatedText({
      ctx: staticContext,
      text: "Log2 Ratio",
      textSize: 18,
      posx: this.x - this.legendMargin,
      posy: this.y + 1.5 * this.plotHeight,
      rotDegrees: -Math.PI / 2,
      color: this.titleColor,
    });

    // Draw BAF
    createGraph({
      ctx: staticContext,
      x: this.x,
      y: this.y,
      width: this.plotWidth,
      height: this.plotHeight,
      yMargin: this.topBottomPadding,
      yStart: this.baf.yStart,
      yEnd: this.baf.yEnd,
      step: this.baf.step,
      addTicks: true,
      color: this.borderColor,
    });

    // Draw Log 2 ratio
    createGraph({
      ctx: staticContext,
      x: this.x,
      y: this.y + this.plotHeight,
      width: this.plotWidth,
      height: this.plotHeight,
      yMargin: this.topBottomPadding,
      yStart: this.log2.yStart,
      yEnd: this.log2.yEnd,
      step: this.log2.step,
      addTicks: true,
      color: this.borderColor,
    });

    // Transfer image to visible canvas
    staticContext.drawImage(this.drawCanvas, 0, 0);
  }

  // Draw values for interactive canvas
  async drawInteractiveContent({
    chrom,
    start,
    end,
    displayLoading = true,
    drawTitle = true,
  }) {
    if (displayLoading) {
      this.loadingDiv.style.display = "block";
    } else {
      document.getElementsByTagName("body")[0].style.cursor = "wait";
    }

    console.time("getcoverage");
    get("get-coverage", {
      region: `${chrom}:${start}-${end}`,
      case_id: this.caseId,
      sample_id: this.sampleName,
      genome_build: this.genomeBuild,
      hg_filedir: this.hgFileDir,
      x_pos: this.extraWidth,
      y_pos: this.y,
      plot_height: this.plotHeight,
      extra_plot_width: this.extraWidth,
      top_bottom_padding: this.topBottomPadding,
      x_ampl: this.plotWidth,
      baf_y_start: this.baf.yStart,
      baf_y_end: this.baf.yEnd,
      log2_y_start: this.log2.yStart,
      log2_y_end: this.log2.yEnd,
      reduce_data: 1,
    })
      .then((result) => {
        console.timeEnd("getcoverage");
        if (result.status === "error") {
          throw new Error(result);
        }
        // store new start and end values
        this.offscreenPosition = {
          start: parseInt(result.padded_start),
          end: parseInt(result.padded_end),
          scale: 1,
        };
        this.offscreenPosition.scale =
          this.drawWidth /
          (this.offscreenPosition.end - this.offscreenPosition.start);
        this.chromosome = chrom;
        // clear draw and content canvas
        const ctx = this.drawCanvas.getContext("2d");
        ctx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);

        drawVerticalTicks({
          ctx,
          renderX: 0,
          y: this.y,
          xStart: start,
          xEnd: end,
          xoStart: this.offscreenPosition.start,
          xoEnd: this.offscreenPosition.end,
          width: this.plotWidth,
          yMargin: this.topBottomPadding,
          titleColor: this.titleColor,
        });

        // Draw horizontal lines for BAF and Log 2 ratio
        drawGraphLines({
          ctx,
          x: 0,
          y: result.y_pos,
          yStart: this.baf.yStart,
          yEnd: this.baf.yEnd,
          stepLength: this.baf.step,
          yMargin: this.topBottomPadding,
          width: this.drawWidth,
          height: this.plotHeight,
        });
        drawGraphLines({
          ctx,
          x: 0,
          y: result.y_pos + this.plotHeight,
          yStart: this.log2.yStart,
          yEnd: this.log2.yEnd,
          stepLength: this.log2.step,
          yMargin: this.topBottomPadding,
          width: this.drawWidth,
          height: this.plotHeight,
        });

        // Plot scatter data
        drawPoints({
          ctx,
          data: result.baf,
          color: this.baf.color,
        });
        drawPoints({
          ctx,
          data: result.data,
          color: this.log2.color,
        });

        // Transfer image to visible canvas
        this.blitInteractiveCanvas({ start, end });
        // Draw chromosome title on the content canvas as a blitting
        // work around
        this.titleYPos = result.y_pos - this.titleMargin;
        if (drawTitle) {
          if (this.titleBbox !== null) {
            this.blitChromName({
              textPosition: this.titleBbox,
              clearOnly: true,
            });
          }
          this.titleBbox = this.drawTitle(`Chromosome ${result.chrom}`);
          this.blitChromName({ textPosition: this.titleBbox });
        }

        return result;
      })
      .then((_result) => {
        if (displayLoading) {
          this.loadingDiv.style.display = "none";
        } else {
          document.getElementsByTagName("body")[0].style.cursor = "auto";
        }
        this.allowDraw = true;
      })
      .catch((error) => {
        this.allowDraw = true;

        this.inputField.dispatchEvent(
          new CustomEvent("error", { detail: { error: error } }),
        );
      });
  }

  drawTitle(title: string): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const ctx = this.drawCanvas.getContext("2d");
    return drawText({
      ctx,
      x: Math.round(document.body.clientWidth / 2),
      y: this.titleYPos,
      text: title,
      fontProp: "bold 15",
      align: "center",
    });
  }

  calcScale() {
    return (
      this.plotWidth / (this.onscreenPosition.end - this.onscreenPosition.start)
    );
  }

  // Function for highlighting region
  markRegion({ start, end }) {
    // Update the dom element
    this.markerElem.style.left = start < end ? `${start}px` : `${end}px`;
    this.markerElem.style.width = `${Math.abs(end - start) + 1}px`;
    this.markerElem.hidden = false;
  }

  resetRegionMarker() {
    this.markerElem.style.left = "0px";
    this.markerElem.style.width = "0px";
    this.markerElem.hidden = true;
  }

  blitChromName({ textPosition, clearOnly = false }) {
    const ctx = this.contentCanvas.getContext("2d");
    const padding = 20;
    //    clear area on contentCanvas
    ctx.clearRect(
      textPosition.x - padding / 2,
      textPosition.y,
      textPosition.width + padding,
      textPosition.height,
    );
    // transfer from draw canvas
    if (!clearOnly) {
      ctx.drawImage(
        this.drawCanvas, // source
        textPosition.x - padding / 2, // sX
        textPosition.y, // sY
        textPosition.width + padding, // sWidth
        textPosition.height, // sHeight
        textPosition.x - padding / 2, // dX
        textPosition.y, // dY
        textPosition.width + padding, // dWidth
        textPosition.height, // dHeight
      );
    }
  }

  blitInteractiveCanvas({ start, end, updateCoord = true }) {
    // blit areas from the drawCanvas to content canvas.
    // start, end are onscreen position
    const width = end - start;
    // store onscreen coords
    if (updateCoord) this.onscreenPosition = { start: start, end: end };

    const offscreenOffset = Math.round(
      (start - this.offscreenPosition.start) * this.offscreenPosition.scale,
    );
    const offscSegmentWidth = Math.round(width * this.offscreenPosition.scale);
    const onscSegmentWidth = width * this.calcScale();
    // clear current canvas
    const ctx = this.contentCanvas.getContext("2d");
    ctx.clearRect(
      0,
      this.titleMargin / 2 - 2,
      this.contentCanvas.width,
      this.contentCanvas.height,
    );
    // normalize the genomic coordinates to screen coordinates
    ctx.drawImage(
      this.drawCanvas, // source image
      offscreenOffset, // sX
      this.titleMargin / 2, // sY
      offscSegmentWidth, // sWidth
      this.drawCanvas.height, // sHeight
      this.x, // dX
      this.titleMargin / 2, // dY
      onscSegmentWidth, // dWidth
      this.contentCanvas.height, // dHeight
    );
  }

  // Move track x distance
  async panContent(distance) {
    // calculate the chromosome positions
    const scale = this.calcScale();
    const dist = distance / scale;
    const region = await limitRegionToChromosome({
      chrom: this.chromosome,
      start: this.onscreenPosition.start - dist,
      end: this.onscreenPosition.end - dist,
    });

    // Copy draw image to content Canvas
    this.blitInteractiveCanvas({
      start: region.start,
      end: region.end,
      updateCoord: false,
    });
    drawTrackDeprecated({
      ...region,
      exclude: [
        `${this.contentCanvas.parentElement.id}`,
        "cytogenetic-ideogram",
      ],
    });
  }
}
