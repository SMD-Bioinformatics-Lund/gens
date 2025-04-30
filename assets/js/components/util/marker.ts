import { STYLE } from "../../constants";
import { rangeSize, sortRange } from "../../util/utils";
import { ShadowBaseElement } from "./shadowbaseelement";

const style = STYLE.menu;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #marker{
      position: absolute;
      left: 0;
      top: 0;
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      pointer-events: none;
    }
    #close {
      display: none;
      background: transparent;
      border: none;
      font-size: ${style.headerSize}px;
      line-height: 1;
      cursor: pointer;
      color: ${style.closeColor};
      padding: 0;
      padding-top: ${style.padding}px;
      padding-right: ${style.padding}px;
      pointer-events: auto;
    }
    :host(:hover) #close {
      display: block;
    }
    #close:hover {
      color: ${style.textColor};
    }
  </style>
  <div id="marker">
    <div id="close">x</div>
  </div>
`;

export class GensMarker extends ShadowBaseElement {
  private marker: HTMLDivElement;
  private close: HTMLDivElement;

  // This is to detect hover over the highlight while still allowing
  // clicking through on the underlying canvas
  // Better approaches to this are welcome
  private onMouseMove: (e: MouseEvent) => void;

  constructor() {
    super(template);
    this.onMouseMove = this.handleMouseMove.bind(this);
  }

  connectedCallback(): void {
    this.marker = this.root.querySelector("#marker");
    this.close = this.root.querySelector("#close");

    document.addEventListener("mousemove", this.onMouseMove);
  }

  disconnectedCallback(): void {
    document.removeEventListener("mousemove", this.onMouseMove);
  }

  initialize(
    markerId: string,
    height: number,
    color: string,
    closeCallback: ((id: string) => void) | null,
  ) {
    this.marker.style.height = `${height}px`;
    this.marker.style.width = "0px";
    this.marker.style.backgroundColor = color;

    if (closeCallback != null) {
      this.close.addEventListener("click", () => {
        closeCallback(markerId);
      });
    } else {
      this.close.style.display = "none";
    }
  }

  render(pxRange: Rng) {
    const sortedRange = sortRange(pxRange);
    const width = rangeSize(sortedRange);
    this.marker.style.left = `${sortedRange[0]}px`;
    this.marker.style.width = `${width}px`;
  }

  private handleMouseMove(e: MouseEvent) {
    const r = this.marker.getBoundingClientRect();
      const over = (
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      );
      this.close.style.display = over ? "block" : "none";
  }
}


customElements.define("gens-marker", GensMarker);
