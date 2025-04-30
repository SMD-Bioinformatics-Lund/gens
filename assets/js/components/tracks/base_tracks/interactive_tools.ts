import { COLORS } from "../../../constants";
import { generateID, rangeSize, scaleRange, sortRange } from "../../../util/utils";
import { keyLogger } from "../../util/keylogger";
import { GensMarker } from "../../util/marker";

export function initializeDragSelect(
  canvas: HTMLCanvasElement,
  onDragRelease: (rangeX: Rng, rangeY: Rng, shiftPress: boolean) => void,
  onMarkerRemove: (id: string) => void,
) {
  let isDragging = false;
  let isMoved = false;
  let dragStart: { x: number; y: number };
  let marker: GensMarker | null = null;

  canvas.addEventListener("mousedown", (event) => {
    // FIXME: Conflicting with the zoom out. Need to think this through.
    // Maybe regular right click to zoom out?

    // FIXME: We also need an 'r' shortcut to reset the zoom
    // if (!keyLogger.heldKeys.Shift && !keyLogger.heldKeys.Control) {
    //   return;
    // }

    isDragging = true;
    isMoved = false;

    const rect = canvas.getBoundingClientRect();

    // How to get the relative pos inside the canvas?
    dragStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    const color = keyLogger.heldKeys.Shift
      ? COLORS.transparentYellow
      : COLORS.transparentBlue;
    marker = document.createElement("gens-marker") as GensMarker;
    canvas.parentElement.appendChild(marker);
    const id = generateID();
    marker.initialize(id, canvas.height, color, onMarkerRemove);

  });

  canvas.addEventListener("mousemove", (event) => {

    if (!isDragging || !marker) {
      return;
    }

    isMoved = true;

    const rect = canvas.getBoundingClientRect();
    const currX = event.clientX - rect.left;
    const xRange = sortRange([dragStart.x, currX]);

    marker.render(xRange);
    
    // renderMarkerRange(marker, xRange, canvas.height);
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
  highlights: {id: string, range: Rng}[],
  xScale: Scale,
  onMarkerRemove: (markerId: string) => void,
) {
  const markerClass = "highlight-marker";

  container
    .querySelectorAll(`.${markerClass}`)
    .forEach((old: Element) => old.remove());

  for (const {id, range} of highlights) {

    const color = keyLogger.heldKeys.Shift
      ? COLORS.transparentYellow
      : COLORS.transparentBlue;
    const marker = document.createElement("gens-marker") as GensMarker;
    container.appendChild(marker);
    marker.initialize(id, height, color, onMarkerRemove);

    // const marker = createMarker(height, COLORS.transparentBlue);
    marker.classList.add(markerClass);
    container.appendChild(marker);

    const rangePx = scaleRange(range, xScale);

    // renderMarkerRange(marker, hlPx, height);
    marker.render(rangePx);
  }
}
