import { ICONS, SIZES } from "../../constants";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { IconButton } from "../util/icon_button";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #main-row {
      justify-content: space-between;
      width: 100%;
    }
    #button-row {
      gap: ${SIZES.s}px;
    }
  </style>
  <flex-row id="main-row">
    <div id="label"></div>
    <flex-row id="button-row">

      <icon-button id="up" icon="${ICONS.up}"></icon-button>
      <icon-button id="down" icon="${ICONS.down}"></icon-button>
      <icon-button id="hide" icon="${ICONS.hide}"></icon-button>
      <icon-button id="collapse" icon="${ICONS.collapse}"></icon-button>
    </flex-row>
  </flex-row>
`;

export class TrackRow extends ShadowBaseElement {
  private label: HTMLDivElement;
  private up: IconButton;
  private down: IconButton;
  private toggleHide: IconButton;
  private toggleExpand: IconButton;

  track: DataTrack;
  onMove: (track: DataTrack, direction: "up" | "down") => void;
  onToggleShow: (track: DataTrack) => void;
  onToggleExpand: (track: DataTrack) => void;

  getIsHidden: () => boolean;
  getIsExpanded: () => boolean;

  constructor() {
    super(template);
  }

  initialize(
    track: DataTrack,
    onMove: (track: DataTrack, direction: "up" | "down") => void,
    onToggleShow: (track: DataTrack) => void,
    onToggleCollapse: (track: DataTrack) => void,
    getIsHidden: () => boolean,
    getIsExpanded: () => boolean,
  ) {
    this.track = track;
    this.onMove = onMove;
    this.onToggleShow = onToggleShow;
    this.onToggleExpand = onToggleCollapse;
    this.getIsHidden = getIsHidden;
    this.getIsExpanded = getIsExpanded;
  }

  connectedCallback(): void {

    super.connectedCallback();

    this.label = this.root.querySelector("#label");
    this.up = this.root.querySelector("#up");
    this.down = this.root.querySelector("#down");
    this.toggleHide = this.root.querySelector("#hide");
    this.toggleExpand = this.root.querySelector("#collapse");

    this.label.innerHTML = this.track.label;

    // This is needed to make sure the icon buttons are classes
    // before later assigning the icon, i.e.
    // this.toggleHide.icon = ICONS.down;
    // If not doing this, the component is not upgraded yet
    // at that point and will not assign the property
    this.shadowRoot!
        .querySelectorAll('icon-button')
        .forEach(el => customElements.upgrade(el));

    this.up.onclick = () => {
      console.log("Moving");
      this.onMove(this.track, "up");
    };
    this.down.onclick = () => {
      this.onMove(this.track, "down");
    };
    this.toggleHide.onclick = () => {
      this.onToggleShow(this.track);
    }
    this.toggleExpand.onclick = () => {
      this.onToggleExpand(this.track);
    }

    this.toggleHide.icon = this.getIsHidden() ? ICONS.hide : ICONS.show;
    this.toggleExpand.icon = this.getIsExpanded() ? ICONS.expand : ICONS.collapse;
  }
}

customElements.define("track-row", TrackRow);
