import { drawRect } from "./render_utils";
import { STYLE } from "../constants";

export function drawChromosomeBands(
  ctx: CanvasRenderingContext2D,
  dim: Dimensions,
  bands: RenderBand[],
  xScale: Scale,
  chromShape: Path2D | null,
  yPad: number,
  lineWidth: number,
) {
  if (chromShape != null) {
    ctx.save();
    // Clip using previously calculated edge path
    ctx.clip(chromShape);
  }
  bands.map((band) => {
    const path = drawRect(
      ctx,
      xScale(band.start),
      0,
      xScale(band.end) - xScale(band.start),
      dim.height,
      lineWidth,
      band.color,
      band.color,
    );

    return {
      id: band.label,
      x: xScale(band.start),
      y: yPad,
      width: xScale(band.end - band.start),
      height: dim.height - yPad * 2,
      path,
    };
  });

  if (chromShape != null) {
    ctx.restore();
  }
}

/**
 * Calculate the outer contour for a chromosome
 * Used for clipping subsequent rendering
 */
export function getChromosomeShape(
  ctx: CanvasRenderingContext2D,
  yPad: number,
  dim: Dimensions,
  centromerePx: { start: number; end: number; center: number },
  color: string,
  lineColor: string = STYLE.colors.black,
  xScale: Scale,
  chromSize: number,
): Path2D {
  const style = STYLE.ideogramTrack;

  const bevelWidth = Math.round(dim.width * style.endBevelProportion);

  // Calculate dimensions of the centromere
  const centromereLength = centromerePx.end - centromerePx.start;
  const centromereIndent = Math.round(
    dim.height * style.centromereIndentProportion,
  );
  const centromereIndentRadius =
    centromereIndent * 2.5 < centromereLength / 3
      ? Math.round(centromereIndent * 2.5)
      : centromereLength / 3;

  const chromEndRadius = Math.round((dim.height * 0.7) / 2);
  const xStartPx = xScale(0);
  const xEndPx = xScale(chromSize);

  // Setup
  const path = new Path2D();
  path.moveTo(xStartPx + bevelWidth, yPad);

  // Centromere, top indent
  if (centromerePx) {
    path.lineTo(centromerePx.start, yPad);
    // Indent for centromere
    path.arcTo(
      centromerePx.center,
      yPad + centromereIndent,
      centromerePx.end,
      yPad,
      centromereIndentRadius,
    );
    path.lineTo(centromerePx.end, yPad);
  }
  // Line to end cap
  path.lineTo(xEndPx - bevelWidth, yPad);

  // Right end cap
  path.arcTo(xEndPx, yPad, xEndPx, yPad + dim.height / 2, chromEndRadius);
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

  // Left end cap
  path.arcTo(
    xStartPx,
    dim.height - yPad,
    xStartPx,
    dim.height / 2 - yPad,
    chromEndRadius,
  );
  path.arcTo(xStartPx, yPad, xStartPx + bevelWidth, yPad, chromEndRadius);

  // Finish figure
  path.closePath();
  ctx.strokeStyle = lineColor;
  ctx.stroke(path);
  if (color !== undefined) {
    ctx.fillStyle = color;
    ctx.fill(path);
  }
  return path;
}
