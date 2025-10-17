import { Tooltip } from "../../util/tooltip_utils";
import { eventInBox } from "../../util/utils";
import { keyLogger } from "./keylogger";

interface HoverSettings {
  showTooltip: boolean;
}

export function setupCanvasClick(
  canvas: HTMLCanvasElement,
  getHoverTargets: () => HoverBox[],
  onElementClick: (el: HoverBox) => void | null = null,
  abortSignal: AbortSignal,
) {
  canvas.addEventListener(
    "click",
    (event) => {
      const hoverTargets = getHoverTargets();

      if (!hoverTargets || !onElementClick) {
        return;
      }

      const hoveredTarget = hoverTargets.find((target) =>
        eventInBox(event, target.box),
      );

      if (hoveredTarget && onElementClick) {
        onElementClick(hoveredTarget);
      }
    },
    { signal: abortSignal },
  );
}

export function setCanvasPointerCursor(
  canvas: HTMLCanvasElement,
  getHoverTargets: () => HoverBox[],
  markerModeOn: () => boolean,
  markerArea: Rng,
  abortSignal: AbortSignal,
) {
  let lastOffset = { x: -1, y: -1 };

  document.addEventListener(
    "keyup",
    (_event) => {
      updateCursor(lastOffset);
    },
    { signal: abortSignal },
  );

  canvas.addEventListener(
    "mousemove",
    (event) => {
      lastOffset = {
        x: event.offsetX,
        y: event.offsetY,
      };
      updateCursor(lastOffset);
    },
    { signal: abortSignal },
  );

  function updateCursor(
    offset: {
      x: number;
      y: number;
    } | null,
  ) {
    if (markerModeOn()) {
      if (offset.x < markerArea[0] || offset.x > markerArea[1]) {
        // FIXME: CSS based instead here
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "";
      }
    } else if (keyLogger.heldKeys.Shift) {
      canvas.style.cursor = "zoom-in";
    } else if (keyLogger.heldKeys.Control) {
      canvas.style.cursor = "zoom-out";
    } else {
      const hoverTargets = getHoverTargets();

      if (!hoverTargets) {
        canvas.style.cursor = "";
        return;
      }
      const hovered = hoverTargets.some((target) =>
        eventInBox({ offsetX: offset.x, offsetY: offset.y }, target.box),
      );
      // FIXME: Use CSS class here
      canvas.style.cursor = hovered ? "pointer" : "";
    }
  }
}

export function getCanvasHover(
  canvas: HTMLCanvasElement,
  getHoverTargets: () => HoverBox[],
  settings: HoverSettings,
  listenerAbortSignal: AbortSignal,
) {
  const tooltip = settings.showTooltip ? new Tooltip(document.body) : null;

  canvas.addEventListener(
    "mousemove",
    (event) => {
      const hoverTargets = getHoverTargets();

      if (hoverTargets == null) {
        return;
      }
      if (tooltip != null) {
        tooltip.onMouseMove(canvas, event.offsetX, event.offsetY);
      }

      const hovered = hoverTargets.find((target) =>
        eventInBox(event, target.box),
      );

      if (tooltip != null) {
        if (hovered) {
          tooltip.tooltipEl.textContent = hovered.label;
          tooltip.onMouseMove(canvas, event.offsetX, event.offsetY);
        } else {
          tooltip.onMouseLeave();
        }
      }
    },
    { signal: listenerAbortSignal },
  );
  canvas.addEventListener(
    "mouseleave",
    () => {
      if (tooltip != null) {
        tooltip.onMouseLeave();
      }
    },
    { signal: listenerAbortSignal },
  );
}
