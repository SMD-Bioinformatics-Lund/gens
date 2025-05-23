import { SIZES, STYLE } from "../../constants";
import { getEntry } from "./menu_utils";
import { ShadowBaseElement } from "./shadowbaseelement";

const style = STYLE.menu;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      position: absolute;
      background: ${style.backgroundColor};
      border: ${style.borderWidth}px solid ${style.borderColor};
      padding: ${style.padding}px;
      zIndex: 10000;
      font-family: ${style.font};
      max-width: 500px;
      max-height: 500px;
      border-radius: ${style.borderRadius}px;
    }
    #header {
      display: flex;
      flex-direction: row;
      font-weight: ${style.headerFontWeight};
      font-size: ${style.headerSize}px;
      color: ${style.textColor};
      margin-bottom: ${style.margin}px;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.l}px;
    }

    #container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    #content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: ${style.margin}px;
    }
    .drag-area {
      cursor: grab;
    }
    .drag-area.dragging {
      cursor: grabbing;
    }
    #close-popup {
      background: transparent;
      border: none;
      font-size: ${style.headerSize}px;
      line-height: 1;
      cursor: pointer;
      color: ${style.closeColor};
      padding: 0;
      margin-left: ${style.padding}px;
    }
    #close-popup:hover {
      color: ${style.textColor};
    }
  </style>
  <div id="container">
    <div id="content">
      <div id="header" class="drag-area">
        <div id="header-text"></div>
      </div>
      <div id="entries"></div>
    </div>
    <button id="close-popup">&times;</button>
  </div>
`;

export class GensPopup extends ShadowBaseElement {
  constructor() {
    super(template);
  }

  setContent(content: PopupContent) {
    const header = this.root.querySelector("#header-text");
    header.textContent = content.header;
    const infoEntries = content.info;
    if (infoEntries != undefined) {
      const entriesContainer = this.root.querySelector("#entries");

      for (const infoEntry of infoEntries) {
        const node = getEntry(infoEntry);
        entriesContainer.appendChild(node);
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();

    const closeButton = this.root.querySelector("#close-popup");
    closeButton.addEventListener("click", () => {
      this.remove();
    });

  }

  activateDrag(cleanup: () => void) {
    const dragArea = this.root.querySelector(".drag-area") as HTMLElement;
    setupDrag(this, dragArea, cleanup);
  }
}

function setupDrag(host: HTMLElement, dragArea: HTMLElement, cleanup: () => void) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;

  dragArea.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) {
      return;
    }

    cleanup();

    isDragging = true;
    dragArea.classList.add("dragging");

    startX = e.clientX;
    startY = e.clientY;
    const rect = host.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;

    dragArea.setPointerCapture(e.pointerId);
  });

  dragArea.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    host.style.left = `${origLeft + dx}px`;
    host.style.top = `${origTop + dy}px`;
  });

  dragArea.addEventListener("pointerup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    dragArea.releasePointerCapture(e.pointerId);
    dragArea.classList.remove("dragging");
  });
}


customElements.define("gens-popup", GensPopup);
