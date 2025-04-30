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
    }
    #close {
      background: transparent;
      border: none;
      font-size: ${style.headerSize}px;
      line-height: 1;
      cursor: pointer;
      color: ${style.closeColor};
      padding: 0;
      padding-top: ${style.padding}px;
      padding-right: ${style.padding}px;
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

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    this.marker = this.root.querySelector("#marker");
    this.close = this.root.querySelector("#close");
  }

  initialize(height: number, color: string, closeCallback: (() => void) | null) {
    this.marker.style.height = `${height}px`;
    this.marker.style.width = "0px";
    this.marker.style.backgroundColor = color;

    if (closeCallback != null) {
      this.close.addEventListener("click", () => {
        closeCallback();
      })
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
}

customElements.define("gens-marker", GensMarker);
