// draw basic objects and shapes

import { STYLE } from "../constants";

export function drawHorizontalLineInScale(
  ctx: CanvasRenderingContext2D,
  y: number,
  yScale: Scale,
  lineStyle: LineStyle = {},
) {
  const start = { x: 0, y };
  const end = { x: ctx.canvas.width, y };
  const lineWidth = STYLE.tracks.gridLineWidth;
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
  const lineWidth = STYLE.tracks.gridLineWidth;
  drawLineInScale(ctx, start, end, xScale, null, lineStyle);
}

export function drawLineInScale(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  xScale: Scale,
  yScale: Scale,
  lineStyle: LineStyle = {}
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
    x1: Math.floor(scaledStart.x) + 0.5,
    x2: Math.floor(scaledEnd.x) + 0.5,
    y1: Math.floor(scaledStart.y) + 0.5,
    y2: Math.floor(scaledEnd.y) + 0.5,
  };

  drawLine(ctx, line, lineStyle);

  // ctx.save();
  // ctx.strokeStyle = color;
  // ctx.lineWidth = lineWidth;
  // if (dashed) {
  //   ctx.setLineDash([STYLE.tracks.dashLength, STYLE.tracks.dashGap]);
  // } else {
  //   ctx.setLineDash([]);
  // }

  // ctx.beginPath();
  // ctx.moveTo(x1, y1);
  // ctx.lineTo(x2, y2);
  // ctx.stroke();
  // ctx.restore();
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  coords: Box,
  style: LineStyle = {},
) {
  const {
    lineWidth = 1,
    color = "black",
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
) {
  const {
    withFrame = true,
    textBaseline = "top",
    padding = STYLE.tracks.textFramePadding,
    font = STYLE.tracks.font,
    textColor = STYLE.tracks.textColor,
    textAlign = "left",
    boxStyle = undefined,
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
