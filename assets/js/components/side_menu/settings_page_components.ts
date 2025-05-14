import { SIZES } from "../../constants";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    .row {
      display: flex;
      flex-direction: "row";
      align-items: "center";
      justify-content: "space-between";
    }
    .button {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: ${SIZES.s}px;
    }
  </style>
  <div class="row">
    <div id="label"></div>
    <div class="row">
      <button id="up" class="button"></button>
      <button id="down" class="button"></button>
      <button id="hide" class="button"></button>
      <button id="collapse" class="button"></button>
    </div>
  </div>
`;

export class TrackEntry extends ShadowBaseElement {
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

  setup(
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

    this.up = this.root.querySelector("#up");
    this.down = this.root.querySelector("#down");
    this.toggleHide = this.root.querySelector("#hide");
    this.toggleCollapse = this.root.querySelector("#collapse");

    this.up.click = () => {
      this.onMove(this.track, "up");
    };
    this.down.click = () => {
      this.onMove(this.track, "down");
    };
    this.toggleHide.click = () => {

    }
    this.toggleCollapse.click = () => {
      
    }
  }
}

customElements.define("track-entry", TrackEntry);
