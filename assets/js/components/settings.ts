import { ShadowBaseElement } from "./util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    :host {
      position: relative;
      display: inline-block;
    }

    #settings-button {
      border: 0px;
      /* box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.3); */
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
      position: absolute;
      top: 100%;
      right: 0;
      width: 250px;
      max-height: 100vh;
      background: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      transform: translateY(-10px) scaleY(0);
      transform-origin: top right;
      transition: transform 0.2s ease-in-out;
      overflow: auto;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      padding: 8px;
    }
    :host([drawer-open]) #settings-drawer {
      transform: translateY(0) scaleY(1);
    }
    #close-drawer {
      margin-top: 1em;
      background: none;
      border: 1px solid #ccc;
      padding: 0.3em 0.6em;
      cursor: pointer;
      align-self: flex-end;
    }
  </style>
  <div>
    <div id="settings-button">
        <i class="fas fa-cog"></i>
    </div>

    <div id="settings-drawer">
      <h3>Settings</h3>
      <p>Text</p>
      <button id="close-drawer">Close</button>
    </div>
  </div>
`;

export class Settings extends ShadowBaseElement {
  private settingsButton!: HTMLButtonElement;
  private drawer!: HTMLElement;
  private closeButton!: HTMLButtonElement;

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

    this.settingsButton.addEventListener("click", () => {
      console.log("Open button");
      const isOpen = this.hasAttribute("drawer-open");
      if (isOpen) {
        this.removeAttribute("drawer-open");
      } else {
        this.setAttribute("drawer-open", "");
      }
    });
    this.closeButton.addEventListener("click", () => {
      console.log("Close");
      this.removeAttribute("drawer-open");
    });

    document.addEventListener("click", this.onDocumentClick);
  }

  disconnectedCallback() {
    // super.disconnectedCallback();
    document.removeEventListener("click", this.onDocumentClick);
  }

  // Close drawer if clicking outside the drawer area
  private onDocumentClick = (e: MouseEvent) => {
    if (!this.hasAttribute("drawer-open")) {
      return;
    }
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.removeAttribute("drawer-open");
    }
  };
}

customElements.define("gens-settings", Settings);
