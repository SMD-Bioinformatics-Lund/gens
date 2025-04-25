// graph related objects
import { FONT_SIZE } from "../constants";
import { drawLine } from "../draw/shapes";
import { drawRect, drawRotatedText, drawText } from "./_shapes";

// Draws vertical tick marks for selected values between
// xStart and xEnd with step length.
// The amplitude scales the values to drawing size
export function drawVerticalTicks({
  ctx,
  renderX,
  y,
  xStart,
  xEnd,
  xoStart,
  xoEnd,
  width,
  yMargin,
  titleColor,
}: {
  ctx: CanvasRenderingContext2D;
  renderX: number;
  y: number;
  xStart: number;
  xEnd: number;
  xoStart: number;
  xoEnd: number;
  width: number;
  yMargin: number;
  titleColor: string;
}) {
  const lineThickness = 1;
  const lineWidth = 5;
  const regionSize = xEnd - xStart;
  const scale = width / regionSize;
  const maxNumTicks = 30;

  // Create a step size which is an even power of ten (10, 100, 1000 etc)
  let stepLength = 10 ** Math.floor(Math.log10(regionSize) - 1);

  // Change to "half-steps" (50, 500, 5000) if too many ticks
  if (regionSize / stepLength > maxNumTicks) {
    stepLength *= 5;
  }

  // Get  starting position for the first tick
  const xFirstTick = Math.ceil(xoStart / stepLength) * stepLength;

  // Draw the ticks
  for (let step = xFirstTick; step <= xoEnd; step += stepLength) {
    const xStep = Math.round(scale * (step - xoStart));
    const value = numberWithCommas(step.toFixed(0));

    // Draw text and ticks only for the leftmost box
    drawRotatedText({
      ctx,
      text: value,
      textSize: FONT_SIZE.small,
      posx: renderX + xStep + 8,
      posy: y - value.length - 3 * yMargin,
      rotDegrees: -Math.PI / 4,
      color: titleColor,
    });

    // Draw tick line
    drawLine(
      ctx,
      {x1: renderX + xStep,
      y1: y - lineWidth,
      x2: renderX + xStep,
      y2: y},
      {lineWidth: lineThickness,
      color: "#777"},
    );
  }
}

// Draws horizontal lines for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
export function drawGraphLines({
  ctx,
  x,
  y,
  yStart,
  yEnd,
  stepLength,
  yMargin,
  width,
  height,
}: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  yStart: number;
  yEnd: number;
  stepLength: number;
  yMargin: number;
  width: number;
  height: number;
}) {
  const ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  const lineThickness = 1;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    // Draw horizontal line
    const yPos = y + yMargin + (yStart - step) * ampl;
    drawLine(
      ctx,
      {x1: x,
      y1: yPos,
      x2: x + width - 2 * lineThickness,
      y2: yPos},
      {color: "black"},
    );
  }
}

// Creates a graph for one chromosome data type
export function createGraph({
  ctx,
  x,
  y,
  width,
  height,
  yMargin,
  yStart,
  yEnd,
  step,
  addTicks,
  color = "black",
  open = false,
}: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  yMargin: number;
  yStart: number;
  yEnd: number;
  step: number;
  addTicks: boolean;
  color?: string;
  open?: boolean;
}) {
  // Draw tick marks
  if (addTicks) {
    drawTicks(
      ctx,
      x,
      y + yMargin,
      yStart,
      yEnd,
      step,
      yMargin,
      width,
      height,
      color,
    );
  }

  // Draw surrounding coordinate box
  drawRect({ ctx, x, y, width, height, lineWidth: 1, color, open });
}

// Draws tick marks for selected values between
// yStart and yEnd with step length.
// The amplitude scales the values to drawing size
function drawTicks(
  ctx,
  x: number,
  y: number,
  yStart,
  yEnd,
  stepLength,
  yMargin,
  width,
  height,
  color = "black",
) {
  const ampl = (height - 2 * yMargin) / (yStart - yEnd); // Amplitude for scaling y-axis to fill whole height
  const lineThickness = 2;
  const lineWidth = 4;

  for (let step = yStart; step >= yEnd; step -= stepLength) {
    drawText({
      ctx,
      x: x - lineWidth,
      y: y + (yStart - step) * ampl + 2.2,
      text: step.toFixed(1),
      align: "right",
    });

    drawLine(
      ctx,
      {
        x1: x - lineWidth,
        y1: y + (yStart - step) * ampl,
        x2: x,
        y2: y + (yStart - step) * ampl,
      },
      { lineWidth: lineThickness, color },
    );
  }
}

// Makes large numbers more readable with commas
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
