import {
  FONT_SIZE,
  FONT_WEIGHT,
  SIZES,
  STYLE,
  ZINDICES,
} from "../../constants";
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
      width: ${STYLE.menu.width}px;
      height: 100vh;
      box-sizing: border-box;
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
    #resize-handle {
      position: absolute;
      left: 0;
      top: 0;
      width: ${SIZES.xs}px;
      height: 100%;
      background: transparent;
      cursor: ew-resize;
      z-index: ${ZINDICES.sideMenu + 2}
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
      margin-left: 0;
      flex: 0 0 auto;
      align-self: flex-start;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.s}px;
      font-weight: ${FONT_WEIGHT.bold};
      font-size: ${FONT_SIZE.medium}px;
    }
    #content {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
      overflow-y: auto;
      padding-right: ${SIZES.xxs}px;
      padding-bottom: ${SIZES.m}px;
    }
    #header-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: ${SIZES.xs}px;
      margin-bottom: ${style.margin}px;
      flex: 0 0 auto;
    }
    #header {
      font-weight: ${FONT_WEIGHT.header};
      font-size: ${style.headerSize}px;
      color: ${style.textColor};
      flex: 1 1 0;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  </style>
  <div id="settings-drawer">
    <div id="resize-handle"></div>
    <div id="header-row">
      <div id="header">Placeholder header</div>
      <button id="close-drawer">&times;</button>
    </div>
    <div id="content">
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

  private resizeHandle: HTMLDivElement;
  private isResizing: boolean = false;
  private startX: number = 0;
  private startWidth: number = 0;
  private defaultWidth: number = STYLE.menu.width;

  constructor() {
    super(template);
  }

  private readonly onCloseClick = () => {
    this.removeAttribute("drawer-open");
  };

  private readonly onResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.drawer.getBoundingClientRect().width;
    document.addEventListener("mousemove", this.onResizeMove);
    document.addEventListener("mouseup", this.onResizeEnd);
  };

  private readonly onResizeMove = (e: MouseEvent) => {
    if (!this.isResizing) {
      return;
    }

    const dx = this.startX - e.clientX;
    const newWidth = this.startWidth + dx;
    this.drawer.style.width = `${newWidth}px`;
  };

  private readonly onResizeEnd = () => {
    if (!this.isResizing) {
      return;
    }

    this.isResizing = false;
    document.removeEventListener("mousemove", this.onResizeMove);
    document.removeEventListener("mouseup", this.onResizeEnd);
  };

  connectedCallback() {
    super.connectedCallback();
    this.drawer = this.root.querySelector("#settings-drawer") as HTMLElement;
    this.resizeHandle = this.root.querySelector(
      "#resize-handle",
    ) as HTMLDivElement;
    this.closeButton = this.root.querySelector(
      "#close-drawer",
    ) as HTMLButtonElement;

    this.header = this.root.querySelector("#header") as HTMLDivElement;
    this.entries = this.root.querySelector("#entries") as HTMLDivElement;

    this.closeButton.addEventListener("click", this.onCloseClick);
    this.resizeHandle.addEventListener("mousedown", this.onResizeStart);
  }

  disconnectedCallback() {
    this.closeButton.removeEventListener("click", this.onCloseClick);
    this.resizeHandle.removeEventListener("mousedown", this.onResizeStart);
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
      this.drawer.style.width = `${this.defaultWidth}px`;
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

  showContent(header: string, content: HTMLElement[], width: number) {
    this.open();

    this.defaultWidth = width;

    this.drawer.style.width = `${width}px`;

    removeChildren(this.entries);
    this.header.textContent = header;
    for (const element of content) {
      this.entries.appendChild(element);
    }
  }
}

customElements.define("side-menu", SideMenu);
