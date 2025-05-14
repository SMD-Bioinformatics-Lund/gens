import { COLORS, ICONS, SIZES } from "../../constants";
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
      display: inline-block;
      width: auto;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      background-color: ${COLORS.white};
      cursor: pointer;
      border: 1px solid ${COLORS.lightGray};
      padding: 4px 8px;
      border-radius: 4px;
    }
    .icon-button:hover {
      background: ${COLORS.extraLightGray};
    }
    /* FIXME: Nicer button response colors */
    .icon-button:active {
      background: ${COLORS.lightGray};
    }
    #button-row {
      gap: ${SIZES.s}px;
    }
  </style>
  <g-row id="main-row">
    <div id="label"></div>
    <g-row id="button-row">
      <div id="up" class="icon-button fas ${ICONS.up}"></div>
      <div id="down" class="icon-button fas ${ICONS.down}"></div>
      <div id="hide" class="icon-button fas ${ICONS.show}"></div>
      <div id="collapse" class="icon-button fas ${ICONS.expand}"></div>
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
      this.onToggleShow(this.track);
    }
    this.toggleCollapse.onclick = () => {
      this.onToggleCollapse(this.track);
    }
  }

  render(settings: RenderSettings) {
    this.toggleHide.classList = `icon-button fas ${ICONS.show}`;
    this.toggleCollapse.classList = `icon-button fas ${ICONS.show}`;
  }
}

customElements.define("track-row", TrackRow);
