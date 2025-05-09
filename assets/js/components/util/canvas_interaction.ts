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
  canvas.addEventListener(
    "mousemove",
    (event) => {
      if (markerModeOn()) {
        if (event.offsetX < markerArea[0] || event.offsetX > markerArea[1]) {
          // FIXME: CSS based instead here
          canvas.style.cursor = "crosshair";
        } else {
          canvas.style.cursor = "";
        }
      } else if (keyLogger.heldKeys.Shift) {
        canvas.style.cursor = "zoom-in";
      } else {
        const hoverTargets = getHoverTargets();

        if (!hoverTargets) {
          return;
        }
        const hovered = hoverTargets.some((target) =>
          eventInBox(event, target.box),
        );
        canvas.style.cursor = hovered ? "pointer" : "";
      }
    },
    { signal: abortSignal },
  );
}

export function getCanvasHover(
  canvas: HTMLCanvasElement,
  getHoverTargets: () => HoverBox[],
  settings: HoverSettings,
) {
  const tooltip = settings.showTooltip ? new Tooltip(document.body) : null;

  canvas.addEventListener("mousemove", (event) => {
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
  });
  canvas.addEventListener("mouseleave", () => {
    if (tooltip != null) {
      tooltip.onMouseLeave();
    }
  });
}
