import { Tooltip } from "../../util/tooltip_utils";
import { eventInBox } from "../../util/utils";

interface HoverSettings {
  showTooltip: boolean;
}

export function getCanvasClick(
  canvas: HTMLCanvasElement,
  getHoverTargets: () => HoverBox[],
  onElementClick: (el: HoverBox) => void | null = null,
) {
  canvas.addEventListener("click", (event) => {

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
  });

  canvas.addEventListener("mousemove", (event) => {

    const hoverTargets = getHoverTargets();

    if (!hoverTargets) {
      return;
    }
    const hovered = hoverTargets.find((target) =>
      eventInBox(event, target.box),
    );
    if (onElementClick) {
      canvas.style.cursor = hovered ? "pointer" : "default";
    }
  });
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
