import { ShadowBaseElement } from "./util/shadowbaseelement";
import Choices, { EventChoice, InputChoice } from "choices.js";
import "choices.js/public/assets/styles/choices.min.css";

const template = document.createElement("template");
template.innerHTML = String.raw`
<style>
    /* import Choices’ styles so they apply inside shadow root */
    @import url("https://cdnjs.cloudflare.com/ajax/libs/choices.js/10.2.0/styles/choices.min.css");
  </style>

  <p>Hello world</p>
  <div class="choices-container">
    <select id="source-list" multiple></select>
  </div>
`;

export class SettingsPage extends ShadowBaseElement {
  private selectElement: HTMLSelectElement;
  private annotationSelectChoices: Choices;
  private choices: InputChoice[];

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    this.selectElement = this.root.querySelector(
      "#source-list",
    ) as HTMLSelectElement;

    this.annotationSelectChoices = new Choices(this.selectElement, {
      placeholderValue: "Choose annotation",
      removeItemButton: true,
      itemSelectText: "",
    });

    this.annotationSelectChoices.setChoices(this.choices);

    this.selectElement.addEventListener("change", async () => {
      const selectedSources = this.annotationSelectChoices.getValue(
        true,
      ) as string[];

      // onAnnotationChanged(selectedSources);
    });
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

  initialize(
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: string[],
    onAnnotationChanged: (sources: string[]) => void,
  ) {

    const choices: InputChoice[] = [];
    for (const source of annotationSources) {
      const choice = {
        value: source.track_id,
        label: source.name,
        selected: defaultAnnots.includes(source.name),
      };
      choices.push(choice);
    }
    this.choices = choices;
    // this.annotationSelectChoices.setChoices(choices);


  }
}

customElements.define("settings-page", SettingsPage);
