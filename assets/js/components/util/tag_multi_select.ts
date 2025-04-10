const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    .wrapper {
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 6px;
      min-height: 40px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      position: relative;
      background: white;
      z-index: 1;
    }
    .pill {
      background: #e0f0fa;
      border: 1px solid #a0cde0;
      border-radius: 15px;
      padding: 4px 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
    }
    .pill .remove {
      margin-left: 6px;
      cursor: pointer;
      font-weight: bold;
    }
    input {
      border: none;
      flex: 1;
      font-size: 14px;
      outline: none;
      min-width: 80px;
    }
    ul.dropdown {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      max-height: 150px;
      /* overflow-y: auto; */
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      display: none;
    }
    ul.dropdown.open {
      display: block;
    }
    ul.dropdown li {
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    ul.dropdown li:hover {
      background: #f0f0f0;
    }
    .pull-container {
      display: flex;
      flex-direction: row;
    }
  </style>
  <div class="wrapper">
    <div class="pill-container"></div>
    <input type="text" placeholder="Select..." />
    <ul class="dropdown"></ul>
  </div>
`;

export class TagMultiSelect extends HTMLElement {
  private _shadow: ShadowRoot;
  private _input: HTMLInputElement;
  private _dropdown: HTMLUListElement;
  private _pillContainer: HTMLElement;
  private _allOptions: string[] = [];
  private _selected: Set<string> = new Set();

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.appendChild(template.content.cloneNode(true));

    this._input = this._shadow.querySelector("input")!;
    this._dropdown = this._shadow.querySelector("ul.dropdown")!;
    this._pillContainer = this._shadow.querySelector(".pill-container")!;
  }

  public setOptions(options: string[]) {
    this._allOptions = options;
    this._renderDropdown();
  } 

  connectedCallback() {
    const optionsAttr = this.getAttribute("options");
    if (optionsAttr) {
      try {
        this._allOptions = JSON.parse(optionsAttr);
      } catch {
        console.error("Invalid options JSON in <tag-multi-select>");
      }
    }

    this._input.addEventListener("input", () => this._filterDropdown());
    this._input.addEventListener("focus", () => this._openDropdown());

    document.addEventListener("click", (e) => {
      if (!this.contains(e.target as Node)) {
        this._closeDropdown();
      }
    });

    this._renderDropdown();
  }

  private _renderDropdown() {
    this._dropdown.innerHTML = "";
    const filter = this._input.value.toLowerCase();
    const filtered = this._allOptions.filter(
      (opt) =>
        opt.toLowerCase().includes(filter) && !this._selected.has(opt)
    );

    for (const option of filtered) {
      const li = document.createElement("li");
      li.textContent = option;
      li.onclick = () => {
        this._selectOption(option);
      };
      this._dropdown.appendChild(li);
    }

    this._dropdown.classList.toggle("open", filtered.length > 0);
  }

  private _selectOption(option: string) {
    this._selected.add(option);
    this._renderPills();
    this._input.value = "";
    this._renderDropdown();

    this._dispatchChange();
  }

  private _removeOption(option: string) {
    this._selected.delete(option);
    this._renderPills();
    this._renderDropdown();

    this._dispatchChange();
  }

  private _dispatchChange() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: Array.from(this._selected),
      bubbles: true,
      composed: true,
    }))
  }

  private _renderPills() {
    this._pillContainer.innerHTML = "";
    for (const val of this._selected) {
      const pill = document.createElement("div");
      pill.className = "pill";
      pill.textContent = val;

      const remove = document.createElement("span");
      remove.className = "remove";
      remove.textContent = "×";
      remove.onclick = () => {
        this._removeOption(val);
      };

      pill.appendChild(remove);
      this._pillContainer.appendChild(pill);
    }
  }

  private _filterDropdown() {
    this._renderDropdown();
  }

  private _openDropdown() {
    this._renderDropdown();
  }

  private _closeDropdown() {
    this._dropdown.classList.remove("open");
  }

  /** Public method to get selected values */
  getSelected(): string[] {
    return Array.from(this._selected);
  }

  /** Optional: allow programmatic pre-selection */
  public setSelected(values: string[]) {
    for (const val of values) {
      if (this._allOptions.includes(val)) {
        this._selected.add(val);
      }
    }
    this._renderPills();
    this._renderDropdown();
  }
}

customElements.define("tag-multi-select", TagMultiSelect);
