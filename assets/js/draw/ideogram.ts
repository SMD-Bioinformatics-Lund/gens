import { drawRect } from "./render_utils";
import { STYLE } from "../constants";

/**
 * Render the actual chromosome
 */
export function drawChromosome(
  ctx: CanvasRenderingContext2D,
  dim: Dimensions,
  centromere: { start: number; end: number },
  color: string,
  bands: RenderBand[],
  xScale: Scale,
  chromShape: Path2D,
) {
  const shiftX = 0;
  const shiftY = 2;
  // const xPadding = 50;
  const yPadding = 5;
  // dim = {
  //     width: dim.width - xPadding,
  //     height: dim.height - yPadding,
  // };
  // const chromPath = {
  //     path: drawChromosomeShape(ctx, shiftX, shiftY, dim, centromere, color),
  // };

  const lineWidth = 1;

  ctx.save();
  ctx.clip(chromShape);
  bands
    .map((band) => {
      const path = drawRect(
        ctx,
        band.start,
        0,
        band.end - band.start,
        dim.height,
        lineWidth,
        band.color,
        band.color,
      );

      const newX = shiftX + band.start;
      const newY = shiftY - yPadding;
      const newWidth = band.end - band.start;
      const newHeight = dim.height + yPadding;
      return {
        id: band.label,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        path,
      };
    })
    .filter((band) => {
      if (band.path === null) {
        console.error("Is this ever triggered? A band without a path");
      }
      return band.path !== null;
    });
  ctx.restore();
}

export function getChromosomeShape(
  ctx: CanvasRenderingContext2D,
  pad: { x: number; y: number },
  dim: Dimensions,
  centromerePx: { start: number; end: number; center: number },
  color: string,
  lineColor: string = STYLE.colors.black,
  xScale: Scale,
  chromSize: number,
): Path2D {
  console.log("Getting the shape");

  const { x: xPad, y: yPad } = pad;

  const style = STYLE.ideogramTrack;

  // compute basic measurement
  const bevelWidth = Math.round(dim.width * style.endBevelProportion);

  // calcuate dimensions of the centromere
  const centromereLength = centromerePx.end - centromerePx.start;
  const centromereIndent = Math.round(
    dim.height * style.centromereIndentProportion,
  );
  const centromereIndentRadius =
    centromereIndent * 2.5 < centromereLength / 3
      ? Math.round(centromereIndent * 2.5)
      : centromereLength / 3;

  // const centPx = centromere ? {
  //     start: xScale(centromere.start),
  //     end: xScale(centromere.end),
  //     center: xScale((centromere.start + centromere.end) / 2),
  // } : null;

  // const centromereCenter =
  //     centromere.start + Math.round((centromere.end - centromere.start) / 2);

  const chromEndRadius = Math.round((dim.height * 0.7) / 2);

  const xStartPx = xScale(0);
  const xEndPx = xScale(chromSize);

  console.log("xStartPx", xStartPx);
  console.log("xEndPx", xEndPx);
  console.log("bevelWidth", bevelWidth);

  // path object
  const path = new Path2D();
  // draw shape

  path.moveTo(xStartPx + bevelWidth, yPad); // move to start

  // Centromere, top indent
  if (centromerePx) {
    console.log("Making the top indent");
    path.lineTo(centromerePx.start, yPad);
    // path.lineTo(centromere.start, yPad);
    // indent for centromere
    path.arcTo(
      centromerePx.center,
      yPad + centromereIndent,
      centromerePx.end,
      yPad,
      centromereIndentRadius,
    );
    path.lineTo(centromerePx.end, yPad);
  }
  path.lineTo(xEndPx - bevelWidth, yPad); // line to end cap
  // path.lineTo(xPad + dim.width - bevelWidth + 0.5, yPad + 0.5); // line to end cap

  // Right end cap
  path.arcTo(
    xEndPx,
    yPad,
    xEndPx,
    yPad + dim.height / 2,
    chromEndRadius,
  );
  path.arcTo(
    xEndPx,
    dim.height - yPad,
    xEndPx - bevelWidth,
    dim.height - yPad,
    chromEndRadius,
  );

  // Bottom line
  if (centromerePx) {
    path.lineTo(centromerePx.end, dim.height - yPad);
    path.arcTo(
      centromerePx.center,
      dim.height - centromereIndent - yPad,
      centromerePx.start,
      dim.height - yPad,
      centromereIndentRadius,
    );
    path.lineTo(centromerePx.start, dim.height - yPad);
  }
  path.lineTo(xStartPx + bevelWidth, dim.height - yPad);

  // left end cap
  path.arcTo(
    xStartPx,
    dim.height - yPad,
    xStartPx,
    dim.height / 2 - yPad,
    chromEndRadius,
  );
  path.arcTo(xStartPx, yPad, xStartPx + bevelWidth, yPad, chromEndRadius);

  // finish figure
  path.closePath();
  // setup coloring
  ctx.strokeStyle = lineColor;
  ctx.stroke(path);
  if (color !== undefined) {
    ctx.fillStyle = color;
    ctx.fill(path);
  }
  return path;
}
