import { COLORS } from "../../../constants";
import { rangeSize, scaleRange, sortRange } from "../../../util/utils";
import { keyLogger } from "../../util/keylogger";
import { GensMarker } from "../../util/marker";

export function initializeDragSelect(
  canvas: HTMLCanvasElement,
  onDragRelease: (rangeX: Rng, rangeY: Rng, shiftPress: boolean) => void,
) {
  let isDragging = false;
  let dragStart: { x: number; y: number };
  let marker: GensMarker | null = null;

  canvas.addEventListener("mousedown", (event) => {
    // FIXME: Conflicting with the zoom out. Need to think this through.
    // Maybe regular right click to zoom out?

    // FIXME: We also need an 'r' shortcut to reset the zoom
    // if (!keyLogger.heldKeys.Shift && !keyLogger.heldKeys.Control) {
    //   return;
    // }

    console.log("Mouse is down");

    isDragging = true;

    const rect = canvas.getBoundingClientRect();

    // How to get the relative pos inside the canvas?
    dragStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    const color = keyLogger.heldKeys.Shift
      ? COLORS.transparentYellow
      : COLORS.transparentBlue;
    marker = document.createElement("gens-marker") as GensMarker;
    canvas.parentElement.appendChild(marker);
    marker.initialize(canvas.height, color, () => marker.remove());

  });

  canvas.addEventListener("mousemove", (event) => {

    if (!isDragging || !marker) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const currX = event.clientX - rect.left;
    const xRange = sortRange([dragStart.x, currX]);

    marker.render(xRange);
    
    // renderMarkerRange(marker, xRange, canvas.height);
  });

  document.addEventListener("mouseup", (event) => {
    if (isDragging) {
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
  });
}

// export function createMarker(
//   canvasHeight: number,
//   color: string = COLORS.transparentYellow,
// ): GensMarker {
//   const marker = document.createElement("gens-marker") as GensMarker;
//   marker.initialize(canvasHeight, color);
//   // marker.className = "marker";
//   // marker.style.height = `${canvasHeight}px`;
//   // marker.style.width = "0px";
//   // marker.style.backgroundColor = color;
//   // marker.style.position = "absolute";
//   // marker.style.top = "0px";
//   // marker.style.pointerEvents = "none";
//   return marker;
// }

// export function renderMarkerRange(
//   marker: HTMLDivElement,
//   viewPxRange: Rng,
//   canvasHeight: number,
// ) {
//   const markerWidth = rangeSize(viewPxRange);

//   marker.style.height = `${canvasHeight}px`;
//   marker.style.width = `${markerWidth}px`;
//   marker.style.left = `${viewPxRange[0]}px`;
// }

export function renderHighlights(
  container: HTMLDivElement,
  height: number,
  highlights: Rng[],
  xScale: Scale,
) {
  const markerClass = "highlight-marker";

  container
    .querySelectorAll(`.${markerClass}`)
    .forEach((old: Element) => old.remove());

  for (const hl of highlights) {

    const color = keyLogger.heldKeys.Shift
      ? COLORS.transparentYellow
      : COLORS.transparentBlue;
    const marker = document.createElement("gens-marker") as GensMarker;
    container.appendChild(marker);
    marker.initialize(height, color, () => marker.remove());

    // const marker = createMarker(height, COLORS.transparentBlue);
    marker.classList.add(markerClass);
    container.appendChild(marker);

    const hlPx = scaleRange(hl, xScale);

    // renderMarkerRange(marker, hlPx, height);
    marker.render(hlPx);
  }
}
