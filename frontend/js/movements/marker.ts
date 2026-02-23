import { ShadowBaseElement } from "../components/util/shadowbaseelement";
import { COLORS, SIZES, STYLE, ZINDICES } from "../constants";
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
      z-index: ${ZINDICES.trackMarkers};
      background-color: ${COLORS.transparentYellow};
      box-sizing: border-box;
      border-left: ${SIZES.one}px solid ${COLORS.lightGray};
      border-right: ${SIZES.one}px solid ${COLORS.lightGray};
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
  private closeCallback: (id: string) => void;
  private markerId: string;
  private height: number;
  private color: string;
  // Is it still being dragged out or has it been created
  private isCreated: boolean;

  constructor() {
    super(template);
  }

  initialize(
    markerId: string,
    height: number,
    settings: { color: string; isCreated: boolean },
    closeCallback: ((id: string) => void) | null,
  ) {
    this.markerId = markerId;
    this.height = height;
    this.color = settings.color;
    this.isCreated = settings.isCreated;
    this.closeCallback = closeCallback;
  }

  connectedCallback(): void {
    this.close = this.root.querySelector("#close");

    // Normally it would be preferable to deal with the mouse hover though CSS only
    // Here is tricky though, as we want pointer: none to let it click elements below
    if (this.closeCallback != null) {
      this.onMouseMove = this.handleMouseMove.bind(this);
    }

    this.style.height = `${this.height}px`;
    this.style.width = "0px";
    this.style.backgroundColor = this.color;
    this.classList.toggle(
      "has-close",
      this.closeCallback != null && this.isCreated,
    );

    if (this.closeCallback != null) {
      this.close.addEventListener("click", () => {
        this.closeCallback(this.markerId);
      });
    }

    document.addEventListener("mousemove", this.onMouseMove);
  }

  disconnectedCallback(): void {
    document.removeEventListener("mousemove", this.onMouseMove);
  }

  render(pxRange: Rng) {
    const sortedRange = sortRange(pxRange);
    const width = rangeSize(sortedRange);
    this.style.left = `${sortedRange[0]}px`;
    this.style.width = `${width}px`;
    this.style.height = `${this.height}px`;
  }

  private handleMouseMove(e: MouseEvent) {
    const r = this.getBoundingClientRect();
    const over =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    this.close.style.display = this.isCreated && over ? "block" : "none";
  }
}

customElements.define("gens-marker", GensMarker);
