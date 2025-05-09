import { ShadowBaseElement } from "../components/util/shadowbaseelement";
import { SIZES, STYLE } from "../constants";
import { rangeSize, sortRange } from "../util/utils";

const style = STYLE.menu;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      position: absolute;
      left: 0;
      top: 0;
      display: flex;
      pointer-events: none;
    }
    #close {
      display: none;
      position: absolute;
      top: ${SIZES.m}px;
      right: ${SIZES.m}px;

      width: 1.5em;
      height: 1.5em;
      background: rgba(0, 0, 0, 0.4);
      text-align: center;
      color: white;

      font-size: ${style.headerSize}px;
      line-height: 1.5em;
      cursor: pointer;
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
    // Normally it would be preferable to deal with the mouse hover though CSS only
    // Here is tricky though, as we want pointer: none to let it click elements below
    if (closeCallback != null) {
      this.onMouseMove = this.handleMouseMove.bind(this);
    }

    this.style.height = `${height}px`;
    this.style.width = "0px";
    this.style.backgroundColor = color;
    this.classList.toggle("has-close", closeCallback != null);

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
    const over =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    this.close.style.display = over ? "block" : "none";
  }
}

customElements.define("gens-marker", GensMarker);
