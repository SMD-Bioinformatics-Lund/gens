import { computePosition, autoUpdate } from "@floating-ui/dom";
import { GensPopup } from "../components/util/popup";

// export function makePopupContent(header: string) {
//     const template = String.raw`<div style="font-family: sans-serif; max-width: 300px;">
//     <h3 style="margin: 0 0 8px; font-size: 16px; color: #333;">${band.label || "No label"}</h3>
//     <div style="font-size: 14px; color: #555;">
//       ${band.hoverInfo}
//     </div>
//     <div style="font-size: 14px; color: #555;">
//       URL:
//       <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0077cc; text-decoration: none; font-weight: 500;">
//         Scout link
//       </a>
//     </div>
//   </div>`;
//   return template;
// }

export function createPopup(
  canvas: HTMLCanvasElement,
  hoveredTarget: HoverBox,
  getPopupContent: (
    canvas: HTMLCanvasElement,
    band: RenderElement,
  ) => PopupContent,
) {
  const popup = document.createElement("gens-popup") as GensPopup;
  popup.setContent(getPopupContent(canvas, hoveredTarget.element));
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
