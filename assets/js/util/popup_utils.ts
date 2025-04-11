import { computePosition, autoUpdate } from "@floating-ui/dom";
import { GensPopup } from "../components/util/popup";

export function createPopup(
  canvas: HTMLCanvasElement,
  hoveredTarget: HoverBox,
  content: PopupContent,
) {
  const popup = document.createElement("gens-popup") as GensPopup;
  popup.setContent(content);
  document.body.appendChild(popup);

  const virtualReference = {
    getBoundingClientRect: () => {
      const canvasRect = canvas.getBoundingClientRect();
      const x = canvasRect.left + hoveredTarget.box.x1;
      const y = canvasRect.top + hoveredTarget.box.y1;

      return {
        top: y,
        left: x,
        bottom: y,
        right: x,
        width: 0,
        height: 0,
        x: x,
        y: y,
        toJSON: () => {},
      };
    },
    contextElement: canvas,
  };

  const update = () => {
    computePosition(virtualReference, popup, {
      placement: "top",
      middleware: [],
    }).then(({ x, y }) => {
      Object.assign(popup.style, {
        left: `${x}px`,
        top: `${y}px`,
        position: "absolute",
      });
    });
  };

  const cleanup = autoUpdate(virtualReference, popup, update);

  popup.addEventListener("close", () => {
    cleanup();
    popup.remove();
  });

  update();
}
