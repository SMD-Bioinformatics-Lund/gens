import { DataTrack } from "./tracks/base_tracks/data_track";
import { getButton } from "./tracks_manager";
import { ChoiceSelect } from "./util/choice_select";
import { getContainer } from "./util/menu_utils";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import { InputChoice } from "choices.js";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <div>Annotation sources</div>
  <div class="choices-container">
    <choice-select id="choice-select"></choice-select>
  </div>
  <div>Tracks</div>
  <div id="tracks-overview"></div>
`;

export class SettingsPage extends ShadowBaseElement {
  private choiceSelect: ChoiceSelect;
  private annotationSources: ApiAnnotationTrack[];
  private defaultAnnots: {id: string, label: string}[];
  private onAnnotationChanged: (sources: string[]) => void;
  private getDataTracks: () => DataTrack[];
  private tracksOverview: HTMLDivElement;

  public isInitialized: boolean = false;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    this.choiceSelect = this.root.querySelector("#choice-select") as ChoiceSelect;
    this.tracksOverview = this.root.querySelector("#tracks-overview") as HTMLDivElement;
  }

  initialize(
  ) {
    this.isInitialized = true;
    this.choiceSelect.setChoices(
      getChoices(this.annotationSources, this.defaultAnnots.map((a) => a.id)),
    );
    this.choiceSelect.initialize(this.onAnnotationChanged);

    const tracks = this.getDataTracks();
    for (const track of tracks) {
      const trackDiv = getContainer("row");
      trackDiv.style.display = "flex";
      trackDiv.style.flexDirection = "row";
      trackDiv.style.alignItems = "center";
      trackDiv.appendChild(document.createTextNode(track.label));
      trackDiv.appendChild(getButton("Show", () => {}))
      trackDiv.appendChild(getButton("Hide", () => {}))
      trackDiv.appendChild(getButton("Up", () => {}))
      trackDiv.appendChild(getButton("Down", () => {}))
      this.tracksOverview.appendChild(trackDiv);
    }
  }

  setSources(
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: {id: string, label: string}[],
    onAnnotationChanged: (sources: string[]) => void,
    getDataTracks: () => DataTrack[]
  ) {
    this.annotationSources = annotationSources;
    this.defaultAnnots = defaultAnnots;
    this.onAnnotationChanged = onAnnotationChanged;
    this.getDataTracks = getDataTracks;
  }

  getAnnotSources(): {id: string, label: string}[] {
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

customElements.define("settings-page", SettingsPage);
