const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
  #container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  </style>
  <div>
  <div id='container'>
    <div>A</div>
    <div>B</div>
    <div>C</div>
      <!-- <a id="home-link" href="{{ url_for('home.home') }}">
        <div id="logo-container">
          <span class='logo'></span>
        </div>
      </a> -->
      <!-- <span class='version'>v{{ version }}</span> -->
      <!-- <span class='date'>{{todays_date}}</span> -->
    <!-- </div> -->
    <!-- <input-controls></input-controls> -->
  </div>
`;

export class TopBar extends HTMLElement {
  private _root: ShadowRoot;

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("top-bar", TopBar);
