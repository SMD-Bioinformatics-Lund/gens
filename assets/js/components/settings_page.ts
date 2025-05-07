import { COLORS, ICONS, SIZES } from "../constants";
import { removeChildren } from "../util/utils";
import { DataTrack } from "./tracks/base_tracks/data_track";
import { ChoiceSelect } from "./util/choice_select";
import { getIconButton } from "./util/menu_utils";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import { InputChoice } from "choices.js";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    .header {
      padding-top: ${SIZES.xs}px;
    }
    .row {
      display: flex;
      flex-direction: row;
      padding-top: ${SIZES.xxs}px;
      align-items: center;
    }
    .icon-button {
      height: ${SIZES.l}px;
      width: ${SIZES.l}px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
    }
    .icon-button:hover {
      background: ${COLORS.extraLightGray};
    }
    /* FIXME: Nicer button response colors */
    .icon-button:active {
      background: ${COLORS.lightGray};
    }
  </style>
  <div class="header">Annotation sources</div>
  <div class="choices-container">
    <choice-select id="choice-select"></choice-select>
  </div>
  <div class="header">Tracks</div>
  <div id="tracks-overview"></div>
`;

export class SettingsPage extends ShadowBaseElement {
  private onChange: () => void;
  private choiceSelect: ChoiceSelect;
  private annotationSources: ApiAnnotationTrack[];
  private defaultAnnots: { id: string; label: string }[];
  private onAnnotationChanged: (sources: string[]) => void;
  private getDataTracks: () => DataTrack[];
  private onTrackMove: (trackId: string, direction: "up" | "down") => void;
  private tracksOverview: HTMLDivElement;

  public isInitialized: boolean = false;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    this.choiceSelect = this.root.querySelector(
      "#choice-select",
    ) as ChoiceSelect;
    this.tracksOverview = this.root.querySelector(
      "#tracks-overview",
    ) as HTMLDivElement;
  }

  initialize(renderCallback: (settings: RenderSettings) => void) {
    this.isInitialized = true;
    this.choiceSelect.setChoices(
      getChoices(
        this.annotationSources,
        this.defaultAnnots.map((a) => a.id),
      ),
    );
    this.choiceSelect.initialize(this.onAnnotationChanged);

    renderCallback({});
  }

  render(_settings: RenderSettings) {
    if (this.tracksOverview == null) {
      return;
    }
    removeChildren(this.tracksOverview);
    const tracks = this.getDataTracks();
    const tracksSection = getTracksSection(
      tracks,
      (track: DataTrack, direction: "up" | "down") => {
        this.onTrackMove(track.id, direction);
        this.onChange();
      },
      (track: DataTrack) => {
        track.toggleHidden();
        this.onChange();
      },
      (track: DataTrack) => {
        track.toggleCollapsed();
        this.onChange();
      },
    );
    this.tracksOverview.appendChild(tracksSection);
  }

  setSources(
    onChange: () => void,
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: { id: string; label: string }[],
    onAnnotationChanged: (sources: string[]) => void,
    getDataTracks: () => DataTrack[],
    onTrackMove: (trackId: string, direction: "up" | "down") => void,
  ) {
    this.onChange = onChange;
    this.annotationSources = annotationSources;
    this.defaultAnnots = defaultAnnots;
    this.onAnnotationChanged = onAnnotationChanged;
    this.getDataTracks = getDataTracks;
    this.onTrackMove = onTrackMove;
  }

  getAnnotSources(): { id: string; label: string }[] {
    if (this.choiceSelect == null) {
      return this.defaultAnnots;
    }
    const choices = this.choiceSelect.getChoices();
    const returnVals = choices.map((obj) => {
      return {
        id: obj.value,
        label: obj.label.toString(),
      };
    });
    return returnVals;
  }
}

function getChoices(
  annotationSources: ApiAnnotationTrack[],
  defaultAnnotIds: string[],
): InputChoice[] {
  const choices: InputChoice[] = [];
  for (const source of annotationSources) {
    const choice = {
      value: source.track_id,
      label: source.name,
      selected: defaultAnnotIds.includes(source.track_id),
    };
    choices.push(choice);
  }
  return choices;
}

function getTracksSection(
  tracks: DataTrack[],
  onMove: (track: DataTrack, direction: "up" | "down") => void,
  onToggleShow: (track: DataTrack) => void,
  onToggleCollapse: (track: DataTrack) => void,
): HTMLDivElement {
  const tracksSection = document.createElement("div");

  for (const track of tracks) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    rowDiv.style.display = "flex";
    rowDiv.style.flexDirection = "row";
    rowDiv.style.alignItems = "center";
    rowDiv.style.justifyContent = "space-between";

    rowDiv.appendChild(document.createTextNode(track.label));

    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.flexDirection = "row";
    buttonsDiv.style.flexWrap = "nowrap";
    buttonsDiv.style.gap = `${SIZES.s}px`;

    buttonsDiv.appendChild(
      getIconButton(ICONS.up, "Up", () => onMove(track, "up")),
    );
    buttonsDiv.appendChild(
      getIconButton(ICONS.down, "Down", () => onMove(track, "down")),
    );
    buttonsDiv.appendChild(
      getIconButton(
        track.getIsHidden() ? ICONS.hide : ICONS.show,
        "Show / hide",
        () => onToggleShow(track),
      ),
    );
    buttonsDiv.appendChild(
      getIconButton(
        track.getIsCollapsed() ? ICONS.maximize : ICONS.minimize,
        "Collapse / expand",
        () => onToggleCollapse(track),
      ),
    );

    rowDiv.appendChild(buttonsDiv);

    tracksSection.appendChild(rowDiv);
  }
  return tracksSection;
}

customElements.define("settings-page", SettingsPage);
