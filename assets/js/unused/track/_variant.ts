// Variant track definition

import { BaseAnnotationTrack } from "./_base";
import {
  isElementOverlapping,
  isWithinElementVisibleBbox,
} from "../../util/utils";
import { drawRect, drawWaveLine, drawText } from "../_draw";
import {
  initTrackTooltips,
  createTooltipElement,
  makeVirtualDOMElement,
  updateVisibleElementCoordinates,
} from "./_tooltip";
import { createPopper } from "@popperjs/core";
import { drawLine } from "../../draw/shapes";

// Draw variants
const VARIANT_TR_TABLE = {
  del: "deletion",
  dup: "duplication",
  cnv: "copy number variation",
  inv: "inversion",
  bnd: "break end",
};

export class VariantTrack extends BaseAnnotationTrack {
  scoutBaseURL: string;
  genomeBuild: number;
  apiEntrypoint: string;
  labelData: _VariantLabel[];
  highlightedVariantId: string;
  heightOrderRecord: {
    latestHeight: number;
    latestNameEnd: number;
    latestTrackEnd: number;
  };
  additionalQueryParams: {
    variant_category: string;
    case_id: string;
    sample_id: string;
  };

  constructor(
    x: number,
    width: number,
    near: number,
    far: number,
    sampleId: string,
    caseId: string,
    genomeBuild: number,
    colorSchema: _ColorSchema,
    scoutBaseURL: string,
    highlightedVariantId: string,
  ) {
    // Dimensions of track canvas
    const visibleHeight = 100; // Visible height for expanded canvas, overflows for scroll
    const minHeight = 35; // Minimized height

    super(width, near, far, visibleHeight, minHeight, colorSchema);

    // Set inherited variables
    this.drawCanvas = document.getElementById(
      "variant-draw",
    ) as HTMLCanvasElement;
    this.contentCanvas = document.getElementById(
      "variant-content",
    ) as HTMLCanvasElement;
    this.trackTitle = document.getElementById(
      "variant-titles",
    ) as HTMLDivElement;
    this.trackContainer = document.getElementById(
      "variant-track-container",
    ) as HTMLDivElement;

    // Add click menu event listener linking out to the Scout variant
    this.trackContainer.addEventListener(
      "click",
      async (event) => {
        for (const element of this.geneticElements) {
          const rect = this.contentCanvas.getBoundingClientRect();
          const point = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          if (isWithinElementVisibleBbox(element, point)) {
            const url = scoutBaseURL + "/document_id/" + element.id;
            const win = window.open(url, "_blank");
            win.focus();
          }
        }
      },
      false,
    );
    this.featureHeight = 18;
    // Setup html objects now that we have gotten the canvas and div elements
    this.setupHTML(x + 1);

    this.trackContainer.style.marginTop = "-1px";
    this.genomeBuild = genomeBuild;

    // GENS api parameters
    this.apiEntrypoint = "sample/variants";
    this.additionalQueryParams = {
      variant_category: "sv",
      sample_id: sampleId,
      case_id: caseId,
    };
    // Initialize highlighted variant
    this.highlightedVariantId = highlightedVariantId;
    initTrackTooltips(this);

    // Initialize label tracking
    this.labelData = [];
  }

  // Draw highlight for a given region
  drawHighlight(startPos, endPos, color = "rgb(255, 200, 87, 0.5)") {
    drawRect({
      ctx: this.drawCtx,
      x: startPos,
      y: 0,
      width: endPos - startPos + 1,
      height: this.visibleHeight,
      lineWidth: 0,
      fillColor: color,
      open: false,
    });
  }

  // @ts-expect-error: FIXME
  async drawOffScreenTrack({ startPos, endPos, maxHeightOrder, data }) {
    //  Draws variants in given range
    const textSize = 10;
    // store positions used when rendering the canvas
    this.offscreenPosition = {
      start: startPos,
      end: endPos,
      scale: this.drawCanvas.width / (endPos - startPos),
    };
    const scale = this.offscreenPosition.scale;

    // Set needed height of visible canvas and transcript tooltips
    this.setContainerHeight(maxHeightOrder);

    // Keeps track of previous values
    this.heightOrderRecord = {
      latestHeight: 0, // Latest height order for annotation
      latestNameEnd: 0, // Latest annotations end position
      latestTrackEnd: 0, // Latest annotations title's end position
    };

    // limit drawing of annotations to pre-defined resolutions
    let filteredVariants = [];
    if (this.getResolution < this.maxResolution + 1) {
      filteredVariants = data.variants.filter((variant) =>
        isElementOverlapping(
          { start: variant.position, end: variant.end },
          { start: startPos, end: endPos },
        ),
      );
    }
    filteredVariants.sort((a, b) => a.position - b.position);

    let heightTracker = Array(200);
    let actualMaxHeightOrder = 1;
    for (const variant of filteredVariants) {
      const variantCategory = variant.sub_category; // del, dup, sv, str
      if (["dup", "del", "cnv"].includes(variantCategory)) {
        let heightOrder = 1;
        while (heightTracker[heightOrder] >= variant.position) heightOrder += 1;
        heightTracker[heightOrder] = variant.end;
        actualMaxHeightOrder = Math.max(actualMaxHeightOrder, heightOrder);
      }
    }

    this.trackData.max_height_order = actualMaxHeightOrder;

    // dont show tracks with no data in them
    if (
      filteredVariants.length > 0 &&
      this.getResolution < this.maxResolution + 1
    ) {
      this.setContainerHeight(this.trackData.max_height_order);
    } else {
      this.setContainerHeight(0);
    }
    this.clearTracks();

    heightTracker = Array(200);

    const labelData = [];

    // Draw track
    const drawTooltips = this.getResolution < 4;
    for (const variant of filteredVariants) {
      const variantCategory = variant.sub_category; // del, dup, sv, str
      const variantType = variant.variant_type;
      const variantLength = variant.length;
      const color =
        this.colorSchema[variantCategory] ||
        this.colorSchema.default ||
        "black";

      let heightOrder = 1;
      if (["dup", "del", "cnv"].includes(variantCategory)) {
        while (heightTracker[heightOrder] >= variant.position) heightOrder += 1;
        heightTracker[heightOrder] = variant.end;
      }

      const canvasYPos = this.tracksYPos(heightOrder);

      // Only draw visible tracks
      if (!this.expanded && heightOrder !== 1) {
        continue;
      }

      // create variant object
      const featureHeight = variantCategory === "del" ? 7 : 8;
      // FIXME: This should really be a class
      const variantObj: _DisplayElement = {
        id: variant.document_id,
        name: variant.display_name,
        start: variant.position,
        end: variant.end,
        x1: Math.round(
          scale * (variant.position - this.offscreenPosition.start),
        ),
        x2: Math.round(scale * (variant.end - this.offscreenPosition.start)),
        y1: canvasYPos,
        y2: Math.round(canvasYPos + featureHeight),
        features: [],
        isDisplayed: false,
        tooltip: false,
      };
      // get onscreen positions for offscreen xy coordinates
      updateVisibleElementCoordinates({
        element: variantObj,
        screenPosition: this.onscreenPosition,
        scale: this.offscreenPosition.scale,
      });
      // create a tooltip html element and append to DOM
      if (drawTooltips && ["dup", "del", "cnv"].includes(variantCategory)) {
        const tooltip = createTooltipElement({
          id: `popover-${variantObj.id}`,
          title: `${variantType.toUpperCase()}: ${variant.category} - ${VARIANT_TR_TABLE[variantCategory]}`,
          information: [
            { title: "Type", value: variant.category },
            { title: variant.chromosome, value: `${variant.position}` },
            { title: "Ref", value: `${variant.reference}` },
            { title: "Alt", value: `${variant.alternative}` },
            {
              title: "Cytoband start/end",
              value: `${variant.cytoband_start}/${variant.cytoband_end}`,
            },
            { title: "Length", value: `${variant.length}` },
            { title: "Quality", value: `${variant.quality}` },
            { title: "Rank score", value: `${variant.rank_score}` },
          ],
        });
        this.trackContainer.appendChild(tooltip);
        // make a  virtual element as tooltip hitbox
        const virtualElement = makeVirtualDOMElement({
          x1: variantObj.visibleX1,
          x2: variantObj.visibleX2,
          y1: variantObj.visibleY1,
          y2: variantObj.visibleY2,
          canvas: this.contentCanvas,
        });
        // add tooltip to variantObj
        variantObj.tooltip = {
          instance: createPopper(virtualElement, tooltip, {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, virtualElement.getBoundingClientRect().height],
                },
              },
            ],
          }),
          virtualElement: virtualElement,
          tooltip: tooltip,
          isDisplayed: false,
        };
      }
      if (["dup", "del", "cnv"].includes(variantCategory)) {
        this.geneticElements.push(variantObj);
      }

      // Keep track of latest track
      if (this.heightOrderRecord.latestHeight !== heightOrder) {
        this.heightOrderRecord = {
          latestHeight: heightOrder,
          latestNameEnd: 0,
          latestTrackEnd: 0,
        };
      }
      // Draw motif line
      switch (variantCategory) {
        case "del":
          drawWaveLine({
            ctx: this.drawCtx,
            x: variantObj.x1,
            y: variantObj.y2,
            x2: variantObj.x2,
            height: featureHeight,
            color,
          });
          break;
        case "cnv":
        case "dup":
          drawLine(
            this.drawCtx,
            {
              x1: variantObj.x1,
              y1: variantObj.y1,
              x2: variantObj.x2,
              y2: variantObj.y1,
            },
            { color },
          );
          drawLine(
            this.drawCtx,
            {
              x1: variantObj.x1,
              y1: variantObj.y2,
              x2: variantObj.x2,
              y2: variantObj.y2,
            },
            { color },
          );
          break;
        case "bnd":
        case "inv":
          // no support for balanced events
          break;
        default: // other types of elements
          drawLine(
            this.drawCtx,
            {
              x1: variantObj.x1,
              y1: variantObj.y1,
              x2: variantObj.x2,
              y2: variantObj.y1,
            },
            { color },
          );
          console.error(
            `Unhandled variant type ${variantCategory}; drawing default shape`,
          );
      }
      // Move and display highlighted region
      if (variant._id === this.highlightedVariantId) {
        this.drawHighlight(variantObj.x1, variantObj.x2);
      }

      if (["dup", "del", "cnv"].includes(variantCategory)) {
        const textYPos = this.tracksYPos(heightOrder);
        // Draw variant type
        labelData.push({
          text: `${variant.category} - ${variantType} ${VARIANT_TR_TABLE[variantCategory]}; length: ${variantLength}`,
          start: variantObj.start,
          end: variantObj.end,
          x: (variantObj.start + variantObj.end) / 2,
          y: textYPos + this.featureHeight,
          fontProp: textSize,
        });
        /* drawText({
          ctx: this.drawCtx,
          text: `${variant.category} - ${variantType} ${VARIANT_TR_TABLE[variantCategory]}; length: ${variantLength}`,
          x: scale * ((variantObj.start + variantObj.end) / 2 - this.offscreenPosition.start),
          y: textYPos + this.featureHeight,
          fontProp: textSize
        }) */
      }
    }
    this.labelData = labelData;
  }

  drawDynamicOverlay() {
    const ctx = this.contentCanvas.getContext("2d");
    const scale =
      this.contentCanvas.width /
      (this.onscreenPosition.end - this.onscreenPosition.start);
    const margin = 100;
    this.labelData.forEach((label) => {
      if (
        label.start < this.onscreenPosition.end &&
        label.end > this.onscreenPosition.start
      ) {
        drawText({
          ctx: ctx,
          text: label.text,
          x: Math.max(
            margin,
            Math.min(
              this.contentCanvas.width - margin,
              scale * (label.x - this.onscreenPosition.start),
            ),
          ),
          y: label.y,
          fontProp: label.fontProp,
        });
      }
    });
  }
}
