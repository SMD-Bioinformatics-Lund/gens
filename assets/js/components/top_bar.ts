// import { library, dom } from '@fortawesome/fontawesome-svg-core';
// import { faCog } from '@fortawesome/free-solid-svg-icons';

// library.add(faCog);

import { STYLE } from "../util/constants";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
  #container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    font-size: 20px;
    padding: 10px 20px;
    color: ${STYLE.colors.darkGray};

    /* background-color: #4c6d94; */
    background-color: #bbcadc
  }
  #logo-container {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: white;
    /* background: #bbcadc; */

    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo {
    background: url(/gens/static/svg/gens-logo-only.svg) no-repeat top left;
    background-size: contain;
    width: 35px;
    height: 35px;
  }
  </style>
  <div id='container'>

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
