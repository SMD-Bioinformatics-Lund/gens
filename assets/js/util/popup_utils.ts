import { computePosition, autoUpdate, offset, flip, shift } from "@floating-ui/dom";
import { GensPopup } from "../components/util/popup";

export function createPopup(
  canvas: HTMLCanvasElement,
  hoveredTarget: HoverBox,
  content: PopupContent,
) {
  const popup = document.createElement("gens-popup") as GensPopup;
  popup.setContent(content);

  // popup.style.cursor = "move";
  // popup.style.touchAction = "none";

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
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ["bottom", "right", "left"]}),
        shift({ padding: 5 }),
      ],
    }).then(({ x, y }) => {
      Object.assign(popup.style, {
        left: `${x}px`,
        top: `${y}px`,
        position: "absolute",
      });
    });
  };

  const cleanup = autoUpdate(virtualReference, popup, update);
  update();

  popup.activateDrag(cleanup);

  popup.addEventListener("close", () => {
    cleanup();
    popup.remove();
  });
}
