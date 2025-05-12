import { COLORS, STYLE } from "../../../constants";
import { GensMarker } from "../../../movements/marker";
import {
  generateID,
  scaleRange,
  sortRange,
} from "../../../util/utils";
import { keyLogger } from "../../util/keylogger";

export function initializeDragSelect(
  element: HTMLElement,
  onDragRelease: (rangeX: Rng, rangeY: Rng, shiftPress: boolean) => void,
  onMarkerRemove: (id: string) => void,
  getMarkerMode: () => boolean,
) {
  let isDragging = false;
  let isMoved = false;
  let dragStart: { x: number; y: number };
  let marker: GensMarker | null = null;

  element.addEventListener("mousedown", (event) => {
    isDragging = true;
    isMoved = false;

    dragStart = { x: event.offsetX, y: event.offsetY };

    // FIXME: Deal with the yAxis width in a more robust way
    if (event.offsetX < STYLE.yAxis.width) {
      return;
    }

    if (getMarkerMode() || keyLogger.heldKeys.Shift) {
      const color = keyLogger.heldKeys.Shift
        ? COLORS.transparentYellow
        : COLORS.transparentBlue;
      marker = document.createElement("gens-marker") as GensMarker;
      element.appendChild(marker);
      const id = generateID();
      marker.initialize(
        id,
        element.offsetHeight,
        color,
        getMarkerMode() ? onMarkerRemove : null,
      );
    } else {
      // FIXME: Drag to pan here
    }
  });

  element.addEventListener("mousemove", (event) => {
    if (!isDragging || !marker) {
      return;
    }

    isMoved = true;
    let currX = event.offsetX;

    if (currX < STYLE.yAxis.width) {
      currX = STYLE.yAxis.width;
    }

    const xRange = sortRange([dragStart.x, currX]);

    marker.render(xRange);
  });

  document.addEventListener("mouseup", (event) => {
    if (isDragging && isMoved) {
      // FIXME: How to avoid the hard-coding here?
      const sortedX = sortRange([
        Math.max(dragStart.x, STYLE.yAxis.width),
        Math.max(event.offsetX, STYLE.yAxis.width),
      ]);

      onDragRelease(
        sortedX,
        sortRange([dragStart.y, event.y]),
        keyLogger.heldKeys.Shift,
      );
    }
    if (marker) {
      marker.remove();
      marker = null;
    }
    isDragging = false;
    isMoved = false;
  });
}

export function renderHighlights(
  container: HTMLDivElement,
  highlights: { id: string; range: Rng; color: string }[],
  xScale: Scale,
  renderLimitsPx: Rng,
  onMarkerRemove: (markerId: string) => void,
) {
  const markerClass = "highlight-marker";

  container
    .querySelectorAll(`.${markerClass}`)
    .forEach((old: Element) => old.remove());

  for (const { id, range, color } of highlights) {

    let [minXPx, maxXPx] = scaleRange(range, xScale);

    // Only render those inside the rendering area
    if (maxXPx < renderLimitsPx[0]) {
      continue;
    }

    const marker = document.createElement("gens-marker") as GensMarker;
    container.appendChild(marker);
    marker.initialize(id, container.offsetHeight, color, onMarkerRemove);

    marker.classList.add(markerClass);
    container.appendChild(marker);

    // Truncate those partially landing outside the rendering area
    // This prevents glitches such as highlights over the y-axis area
    if (minXPx < renderLimitsPx[0]) {
      minXPx = renderLimitsPx[0];
    }
    if (maxXPx > renderLimitsPx[1]) {
      maxXPx = renderLimitsPx[1];
    }

    marker.render([minXPx, maxXPx]);
  }
}
