export function setupDragging(
  container: HTMLElement,
  onDragEnd: (range: Rng) => void,
) {
  let dragStartX: number | null = null;
  let dragEndX: number | null = null;

  let isSpaceDown = false;
  let isMouseDown = false;
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
    isMouseDown = true;

    if (isSpaceDown) {
      dragStartX = event.offsetX;
      container.setPointerCapture(event.pointerId);
      container.classList.add("grabbing");
    }
  });

  container.addEventListener("pointerup", (event) => {
    isMouseDown = false;

    if (event.button === 0) {
      const dragEndX = event.offsetX;

      container.releasePointerCapture(event.pointerId);
      container.classList.remove("grabbing");

      document.body.style.cursor = "";

      onDragEnd([dragStartX, dragEndX]);
    }

    dragStartX = null;
    dragEndX = null;
  });
}
