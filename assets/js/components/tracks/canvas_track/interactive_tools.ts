import { COLORS } from "../../../constants";
import { rangeSize, sortRange } from "../../../util/utils";
import { keyLogger } from "../../util/keylogger";

export function initializeDragSelect(
  canvas: HTMLCanvasElement,
  onDragRelease: (rangeX: Rng, rangeY: Rng) => void,
) {
  let isDragging = false;
  let dragStart: { x: number; y: number };
  let marker = null;

  canvas.addEventListener("mousedown", (event) => {
    // FIXME: Conflicting with the zoom out. Need to think this through.
    // Maybe regular right click to zoom out?

    // FIXME: We also need an 'r' shortcut to reset the zoom
    if (!keyLogger.heldKeys.Shift && !keyLogger.heldKeys.Control) {
      return;
    }
    isDragging = true;

    const rect = canvas.getBoundingClientRect();

    // How to get the relative pos inside the canvas?
    dragStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    marker = createMarker(
      canvas.height,
      keyLogger.heldKeys.Shift
        ? COLORS.transparentYellow
        : COLORS.transparentBlue,
    );
    canvas.parentElement.appendChild(marker);
  });

  canvas.addEventListener("mousemove", (event) => {
    if (!isDragging) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const currX = event.clientX - rect.left;
    const xRange = sortRange([dragStart.x, currX]);

    renderMarkerRange(marker, xRange, canvas.height);
  });

  document.addEventListener("mouseup", (event) => {
    if (isDragging) {
      onDragRelease(
        sortRange([dragStart.x, event.x]),
        sortRange([dragStart.y, event.y]),
      );
    }
    if (marker) {
      marker.remove();
      marker = null;
    }
    isDragging = false;
  });
}

export function createMarker(
  canvasHeight: number,
  color: string = COLORS.transparentYellow,
): HTMLDivElement {
  const marker = document.createElement("div") as HTMLDivElement;
  marker.className = "marker";
  marker.style.height = `${canvasHeight}px`;
  marker.style.width = "0px";
  marker.style.backgroundColor = color;
  marker.style.position = "absolute";
  marker.style.top = "0px";
  marker.style.pointerEvents = "none";
  return marker;
}

export function renderMarkerRange(
  marker: HTMLDivElement,
  viewPxRange: Rng,
  canvasHeight: number,
) {
  const markerWidth = rangeSize(viewPxRange);

  marker.style.height = `${canvasHeight}px`;
  marker.style.width = `${markerWidth}px`;
  marker.style.left = `${viewPxRange[0]}px`;
}
