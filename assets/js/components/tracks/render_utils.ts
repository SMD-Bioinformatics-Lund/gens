import { rangeSize } from "../../track/utils";
import { STYLE } from "../../util/constants";

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  canvasDim: { height: number; width: number },
  color: string,
) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasDim.width, canvasDim.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvasDim.width, canvasDim.height);
}

export function renderBands(
  ctx: CanvasRenderingContext2D,
  annots: RenderBand[],
  xScale: Scale,
) {
  annots.forEach((band) => {
    ctx.fillStyle = band.color;
    const xPxStart = xScale(band.start);
    const xPxEnd = xScale(band.end);
    ctx.fillStyle = band.color;
    const width = xPxEnd - xPxStart;
    const height = band.y2 - band.y1;
    ctx.fillRect(xPxStart, band.y1, width, height);
    ctx.strokeStyle = band.edgeColor || "black";
    ctx.lineWidth = band.edgeWidth || 1;
    ctx.strokeRect(xPxStart, band.y1, width, height);
  });
}

export function scaleToPixels(
  dataPos: number,
  dataSize: number,
  viewSize: number,
) {
  const scaleFactor = viewSize / dataSize;
  const pixelPos = dataPos * scaleFactor;
  return pixelPos;
}

export function getPixelPosInRange(
  pos: number,
  range: [number, number],
  viewSize: number,
): number {
  const viewPos = pos - range[0];
  const scaleFactor = viewSize / (range[1] - range[0]);
  const pixelPos = viewPos * scaleFactor;
  return pixelPos;
}

// FIXME: Think through this
// In particular the getPixelPosInRange
// Does it make sense?
export function renderDots(
  ctx: CanvasRenderingContext2D,
  dots: RenderDot[],
  xRange: [number, number],
  yRange: [number, number],
  canvasDim: { width: number; height: number },
  dotSize: number = 4,
) {
  dots.forEach((dot) => {
    ctx.fillStyle = dot.color;
    const xPixel = getPixelPosInRange(dot.x, xRange, canvasDim.width);
    const yPixel = getPixelPosInRange(dot.y, yRange, canvasDim.height);
    ctx.fillRect(xPixel - dotSize / 2, yPixel - dotSize / 2, dotSize, dotSize);
  });
}

export function newDrawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number,
  color: string = null,
  fillColor: string = null,
  open: boolean = false,
) {
  x = Math.floor(x) + 0.5;
  y = Math.floor(y) + 0.5;
  width = Math.floor(width);

  if (color !== null) ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // define path to draw
  const path = new Path2D();

  // Draw box without left part, to allow stacking boxes
  // horizontally without getting double lines between them.
  if (open === true) {
    path.moveTo(x, y);
    path.lineTo(x + width, y);
    path.lineTo(x + width, y + height);
    path.lineTo(x, y + height);
    // Draw normal 4-sided box
  } else {
    path.rect(x, y, width, height);
  }
  ctx.stroke(path);
  if (fillColor !== null) {
    ctx.fillStyle = fillColor;
    ctx.fill(path);
  }
  return path;
}

export function linearScale(pos: number, dataRange: Rng, pxRange: Rng): number {
  const scaleFactor = rangeSize(pxRange) / rangeSize(dataRange);
  // We want non-zero data (-4, +3) to start from zero-coordinate
  const zeroBasedPos = pos - dataRange[0];
  const pxPos = zeroBasedPos * scaleFactor + pxRange[0];
  return pxPos;
}

export function drawDotsScaled(
  ctx: CanvasRenderingContext2D,
  dots: RenderDot[],
  xScale: Scale,
  yScale: Scale,
  dotSize: number = 2,
) {
  dots.forEach((dot) => {
    ctx.fillStyle = dot.color;
    const xPixel = xScale(dot.x);
    const yPixel = yScale(dot.y);

    ctx.fillRect(xPixel - dotSize / 2, yPixel - dotSize / 2, dotSize, dotSize);
  });
}

export function rgbArrayToString(rgbArray: number[]): string {
  return `rgb(${rgbArray[0]},${rgbArray[1]},${rgbArray[2]})`;
}

export function parseAnnotations(annotations: APIAnnotation[]): RenderBand[] {
  const results = annotations.map((annot) => {
    // const rankScore = annot.score ? `, Rankscore: ${annot.score}` : "";
    const label = annot.name;
    const colorStr = rgbArrayToString(annot.color);
    return {
      id: `${annot.start}_${annot.end}_${colorStr}`,
      start: annot.start,
      end: annot.end,
      color: colorStr,
      label,
      hoverInfo: `${annot.name} (${annot.start}-${annot.end})`,
    };
  });
  return results;
}

// FIXME: Should this one be here?
function parseExons(
  geneId: string,
  transcriptParts: APITranscriptPart[],
): RenderBand[] {
  const exons = transcriptParts.filter((part) => part.feature == "exon");

  return exons.map((part) => {
    const renderBand = {
      id: `${geneId}_exon${part.exon_number}_${part.start}_${part.end}`,
      start: part.start,
      end: part.end,
      color: STYLE.colors.teal,
      label: `${part.exon_number} ${part.start}-${part.end}`,
    };
    return renderBand;
  });
}

// FIXME: Should this one be here?
export function parseTranscripts(transcripts: APITranscript[]): RenderBand[] {
  const transcriptsToRender: RenderBand[] = transcripts.map((transcript) => {
    const exons = parseExons(transcript.transcript_id, transcript.features);
    const renderBand: RenderBand = {
      id: transcript.transcript_id,
      start: transcript.start,
      end: transcript.end,
      label: transcript.hgnc_id,
      color: STYLE.colors.lightGray,
      hoverInfo: `${transcript.gene_name} (${transcript.transcript_id}) (${transcript.mane})`,
      direction: transcript.strand as "+" | "-",
      subBands: exons,
    };
    return renderBand;
  });

  // FIXME: This should be done on the backend
  const seenIds = new Set();
  const filteredDuplicates = transcriptsToRender.filter((tr) => {
    if (seenIds.has(tr.id)) {
      return false;
    } else {
      seenIds.add(tr.id);
      return true;
    }
  });

  return filteredDuplicates;
}

export function parseVariants(
  variants: APIVariant[],
  variantColorMap: VariantColors,
): RenderBand[] {
  return variants.map((variant) => {
    const id = `${variant.position}_${variant.end}_${variant.variant_type}_${variant.sub_category}`;
    return {
      id,
      start: variant.position,
      end: variant.end,
      hoverInfo: `${variant.variant_type} ${variant.sub_category}; length ${variant.length} (${id})`,
      color:
        variantColorMap[variant.sub_category] != undefined
          ? variantColorMap[variant.sub_category]
          : variantColorMap.default,
    };
  });
}

export function parseCoverageBin(
  coverage: APICoverageBin[],
  color: string,
): RenderDot[] {
  const renderData = coverage.map((d) => {
    return {
      x: (d.start + d.end) / 2,
      y: d.value,
      color,
    };
  });

  return renderData;
}

export function parseCoverageDot(
  coverage: APICoverageDot[],
  color: string,
): RenderDot[] {
  const renderData = coverage.map((d) => {
    return {
      x: d.pos,
      y: d.value,
      color,
    };
  });

  return renderData;
}

export function getLinearScale(domain: Rng, range: Rng): Scale {
  const scale = (pos: number) => {
    return linearScale(pos, domain, range);
  };
  return scale;
}

export function getColorScale(
  levels: string[],
  colorPool: string[],
  defaultColor: string,
): ColorScale {
  const colorScale = (level: string) => {
    const levelIndex = levels.indexOf(level);
    if (levelIndex == -1) {
      return defaultColor;
    } else if (levelIndex >= colorPool.length) {
      return defaultColor;
    } else {
      return colorPool[levelIndex];
    }
  };
  return colorScale;
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  bandHeight: number,
  y1: number,
  isForward: boolean,
  xPxRange: Rng,
) {
  const [xPxStart, xPxEnd] = xPxRange;
  const arrowHeight = bandHeight;
  const arrowWidth = arrowHeight * 0.5;
  const arrowYCenter = y1 + bandHeight / 2;
  ctx.fillStyle = STYLE.colors.darkGray;
  ctx.beginPath();
  if (isForward) {
    ctx.moveTo(xPxEnd + arrowWidth, arrowYCenter);
    ctx.lineTo(xPxEnd, arrowYCenter - arrowHeight / 2);
    ctx.lineTo(xPxEnd, arrowYCenter + arrowHeight / 2);
  } else {
    ctx.moveTo(xPxStart - arrowWidth, arrowYCenter);
    ctx.lineTo(xPxStart, arrowYCenter - arrowHeight / 2);
    ctx.lineTo(xPxStart, arrowYCenter + arrowHeight / 2);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  leftX: number,
  topY: number,
  style: {
    withFrame?: boolean;
    textBaseline?: "top" | "middle" | "bottom";
    textAlign?: "left" | "right" | "center";
    padding?: number;
    font?: string;
    textColor?: string;
    boxStyle?: BoxStyle;
  } = {},
) {
  const {
    withFrame = true,
    textBaseline = "top",
    padding = STYLE.tracks.textFramePadding,
    font = STYLE.tracks.font,
    textColor = STYLE.tracks.textColor,
    textAlign = "left",
    boxStyle = undefined
  } = style;

  ctx.font = font;

  const metrics = ctx.measureText(label);
  const textWidth = metrics.width;
  const textHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  if (withFrame) {
    const x1 = leftX - padding;
    const frameWidth = textWidth + 2 * padding;
    const y1 = topY - padding;
    const frameHeight = textHeight + 2 * padding;

    const box = {
      x1,
      x2: x1 + frameWidth,
      y1,
      y2: y1 + frameHeight,
    };

    drawBox(ctx, box, boxStyle);
  }

  ctx.fillStyle = textColor;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.fillText(label, leftX, topY);
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  box: Box,
  style: BoxStyle = {},
) {
  const {
    fillColor: fill = STYLE.tracks.backgroundColor,
    borderColor: border = STYLE.tracks.textFrameColor,
    borderWidth = STYLE.tracks.gridLineWidth,
  } = style;

  ctx.fillStyle = fill;
  ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);

  ctx.strokeStyle = border;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
}

export function drawLabelBelow(
  ctx: CanvasRenderingContext2D,
  label: string,
  centerX: number,
  bottomY: number,
) {
  const textX = centerX;
  const textY = bottomY + STYLE.tracks.textPadding;

  ctx.font = STYLE.tracks.font;
  ctx.fillStyle = STYLE.tracks.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillText(label, textX, textY);
}
