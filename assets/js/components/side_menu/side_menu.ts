import { FONT_SIZE, FONT_WEIGHT, SIZES, STYLE, ZINDICES } from "../../constants";
import { removeChildren } from "../../util/utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const style = STYLE.menu;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    :host {
      position: relative;
      display: inline-block;
      z-index: ${ZINDICES.sideMenu};
    }

    .menu-row {
      align-items: center;
      padding: ${SIZES.xs}px 0px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .menu-column {
      display: flex;
      flex-direction: column;
      padding: 0;
    }

    .menu-row-value {
      flex-shrink: 1;
      min-width: 0;
      white-space: normal;
      word-break: break-word;
      text-align: right;
      text-decoration: none;
    }

    .section-entry {
      padding: ${SIZES.xxs}px 0;
    }

    #settings-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 350px;
      height: 100vh;
      background: white;
      box-shadow: 0 ${style.shadowSize}px ${style.shadowSize}px rgba(0, 0, 0, 0.2);
      transform: translateX(100%);
      transition: transform ${style.transitionTime} ease;
      overflow: auto;
      z-index: ${ZINDICES.sideMenu + 1};
      
      display: flex;
      flex-direction: column;
      align-items: stretch;
      /* align-items: flex-start; */
      padding: ${style.padding}px;
      overflow: hidden;
    }
    :host([drawer-open]) #settings-drawer {
      transform: translateX(0);
    }
    #close-drawer {
      background: transparent;
      border: none;
      font-size: ${style.headerSize}px;
      line-height: 1;
      cursor: pointer;
      color: ${style.closeColor};
      padding: 0;
      margin-left: ${style.padding}px;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.l}px;
      font-weight: ${FONT_WEIGHT.bold};
      font-size: ${FONT_SIZE.medium}px;
    }
    #content {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
      overflow-y: auto;
    }
    #header-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${style.margin}px;
      flex: 0 0 auto;
    }
    #header {
      font-weight: ${FONT_WEIGHT.header};
      font-size: ${style.headerSize}px;
      color: ${style.textColor};
    }
  </style>
  <div id="settings-drawer">
    <div id="content">
      <div id="header-row">
        <div id="header">Placeholder header</div>
        <button id="close-drawer">&times;</button>
      </div>
      <div id="entries">
        <div>Placeholder</div>
        <div>Placeholder</div>
        <div>Placeholder</div>
      </div>
    </div>
  </div>
`;

export class SideMenu extends ShadowBaseElement {
  private drawer!: HTMLElement;
  private closeButton!: HTMLButtonElement;
  private header!: HTMLDivElement;
  private entries!: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    this.drawer = this.root.querySelector("#settings-drawer") as HTMLElement;
    this.closeButton = this.root.querySelector(
      "#close-drawer",
    ) as HTMLButtonElement;

    this.header = this.root.querySelector("#header") as HTMLDivElement;
    this.entries = this.root.querySelector("#entries") as HTMLDivElement;

    this.closeButton.addEventListener("click", () => {
      this.removeAttribute("drawer-open");
    });
  }

  open() {
    const isOpen = this.hasAttribute("drawer-open");
    if (!isOpen) {
      this.setAttribute("drawer-open", "");
    }
  }

  close() {
    const isOpen = this.hasAttribute("drawer-open");
    if (isOpen) {
      this.removeAttribute("drawer-open");
    }
  }

  toggle() {
    const isOpen = this.hasAttribute("drawer-open");
    if (isOpen) {
      this.removeAttribute("drawer-open");
    } else {
      this.setAttribute("drawer-open", "");
    }
  }

  showContent(header: string, content: HTMLElement[]) {
    this.open();

    removeChildren(this.entries);

    this.header.textContent = header;
    
    for (const element of content) {
      this.entries.appendChild(element);
    }
  }
}

customElements.define("side-menu", SideMenu);
