import { COLORS, STYLE } from "../../../constants";
import { GensMarker } from "../../../movements/marker";
import { generateID, scaleRange, sortRange } from "../../../util/utils";
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

  function getLocalPos(event: MouseEvent) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return {
      x: Math.max(STYLE.yAxis.width, Math.min(x, rect.width)),
      y: Math.max(0, Math.min(y, rect.height)),
    };
  }

  element.addEventListener("mousedown", (event) => {
    const path = event.composedPath();
    const onCanvas = path.some((el) => el instanceof HTMLCanvasElement);
    if (!onCanvas) {
      return;
    }

    isDragging = true;
    isMoved = false;

    const pos = getLocalPos(event);
    dragStart = { x: pos.x, y: pos.y };

    if (getMarkerMode() || keyLogger.heldKeys.Shift) {
      const color = keyLogger.heldKeys.Shift
        ? COLORS.transparentYellow
        : COLORS.transparentBlue;
      marker = document.createElement("gens-marker") as GensMarker;
      const id = generateID();
      marker.initialize(
        id,
        element.offsetHeight,
        { color, isCreated: false },
        getMarkerMode() ? onMarkerRemove : null,
      );
      element.appendChild(marker);
    } else {
      // FIXME: Drag to pan here
    }
  });

  element.addEventListener("mousemove", (event) => {
    if (!isDragging || !marker) {
      return;
    }

    isMoved = true;
    const pos = getLocalPos(event);
    const xRange = sortRange([dragStart.x, pos.x]);
    marker.render(xRange);
  });

  document.addEventListener("mouseup", (event) => {
    if (isDragging && isMoved) {
      const pos = getLocalPos(event);
      const sortedX = sortRange([dragStart.x, pos.x]);
      const sortedY = sortRange([dragStart.y, pos.y]);

      onDragRelease(sortedX, sortedY, keyLogger.heldKeys.Shift);
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
    marker.initialize(
      id,
      container.offsetHeight,
      { color, isCreated: true },
      onMarkerRemove,
    );
    container.appendChild(marker);

    marker.classList.add(markerClass);

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
