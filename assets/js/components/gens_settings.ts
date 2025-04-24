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
      z-index: 1000;
    }

    #settings-button {
      border: 0px;
      padding: 4px 10px;
      cursor: pointer;
      background: #FAFBFC;
      border: 1px solid rgba(27, 31, 35, 0.15);
      border-radius: 4px;
      transition: box-shadow 0.1s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      i {
        font-size: 20px;
        line-height: 1;
        color: $button-gray;
      }

      &:hover {
        background: $button-hover-white;
      }

      &:active {
        transform: scale(0.98);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
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
      z-index: 1001;
      
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
  <div>
    <div id="settings-button">
        <i class="fas fa-cog"></i>
    </div>

    <div id="settings-drawer">
      <div id="content">
        <div id="header">Settings will come here</div>
        <div id="entries">
          <div>Example entry</div>
          <div>Example entry</div>
          <div>Example entry</div>
        </div>
      </div>
      <button id="close-drawer">&times;</button>
    </div>
  </div>
`;

export class Settings extends ShadowBaseElement {
  private settingsButton!: HTMLButtonElement;
  private drawer!: HTMLElement;
  private closeButton!: HTMLButtonElement;
  private header!: HTMLDivElement;
  private entries!: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    this.settingsButton = this.root.querySelector(
      "#settings-button",
    ) as HTMLButtonElement;
    console.log(this.settingsButton);
    this.drawer = this.root.querySelector("#settings-drawer") as HTMLElement;
    this.closeButton = this.root.querySelector(
      "#close-drawer",
    ) as HTMLButtonElement;

    this.header = this.root.querySelector("#header") as HTMLDivElement;
    this.entries = this.root.querySelector("#entries") as HTMLDivElement;

    this.settingsButton.addEventListener("click", () => {
      console.log("Open button");
      this.toggle();
    });
    this.closeButton.addEventListener("click", () => {
      console.log("Close");
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

customElements.define("gens-settings", Settings);
