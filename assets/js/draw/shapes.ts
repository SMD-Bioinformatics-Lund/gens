// draw basic objects and shapes

import { COLORS, STYLE } from "../constants";

export function drawHorizontalLineInScale(
  ctx: CanvasRenderingContext2D,
  y: number,
  yScale: Scale,
  lineStyle: LineStyle = {},
) {
  const start = { x: 0, y };
  const end = { x: ctx.canvas.width, y };
  drawLineInScale(ctx, start, end, null, yScale, lineStyle);
}

export function drawVerticalLineInScale(
  ctx: CanvasRenderingContext2D,
  x: number,
  xScale: Scale,
  lineStyle: LineStyle = {},
) {
  const start = { x, y: 0 };
  const end = { x, y: ctx.canvas.height };
  drawLineInScale(ctx, start, end, xScale, null, lineStyle);
}

export function drawLineInScale(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  xScale: Scale,
  yScale: Scale,
  lineStyle: LineStyle = {},
) {
  const scaledStart = {
    x: xScale ? xScale(start.x) : start.x,
    y: yScale ? yScale(start.y) : start.y,
  };

  const scaledEnd = {
    x: xScale ? xScale(end.x) : end.x,
    y: yScale ? yScale(end.y) : end.y,
  };

  // transpose coordinates .5 px to become sharper
  const line = {
    x1: scaledStart.x,
    x2: scaledEnd.x,
    y1: scaledStart.y,
    y2: scaledEnd.y,
  };

  drawLine(ctx, line, lineStyle);
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  coords: Box,
  style: LineStyle = {},
) {
  const {
    lineWidth = 1,
    color = COLORS.black,
    dashed = false,
    transpose_05 = true,
  } = style;

  let renderCoords: Box;
  if (transpose_05) {
    // transpose coordinates .5 px to become sharper
    renderCoords = {
      x1: Math.floor(coords.x1) + 0.5,
      x2: Math.floor(coords.x2) + 0.5,
      y1: Math.floor(coords.y1) + 0.5,
      y2: Math.floor(coords.y2) + 0.5,
    };
  } else {
    renderCoords = Object.create(coords);
  }

  const { x1, y1, x2, y2 } = renderCoords;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (dashed) {
    ctx.setLineDash([STYLE.tracks.dashLength, STYLE.tracks.dashGap]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export async function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  height: number,
  style: LineStyle = {},
) {
  const { lineWidth = 2, color = "black" } = style;

  const width = dir * lineWidth;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y - height / 2);
  ctx.lineTo(x + width / 2, y);
  ctx.moveTo(x + width / 2, y);
  ctx.lineTo(x - width / 2, y + height / 2);
  ctx.stroke();
  ctx.restore();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  leftX: number,
  topY: number,
  style: LabelStyle = {},
): Box {
  const {
    textBaseline = "top",
    padding = STYLE.tracks.textFramePadding,
    font = STYLE.tracks.font,
    textColor = STYLE.tracks.textColor,
    textAlign = "left",
    boxStyle = undefined,
    rotation = 0,
    pivotX,
    pivotY,
  } = style;

  ctx.font = font;

  const metrics = ctx.measureText(label);
  const textWidth: number = metrics.width;
  const textHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  const x1 = leftX - padding;
  const frameWidth = textWidth + 2 * padding;
  const y1 = topY - padding;
  const frameHeight = textHeight + 2 * padding;
  const box: Box = {
    x1,
    x2: x1 + frameWidth,
    y1,
    y2: y1 + frameHeight,
  };

  if (rotation !== 0) {
    const cx = pivotX ?? leftX + frameWidth / 2;
    const cy = pivotY ?? topY + frameHeight / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  if (boxStyle != undefined) {
    drawBox(ctx, box, boxStyle);
  }

  ctx.fillStyle = textColor;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.fillText(label, leftX, topY);

  if (rotation !== 0) {
    ctx.restore();
  }

  return box;
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  box: Box,
  style: BoxStyle = {},
) {
  const {
    fillColor = STYLE.tracks.backgroundColor,
    borderColor = STYLE.tracks.textFrameColor,
    borderWidth = STYLE.tracks.gridLineWidth,
    alpha = 1,
  } = style;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = fillColor;
  ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);

  ctx.restore();
}
