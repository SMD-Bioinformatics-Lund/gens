// draw basic objects and shapes

import { STYLE } from "../constants";

export function drawHorizontalLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  yScale: Scale,
  color: string,
  dashed: boolean = false,
) {
  const start = { x: 0, y };
  const end = { x: ctx.canvas.width, y };
  const lineWidth = STYLE.tracks.gridLineWidth;
  drawLineScaled(ctx, start, end, null, yScale, color, lineWidth, dashed);
}

export function drawVerticalLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  xScale: Scale,
  color: string,
  dashed: boolean = false,
) {
  const start = { x, y: 0 };
  const end = { x, y: ctx.canvas.height };
  const lineWidth = STYLE.tracks.gridLineWidth;
  drawLineScaled(ctx, start, end, xScale, null, color, lineWidth, dashed);
}

export function drawLineScaled(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  xScale: Scale,
  yScale: Scale,
  color: string = "black",
  lineWidth: number = 1,
  dashed: boolean = false,
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
  const x1 = Math.floor(scaledStart.x) + 0.5;
  const x2 = Math.floor(scaledEnd.x) + 0.5;
  const y1 = Math.floor(scaledStart.y) + 0.5;
  const y2 = Math.floor(scaledEnd.y) + 0.5;

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

// Draws a line between point (x, y) and (x2, y2)
export function drawLine({
  ctx,
  x,
  y,
  x2,
  y2,
  lineWidth = 1,
  color = "black",
}: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  x2: number;
  y2: number;
  lineWidth?: number;
  color?: string;
}) {
  // transpose coordinates .5 px to become sharper
  x = Math.floor(x) + 0.5;
  x2 = Math.floor(x2) + 0.5;
  y = Math.floor(y) + 0.5;
  y2 = Math.floor(y2) + 0.5;
  // draw path
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// Draw an arrow in desired direction
// Forward arrow: direction = 1
// Reverse arrow: direction = -1
export async function drawArrow({
  ctx,
  x,
  y,
  dir,
  height,
  lineWidth = 2,
  color = "black",
}: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  dir: number;
  height: number;
  lineWidth?: number;
  color?: string;
}) {
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


