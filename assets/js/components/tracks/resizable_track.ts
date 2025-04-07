import { CanvasTrack } from "./canvas_track";

export class ResizableTrack extends CanvasTrack {

  connectedCallback() {
    this.expanded = false;
  }

  initializeCanvas(
    label: string,
    trackHeight: number,
    expandedHeight: number | null = null,
  ) {
    super.initializeCanvas(label, trackHeight);

    if (expandedHeight != null) {
      this.initializeExpandable(trackHeight, expandedHeight);
    }
  }

  initializeExpandable(height: number, expandedHeight: number) {
    this.trackContainer.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      this.expanded = !this.expanded;
      this.canvas.height = this.expanded ? expandedHeight : height;
      this.syncDimensions();

      console.log("Expand");
    });
  }
}
