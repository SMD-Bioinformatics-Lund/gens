import { COLORS } from "../../../constants";
import {
  generateID,
  rangeSize,
  scaleRange,
  sortRange,
} from "../../../util/utils";
import { keyLogger } from "../../util/keylogger";
import { GensMarker } from "../../util/marker";

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

    const rect = element.getBoundingClientRect();

    dragStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (getMarkerMode() || keyLogger.heldKeys.Shift) {
      const color = keyLogger.heldKeys.Shift
        ? COLORS.transparentYellow
        : COLORS.transparentBlue;
      marker = document.createElement("gens-marker") as GensMarker;
      element.appendChild(marker);
      // element.parentElement.appendChild(marker);
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
    const rect = element.getBoundingClientRect();
    const currX = event.clientX - rect.left;
    const xRange = sortRange([dragStart.x, currX]);
    marker.render(xRange);
  });

  document.addEventListener("mouseup", (event) => {
    if (isDragging && isMoved) {
      onDragRelease(
        sortRange([dragStart.x, event.x]),
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
  height: number,
  highlights: { id: string; range: Rng }[],
  xScale: Scale,
  onMarkerRemove: (markerId: string) => void,
) {
  const markerClass = "highlight-marker";

  container
    .querySelectorAll(`.${markerClass}`)
    .forEach((old: Element) => old.remove());

  for (const { id, range } of highlights) {
    const color = keyLogger.heldKeys.Shift
      ? COLORS.transparentYellow
      : COLORS.transparentBlue;
    const marker = document.createElement("gens-marker") as GensMarker;
    container.appendChild(marker);
    marker.initialize(id, height, color, onMarkerRemove);

    marker.classList.add(markerClass);
    container.appendChild(marker);

    const rangePx = scaleRange(range, xScale);

    marker.render(rangePx);
  }
}
