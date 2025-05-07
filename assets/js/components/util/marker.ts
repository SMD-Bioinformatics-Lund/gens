import { STYLE } from "../../constants";
import { rangeSize, sortRange } from "../../util/utils";
import { ShadowBaseElement } from "./shadowbaseelement";

const style = STYLE.menu;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
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
      padding: 0 ${style.padding}px 0 0;
      pointer-events: auto;
    }
    :host(.has-close):hover #close {
      display: block;
    }
    #close:hover {
      color: ${style.textColor};
    }
  </style>
  <div id="close">x</div>
`;

export class GensMarker extends ShadowBaseElement {
  private close: HTMLDivElement;

  // This is to detect hover over the highlight while still allowing
  // clicking through on the underlying canvas
  // Better approaches to this are welcome
  private onMouseMove: (e: MouseEvent) => void;

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    // this.marker = this.root.querySelector("#marker");
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

    // FIXME: I would like to remove this entirely and only use CSS properties
    if (closeCallback != null) {
      this.onMouseMove = this.handleMouseMove.bind(this);
    }


    this.style.height = `${height}px`;
    this.style.width = "0px";
    this.style.backgroundColor = color;
    // this.classList.add("has-close");
    // this.classList.toggle("has-close", closeCallback != null);

    if (closeCallback != null) {
      this.close.addEventListener("click", () => {
        closeCallback(markerId);
      });
    }
  }

  render(pxRange: Rng) {
    const sortedRange = sortRange(pxRange);
    const width = rangeSize(sortedRange);
    this.style.left = `${sortedRange[0]}px`;
    this.style.width = `${width}px`;
  }

  private handleMouseMove(e: MouseEvent) {
    const r = this.getBoundingClientRect();
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
