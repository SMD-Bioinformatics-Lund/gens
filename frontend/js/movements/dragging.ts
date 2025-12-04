import { initializeDragSelect } from "../components/tracks/base_tracks/interactive_tools";
import { STYLE } from "../constants";
import { getLinearScale } from "../draw/render_utils";

// FIXME: Both needed? Probably not
export function setupDrag(
  tracksContainer: HTMLElement,
  getMarkerModeOn: () => boolean,
  getXRange: () => Rng,
  onSetViewRange: (range: Rng) => void,
  onAddHighlight: (range: Rng) => void,
  onRemoveHighlight: (id: string) => void,
) {
  const onDragEnd = (pxRangeX: Rng, _pxRangeY: Rng, shiftPress: boolean) => {
    const xRange = getXRange();
    if (xRange == null) {
      console.error("No xRange set");
    }

    const yAxisWidth = STYLE.yAxis.width;

    const pixelToPos = getLinearScale(
      [yAxisWidth, tracksContainer.offsetWidth],
      xRange,
    );
    const posStart = pixelToPos(Math.max(yAxisWidth, pxRangeX[0]));
    const posEnd = pixelToPos(Math.max(yAxisWidth, pxRangeX[1]));

    if (shiftPress) {
      onSetViewRange([Math.floor(posStart), Math.floor(posEnd)]);
    } else {
      onAddHighlight([posStart, posEnd]);
    }
  };

  initializeDragSelect(tracksContainer, onDragEnd, onRemoveHighlight, () =>
    getMarkerModeOn(),
  );
}

export function setupDragging(
  container: HTMLElement,
  onDragEnd: (range: Rng) => void,
) {
  let dragStartX: number | null = null;

  let isSpaceDown = false;
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      isSpaceDown = true;
      container.classList.add("grabbable");
      // document.body.style.cursor = "grab";
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      isSpaceDown = false;
      container.classList.remove("grabbable");
      container.classList.remove("grabbing");
    }
  });

  container.addEventListener("pointerdown", (event) => {
    if (isSpaceDown) {
      dragStartX = event.offsetX;
      container.setPointerCapture(event.pointerId);
      container.classList.add("grabbing");
    }
  });

  container.addEventListener("pointerup", (event) => {
    if (event.button === 0 && isSpaceDown) {
      const dragEndX = event.offsetX;

      container.releasePointerCapture(event.pointerId);
      container.classList.remove("grabbing");

      document.body.style.cursor = "";

      onDragEnd([dragStartX, dragEndX]);
    }

    dragStartX = null;
  });
}
