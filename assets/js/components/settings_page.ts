import { ChoiceSelect } from "./util/choice_select";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import Choices, { EventChoice, InputChoice } from "choices.js";
// import "choices.js/public/assets/styles/choices.min.css";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <p>Hello world</p>
  <div class="choices-container">
    <choice-select id="choice-select"></choice-select>
    <!-- <select id="source-list" multiple>
      <option value="volvo">Volvo</option>
      <option value="saab">Saab</option>
      <option value="mercedes">Mercedes</option>
      <option value="audi">Audi</option>
    </select> -->
  </div>
`;

export class SettingsPage extends ShadowBaseElement {
  private selectElement: HTMLSelectElement;
  private annotationSelectChoices: Choices;
  private choices: InputChoice[];

  private choiceSelect: ChoiceSelect;

  private annotationSources: ApiAnnotationTrack[];
  private defaultAnnots: string[];
  private onAnnotationChanged: (sources: string[]) => void;

  constructor() {
    super(template);
    // this.selectElement = this.root.querySelector("#source-list");
    this.choiceSelect = this.root.querySelector("#choice-select");
  }

  initialize(
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: string[],
    onAnnotationChanged: (sources: string[]) => void,
  ) {
    this.annotationSources = annotationSources;
    this.defaultAnnots = defaultAnnots;    
    this.onAnnotationChanged = onAnnotationChanged;
  }

  hasSetup = false;

  connectedCallback() {

    // if (!this.hasSetup) {
    //   // this.appendChild(template.content.cloneNode(true));

    //   // this.annotationSelectChoices = new Choices(this.selectElement, {
    //   //   placeholderValue: "Choose annotation",
    //   //   removeItemButton: true,
    //   //   itemSelectText: "",
    //   // });  
    //   this.hasSetup = true;
    // }

    // if (this.annotationSources == null) {
    //   throw Error("Must be initialized before being connected")
    // }

    // console.log(this.selectElement);

    // const choices: InputChoice[] = [];
    // for (const source of this.annotationSources) {
    //   const choice = {
    //     value: source.track_id,
    //     label: source.name,
    //     selected: this.defaultAnnots.includes(source.name),
    //   };
    //   choices.push(choice);
    // }
    // this.choices = choices;
    // this.annotationSelectChoices.setChoices(choices);

    // this.annotationSelectChoices.setChoices(this.choices);

    // this.selectElement.addEventListener("change", async () => {
    //   const selectedSources = this.annotationSelectChoices.getValue(
    //     true,
    //   ) as string[];

    //   // onAnnotationChanged(selectedSources);
    // });
  }

  getAnnotSources(): { id: string; label: string }[] {
    const selectedObjs =
      this.annotationSelectChoices.getValue() as EventChoice[];
    const returnVals = selectedObjs.map((obj) => {
      return {
        id: obj.value,
        label: obj.label.toString(),
      };
    });
    return returnVals;
  }


}

customElements.define("settings-page", SettingsPage);
