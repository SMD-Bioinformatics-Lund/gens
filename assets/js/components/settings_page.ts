import { ChoiceSelect } from "./util/choice_select";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import Choices, { EventChoice, InputChoice } from "choices.js";
// import "choices.js/public/assets/styles/choices.min.css";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <div>Annotation sources</div>
  <div class="choices-container">
    <choice-select id="choice-select"></choice-select>
  </div>
`;

export class SettingsPage extends ShadowBaseElement {
  private choiceSelect: ChoiceSelect;
  private annotationSources: ApiAnnotationTrack[];
  private defaultAnnots: {id: string, label: string}[];
  private onAnnotationChanged: (sources: string[]) => void;

  public isInitialized: boolean = false;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    this.choiceSelect = this.root.querySelector("#choice-select");
  }

  // Data 
  setSources(
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: {id: string, label: string}[],
    onAnnotationChanged: (sources: string[]) => void,
  ) {
    this.annotationSources = annotationSources;
    this.defaultAnnots = defaultAnnots;
    this.onAnnotationChanged = onAnnotationChanged;
  }

  initialize(
  ) {
    this.isInitialized = true;
    this.choiceSelect.setChoices(
      getChoices(this.annotationSources, this.defaultAnnots.map((a) => a.id)),
    );
    this.choiceSelect.initialize(this.onAnnotationChanged);
  }

  getAnnotSources(): {id: string, label: string}[] {
    if (this.choiceSelect == null) {
      return this.defaultAnnots;
    }
    const choices = this.choiceSelect.getChoices();
    // return choices.map((choice) => choice.value);
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
