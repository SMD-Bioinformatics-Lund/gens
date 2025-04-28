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
  private defaultAnnots: string[];
  private onAnnotationChanged: (sources: string[]) => void;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    this.choiceSelect = this.root.querySelector("#choice-select");
  }

  initialize(
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: string[],
    onAnnotationChanged: (sources: string[]) => void,
  ) {
    console.log("Initialized");
    this.annotationSources = annotationSources;
    this.defaultAnnots = defaultAnnots;
    this.onAnnotationChanged = onAnnotationChanged;

    this.choiceSelect.setChoices(
      getChoices(this.annotationSources, this.defaultAnnots),
    );
  }

  getAnnotSources(): { id: string; label: string }[] {
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
  defaultAnnots: string[],
): InputChoice[] {
  const choices: InputChoice[] = [];
  for (const source of annotationSources) {
    const choice = {
      value: source.track_id,
      label: source.name,
      selected: defaultAnnots.includes(source.name),
    };
    choices.push(choice);
  }
  return choices;
}

customElements.define("settings-page", SettingsPage);
