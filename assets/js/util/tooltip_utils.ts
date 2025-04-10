import { createPopper } from "@popperjs/core";
import { STYLE } from "../constants";

export class Tooltip {
    public tooltipEl: HTMLDivElement;
    public popperInstance: ReturnType<typeof createPopper> | null = null;

    constructor(container: HTMLElement) {
        const tt = createTooltipDiv();
        this.tooltipEl = tt;
        container.appendChild(tt);
    }

    onMouseMove(canvas: HTMLCanvasElement, offsetX: number, offsetY: number) {
        const virtualElement = makeVirtualElementNew(canvas, offsetX, offsetY);

        if (this.popperInstance) {
            this.popperInstance.destroy();
        }
        this.popperInstance = createPopper(virtualElement, this.tooltipEl, {
          placement: "top",
          modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
        });
      
        this.tooltipEl.style.display = "block";
    }

    onMouseLeave() {
        this.tooltipEl.style.display = "none";
        if (this.popperInstance) {
          this.popperInstance.destroy();
          this.popperInstance = null;
        }
    }
}

export function makeVirtualElementNew(
  canvas: HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
) {
  const virtualElement = {
    getBoundingClientRect: () => {
      const canvasRect = canvas.getBoundingClientRect();
      const x = canvasRect.left + offsetX;
      const y = canvasRect.top + offsetY;
      return {
        width: 0,
        height: 0,
        top: y,
        left: x,
        bottom: y,
        right: x,
        x: x,
        y: y,
        toJSON: () => {},
      };
    },
  };
  return virtualElement;
}

export function createTooltipDiv(): HTMLDivElement {
  const tt = document.createElement("div");
  tt.className = "tooltip";
  tt.style.position = "absolute";
  tt.style.zIndex = "9999";
  tt.style.display = "none";

  tt.style.background = STYLE.colors.darkGray;
  tt.style.color = STYLE.colors.white;
  tt.style.fontWeight = "bold";
  tt.style.padding = "4px 8px";
  tt.style.fontSize = "13px";
  tt.style.borderRadius = "4px";

  tt.textContent = "";
  return tt;
}

export function tooltipOnMouseMove(
  canvas: HTMLCanvasElement,
  popperInstance: ReturnType<typeof createPopper> | null,
  tooltipEl: HTMLDivElement,
  offsetX: number,
  offsetY: number,
) {
  const virtualElement = makeVirtualElementNew(canvas, offsetX, offsetY);

  if (popperInstance) {
    popperInstance.destroy();
  }
  popperInstance = createPopper(virtualElement, tooltipEl, {
    placement: "top",
    modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
  });

  tooltipEl.style.display = "block";
}
