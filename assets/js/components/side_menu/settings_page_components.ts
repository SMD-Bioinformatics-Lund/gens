import { ICONS, SIZES } from "../../constants";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    #main-row {
      justify-content: space-between;
      width: 100%;
    }
    .icon-button {
      height: ${SIZES.l}px;
      width: ${SIZES.l}px;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: ${SIZES.s}px;
      align-items: center;
      justify-content: center;
    }
    #button-row {
      gap: ${SIZES.s}px;
    }
  </style>
  <g-row id="main-row">
    <div id="label"></div>
    <g-row id="button-row">
      <button id="up" class="button fas ${ICONS.up}"></button>
      <button id="down" class="button fas ${ICONS.down}"></button>
      <button id="hide" class="button fas ${ICONS.show}"></button>
      <button id="collapse" class="button fas ${ICONS.expand}"></button>
  </g-row>
  </g-row>
`;

export class TrackRow extends ShadowBaseElement {
  private label: HTMLDivElement;
  private up: HTMLButtonElement;
  private down: HTMLButtonElement;
  private toggleHide: HTMLButtonElement;
  private toggleCollapse: HTMLButtonElement;

  track: DataTrack;
  onMove: (track: DataTrack, direction: "up" | "down") => void;
  onToggleShow: (track: DataTrack) => void;
  onToggleCollapse: (track: DataTrack) => void;

  constructor() {
    super(template);
  }

  initialize(
    track: DataTrack,
    onMove: (track: DataTrack, direction: "up" | "down") => void,
    onToggleShow: (track: DataTrack) => void,
    onToggleCollapse: (track: DataTrack) => void,
  ) {
    this.track = track;
    this.onMove = onMove;
    this.onToggleShow = onToggleShow;
    this.onToggleCollapse = onToggleCollapse;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.label = this.root.querySelector("#label");
    this.up = this.root.querySelector("#up");
    this.down = this.root.querySelector("#down");
    this.toggleHide = this.root.querySelector("#hide");
    this.toggleCollapse = this.root.querySelector("#collapse");

    this.label.innerHTML = this.track.label;

    this.up.onclick = () => {
      console.log("Moving");
      this.onMove(this.track, "up");
    };
    this.down.onclick = () => {
      this.onMove(this.track, "down");
    };
    this.toggleHide.onclick = () => {

    }
    this.toggleCollapse.onclick = () => {

    }
  }
}

customElements.define("track-row", TrackRow);
