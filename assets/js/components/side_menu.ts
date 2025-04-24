import { STYLE } from "../constants";
import { removeChildren } from "../util/utils";
import { getEntry } from "./util/popup";
import { ShadowBaseElement } from "./util/shadowbaseelement";

const style = STYLE.popup;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    :host {
      position: relative;
      display: inline-block;
      z-index: 2000;
    }

    #settings-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      min-height: 100vh;
      background: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow: auto;
      z-index: 2001;
      
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      padding: 8px;
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
      gap: ${style.entryGap}px;
      font-weight: ${style.breadFontWeight};
      font-size: 12px;
    }
    #header {
      display: flex;
      flex-direction: row;
      font-weight: ${style.headerFontWeight};
      font-size: ${style.headerSize}px;
      color: ${style.textColor};
      margin-bottom: ${style.margin}px;
    }
  </style>
  <div id="settings-drawer">
    <div id="content">
      <div id="header">Placeholder header</div>
      <div id="entries">
        <div>Placeholder</div>
        <div>Placeholder</div>
        <div>Placeholder</div>
      </div>
    </div>
    <button id="close-drawer">&times;</button>
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

    // document.addEventListener("click", this.onDocumentClick);
  }

  open() {
    const isOpen = this.hasAttribute("drawer-open");
    if (!isOpen) {
      this.setAttribute("drawer-open", "");
    }    
  }

  toggle() {
    const isOpen = this.hasAttribute("drawer-open");
    if (isOpen) {
      // this.removeAttribute("drawer-open");
    } else {
      this.setAttribute("drawer-open", "");
    }
  }

  showContent(content: PopupContent) {
    console.log("Showing content from settings", content);
    this.open();

    this.header.textContent = content.header;
    const infoEntries = content.info;
    if (infoEntries != undefined) {

      removeChildren(this.entries);

      for (const infoEntry of infoEntries) {
        const node = getEntry(infoEntry);
        this.entries.appendChild(node);
      }
    }

    console.log("At the end with nbr entries:", this.entries.children.length);
  }

  disconnectedCallback() {
    // super.disconnectedCallback();
    document.removeEventListener("click", this.onDocumentClick);
  }

  // Close drawer if clicking outside the drawer area
  private onDocumentClick = (e: MouseEvent) => {
    // if (!this.hasAttribute("drawer-open")) {
    //   return;
    // }
    // const path = e.composedPath();
    // if (!path.includes(this)) {
    //   this.removeAttribute("drawer-open");
    // }
  };
}

customElements.define("side-menu", SideMenu);
