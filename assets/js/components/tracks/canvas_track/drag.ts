import { keyLogger } from "../../util/keylogger";

export function initializeDrag(
  canvas: HTMLCanvasElement,
  onDragRelease: (range: Rng) => void,
) {
  let isDragging = false;
  let dragStart;

  canvas.addEventListener("mousedown", (event) => {
    console.log("Mouse down");
    if (keyLogger.heldKeys.Shift) {
      console.log("Shift is down");
      console.log(`Drag start: ${event.x}`);
      isDragging = true;

      // How to get the relative pos inside the canvas?
      dragStart = event.x;
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (keyLogger.heldKeys.Shift && isDragging) {
      console.log("Drag pos", event.x);
    }
  });

  canvas.addEventListener("mouseup", (event) => {
    if (keyLogger.heldKeys.Shift && isDragging) {
      console.log("Mouse up", event.x);
      onDragRelease([dragStart, event.x]);
    }
    isDragging = false;
  });
}
