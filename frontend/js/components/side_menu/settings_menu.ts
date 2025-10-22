import { COLORS, FONT_WEIGHT, ICONS, SIZES } from "../../constants";
import { getSampleFromID, getSampleID, removeChildren } from "../../util/utils";
import { ChoiceSelect } from "../util/choice_select";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { InputChoice } from "choices.js";
import { TrackRow } from "./track_row";
import { SampleRow } from "./sample_row";
import { HighlightRow } from "./highlight_row";
import { IconButton } from "../util/icon_button";
import { GensSession } from "../../state/gens_session";

export interface TrackHeights {
  bandCollapsed: number;
  dotCollapsed: number;
  dotExpanded: number;
}

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    .header {
      font-weight: ${FONT_WEIGHT.header};
    }
    .header-row {
      justify-content: space-between;
      width: 100%;
      padding-top: ${SIZES.m}px;
      padding-bottom: ${SIZES.xs}px;
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
    .height-input {
      max-width: 100px;
    }
    .spread-row {
      justify-content: space-between;
      padding-bottom: ${SIZES.xs}px;
    }
    .height-inputs {
      gap: ${SIZES.xs}px;
    }
    #apply-variant-filter {
      margin-left: ${SIZES.xs}px;
    }
    #samples-header-row {
      gap: ${SIZES.s}px;
    }
    #sample-select {
      min-width: 150px;
      padding-right: ${SIZES.l}px;
    }
    #main-sample-select {
      min-width: 300px;
    }
    #advanced-settings {
      padding-top: ${SIZES.l}px;
      cursor: pointer;
    }
  </style>
  <div class="header-row">
    <div class="header">Annotation sources</div>
  </div>
  <div>
    <choice-select id="annotation-select" multiple></choice-select>
  </div>
  <!-- FIXME: Bring back / unhide when institute question is resolved, i.e. gene lists are interesting in the context of an institute -->
  <div class="header-row" hidden>
    <div class="header">Gene lists</div>
  </div>
  <div hidden>
    <choice-select id="gene-lists-select" multiple></choice-select>
  </div>
  <div class="header-row">
    <div class="header">Color tracks by</div>
  </div>
  <div>
    <choice-select id="color-by-select"></choice-select>
  </div>
  <flex-row class="header-row">
    <div class="header">Samples</div>
    <flex-row id="samples-header-row">
      <choice-select id="sample-select"></choice-select>
      <icon-button id="add-sample" icon="${ICONS.plus}"></icon-button>
    </flex-row>
  </flex-row>
  <div id="samples-overview"></div>

  <flex-row class="header-row">
    <div class="header">Main sample</div>
  </flex-row>
  <flex-row class="spread-row">
    <choice-select id="main-sample-select"></choice-select>
    <icon-button id="apply-main-sample" icon="${ICONS.refresh}" title="Apply main sample selection"></icon-button>
  </flex-row>

  <div class="header-row">
    <div class="header">Highlights</div>
  </div>
  <div id="highlights-overview"></div>

  <details id="advanced-settings">
    <summary>Toggle advanced settings</summary>
    <div class="header-row">
      <div class="header">Configure tracks</div>
    </div>
    <flex-row class="spread-row">
      <div>Band track height</div>
      <flex-row class="height-inputs">
        <input title="Collapsed height" id="band-collapsed-height" class="height-input" type="number" step="5">
      </flex-row>
    </flex-row>
    <flex-row class="spread-row">
      <div>Dot track heights</div>
      <flex-row class="height-inputs">
        <input title="Collapsed height" id="dot-collapsed-height" class="height-input" type="number" step="5">
        <input title="Expanded height" id="dot-expanded-height" class="height-input" type="number" step="5">
      </flex-row>
    </flex-row>
    <flex-row class="spread-row">
      <div>Default cov y-range</div>
      <flex-row class="height-inputs">
        <input id="coverage-y-start" class="height-input" type="number" step="0.1">
        <input id="coverage-y-end" class="height-input" type="number" step="0.1">
        <icon-button id="apply-default-cov-y-range" icon="${ICONS.refresh}" title="Apply coverage Y-range"></icon-button>
      </flex-row>
    </flex-row>
    <flex-row class="spread-row">
      <div>Variant filter threshold</div>
      <flex-row>
        <input id="variant-filter" type="number" step="1" class="height-input">
        <icon-button id="apply-variant-filter" icon="${ICONS.refresh}" title="Apply variant filter"></icon-button>
      </flex-row>
    </flex-row>
    <div class="header-row">
      <div class="header">Tracks overview</div>
    </div>
    <div id="tracks-overview"></div>
  </details>
`;

export class SettingsMenu extends ShadowBaseElement {
  private samplesOverview: HTMLDivElement;
  private tracksOverview: HTMLDivElement;
  private highlightsOverview: HTMLDivElement;
  private annotSelect: ChoiceSelect;
  private geneListSelect: ChoiceSelect;
  private colorBySelect: ChoiceSelect;
  private sampleSelect: ChoiceSelect;
  private mainSampleSelect: ChoiceSelect;
  private addSampleButton: IconButton;
  private bandTrackCollapsedHeightElem: HTMLInputElement;
  private dotTrackCollapsedHeightElem: HTMLInputElement;
  private dotTrackExpandedHeightElem: HTMLInputElement;
  private coverageYStartElem: HTMLInputElement;
  private coverageYEndElem: HTMLInputElement;

  private applyDefaultCovYRange: HTMLButtonElement;
  private variantThreshold: HTMLInputElement;
  private applyVariantFilter: HTMLButtonElement;
  private applyMainSample: HTMLButtonElement;

  private session: GensSession;

  private allAnnotationSources: ApiAnnotationTrack[];
  private geneLists: ApiGeneList[];
  private onTrackMove: (trackId: string, direction: "up" | "down") => void;
  private getCurrentSamples: () => Sample[];
  private getAllSamples: () => Sample[];
  private getHighlights: () => RangeHighlight[];
  private gotoHighlight: (region: Region) => void;
  private removeHighlight: (id: string) => void;
  private onAddSample: (sample: Sample) => Promise<void>;
  private onRemoveSample: (sample: Sample) => void;
  private getTrackHeights: () => TrackHeights;
  private setTrackHeights: (sizes: TrackHeights) => void;
  private onColorByChange: (annotId: string | null) => void;
  private getColorAnnotation: () => string | null;
  private onApplyDefaultCovRange: (rng: Rng) => void;
  private onSetAnnotationSelection: (ids: string[]) => void;
  private onSetGeneListSelection: (ids: string[]) => void;
  private onSetVariantThreshold: (threshold: number) => void;
  private onToggleTrackHidden: (trackId: string) => void;
  private onToggleTrackExpanded: (trackId: string) => void;
  private onApplyMainSample: (sample: Sample) => void;

  public isInitialized: boolean = false;

  constructor() {
    super(template);
  }

  setSources(
    session: GensSession,
    allAnnotationSources: ApiAnnotationTrack[],
    onTrackMove: (trackId: string, direction: "up" | "down") => void,
    getAllSamples: () => Sample[],
    gotoHighlight: (region: Region) => void,
    onAddSample: (sample: Sample) => Promise<void>,
    onRemoveSample: (sample: Sample) => void,
    setTrackInfo: (trackHeights: TrackHeights) => void,
    onColorByChange: (annotId: string | null) => void,
    onApplyDefaultCovRange: (rng: Rng) => void,
    onSetAnnotationSelection: (ids: string[]) => void,
    onSetGeneListSelection: (ids: string[]) => void,
    onSetVariantThreshold: (threshold: number) => void,
    onToggleTrackHidden: (trackId: string) => void,
    onToggleTrackExpanded: (trackId: string) => void,
    onApplyMainSample: (sample: Sample) => void,
  ) {
    this.session = session;
    // this.onChange = onChange;
    this.allAnnotationSources = allAnnotationSources;

    this.onTrackMove = onTrackMove;

    this.getCurrentSamples = () => session.getSamples();
    this.getAllSamples = getAllSamples;
    this.getHighlights = () => session.getAllHighlights();

    this.gotoHighlight = gotoHighlight;
    this.removeHighlight = (id: string) => {
      session.removeHighlight(id);
    };
    this.onAddSample = onAddSample;
    this.onRemoveSample = onRemoveSample;

    this.getTrackHeights = () => session.getTrackHeights();
    this.setTrackHeights = setTrackInfo;
    this.onColorByChange = onColorByChange;
    this.getColorAnnotation = () => session.getColorAnnotation();

    this.onApplyDefaultCovRange = onApplyDefaultCovRange;

    this.onSetAnnotationSelection = onSetAnnotationSelection;
    this.onSetGeneListSelection = onSetGeneListSelection;
    this.onSetVariantThreshold = onSetVariantThreshold;
    this.onToggleTrackHidden = onToggleTrackHidden;
    this.onToggleTrackExpanded = onToggleTrackExpanded;
    this.onApplyMainSample = onApplyMainSample;
  }

  connectedCallback() {
    super.connectedCallback();
    this.annotSelect = this.root.querySelector("#annotation-select");
    this.geneListSelect = this.root.querySelector("#gene-lists-select");
    this.colorBySelect = this.root.querySelector("#color-by-select");
    this.sampleSelect = this.root.querySelector("#sample-select");
    this.mainSampleSelect = this.root.querySelector("#main-sample-select");
    this.tracksOverview = this.root.querySelector("#tracks-overview");
    this.samplesOverview = this.root.querySelector("#samples-overview");
    this.highlightsOverview = this.root.querySelector("#highlights-overview");
    this.addSampleButton = this.root.querySelector("#add-sample");
    this.applyDefaultCovYRange = this.root.querySelector(
      "#apply-default-cov-y-range",
    );
    this.applyVariantFilter = this.root.querySelector("#apply-variant-filter");
    this.variantThreshold = this.root.querySelector("#variant-filter");
    this.applyMainSample = this.root.querySelector("#apply-main-sample");

    this.bandTrackCollapsedHeightElem = this.root.querySelector(
      "#band-collapsed-height",
    );
    this.dotTrackCollapsedHeightElem = this.root.querySelector(
      "#dot-collapsed-height",
    );
    this.dotTrackExpandedHeightElem = this.root.querySelector(
      "#dot-expanded-height",
    );
    this.coverageYStartElem = this.root.querySelector("#coverage-y-start");
    this.coverageYEndElem = this.root.querySelector("#coverage-y-end");

    const trackSizes = this.getTrackHeights();

    const coverageRange = this.session.getCoverageRange();

    this.bandTrackCollapsedHeightElem.value = `${trackSizes.bandCollapsed}`;
    this.dotTrackCollapsedHeightElem.value = `${trackSizes.dotCollapsed}`;
    this.dotTrackExpandedHeightElem.value = `${trackSizes.dotExpanded}`;
    this.coverageYStartElem.value = `${coverageRange[0]}`;
    this.coverageYEndElem.value = `${coverageRange[1]}`;
    this.variantThreshold.value = `${this.session.getVariantThreshold()}`;

    this.addElementListener(this.addSampleButton, "click", () => {
      const caseId_sampleId = this.sampleSelect.getValue().value;
      const sample = getSampleFromID(caseId_sampleId);
      this.onAddSample(sample);
    });

    this.addElementListener(this.applyMainSample, "click", () => {
      const mainSample = this.mainSampleSelect.getValue().value;
      const samples = this.getCurrentSamples();
      const targetSample = samples.find((sample) => {
        return getSampleID(sample) == mainSample;
      });
      this.onApplyMainSample(targetSample);
    });

    this.addElementListener(this.annotSelect, "change", () => {
      const ids = this.annotSelect
        .getValues()
        .map((obj) => obj.value as string);
      this.onSetAnnotationSelection(ids);
    });

    this.addElementListener(this.colorBySelect, "change", () => {
      const val = this.colorBySelect.getValue();
      const id = val && val.value != "" ? val.value : null;
      this.onColorByChange(id);
    });

    this.addElementListener(this.geneListSelect, "change", () => {
      const ids = this.geneListSelect
        .getValues()
        .map((obj) => obj.value as string);
      this.onSetGeneListSelection(ids);
    });

    this.addElementListener(this.sampleSelect, "change", () => {
      this.render({});
    });

    const myGetTrackHeights = (): TrackHeights => {
      return {
        bandCollapsed: parseInt(this.bandTrackCollapsedHeightElem.value),
        dotCollapsed: parseInt(this.dotTrackCollapsedHeightElem.value),
        dotExpanded: parseInt(this.dotTrackExpandedHeightElem.value),
      };
    };

    const getCovRange = (): [number, number] => [
      parseFloat(this.coverageYStartElem.value),
      parseFloat(this.coverageYEndElem.value),
    ];

    this.addElementListener(this.bandTrackCollapsedHeightElem, "change", () => {
      this.setTrackHeights(myGetTrackHeights());
      this.render({});
    });
    this.addElementListener(this.dotTrackCollapsedHeightElem, "change", () => {
      this.setTrackHeights(myGetTrackHeights());
      this.render({});
    });
    this.addElementListener(this.dotTrackExpandedHeightElem, "change", () => {
      this.setTrackHeights(myGetTrackHeights());
      this.render({});
    });

    this.addElementListener(this.coverageYStartElem, "change", () => {
      this.session.setCoverageRange(getCovRange());
    });
    this.addElementListener(this.coverageYEndElem, "change", () => {
      this.session.setCoverageRange(getCovRange());
    });

    this.addElementListener(this.applyDefaultCovYRange, "click", () => {
      const defaultCovStart = Number.parseFloat(this.coverageYStartElem.value);
      const defaultCovEnd = Number.parseFloat(this.coverageYEndElem.value);
      this.onApplyDefaultCovRange([defaultCovStart, defaultCovEnd]);
    });

    this.addElementListener(this.applyVariantFilter, "click", () => {
      const variantThreshold = Number.parseInt(this.variantThreshold.value);
      this.onSetVariantThreshold(variantThreshold);
    });
  }

  initialize() {
    this.isInitialized = true;
    const prevSelectedAnnots = this.session.getAnnotationSelections();
    this.annotSelect.setValues(
      getAnnotationChoices(this.allAnnotationSources, prevSelectedAnnots),
    );

    const allAnnotChoices = getAnnotationChoices(this.allAnnotationSources, []);
    const colorChoices = [
      { label: "None", value: "", selected: this.getColorAnnotation() == null },
      ...allAnnotChoices.map((c) => ({
        ...c,
        selected: c.value === this.getColorAnnotation(),
      })),
    ];
    this.colorBySelect.setValues(colorChoices);
    this.setupSampleSelect();
  }

  private setupSampleSelect() {
    const rawSamples = this.getAllSamples();
    const allSamples = rawSamples.map((s) => {
      return {
        label: `${s.sampleId} (case: ${s.caseId})`,
        value: getSampleID(s),
      };
    });
    this.sampleSelect.setValues(allSamples);
  }

  render(settings: RenderSettings) {
    if (this.tracksOverview == null) {
      return;
    }

    if (settings.samplesUpdated) {
      this.setupSampleSelect();
    }

    removeChildren(this.tracksOverview);
    const tracksSection = getTracksSection(
      this.session.tracks.getTracks(),
      (trackId: string, direction: "up" | "down") => {
        this.onTrackMove(trackId, direction);
      },
      (trackId: string) => {
        this.onToggleTrackHidden(trackId);
      },
      (trackId: string) => {
        this.onToggleTrackExpanded(trackId);
      },
    );
    this.tracksOverview.appendChild(tracksSection);

    const samples = this.getCurrentSamples();
    removeChildren(this.samplesOverview);
    const samplesSection = getSamplesSection(samples, (sample: Sample) =>
      this.onRemoveSample(sample),
    );
    this.samplesOverview.appendChild(samplesSection);

    const mainSample = this.session.getMainSample();
    const mainSampleId = getSampleID(mainSample);
    const mainSampleChoices = getMainSampleChoices(samples, mainSampleId);
    this.mainSampleSelect.setValues(mainSampleChoices);

    removeChildren(this.highlightsOverview);
    const highlightsSection = getHighlightsSection(
      this.getHighlights(),
      (region: Region) => this.gotoHighlight(region),
      (id: string) => this.removeHighlight(id),
    );
    this.highlightsOverview.appendChild(highlightsSection);

    this.addSampleButton.disabled = this.sampleSelect.getValue() == null;

    const { bandCollapsed, dotCollapsed, dotExpanded } = this.getTrackHeights();
    const [covStart, covEnd] = this.session.getCoverageRange();
    this.bandTrackCollapsedHeightElem.value = `${bandCollapsed}`;
    this.dotTrackCollapsedHeightElem.value = `${dotCollapsed}`;
    this.dotTrackExpandedHeightElem.value = `${dotExpanded}`;
    this.coverageYStartElem.value = `${covStart}`;
    this.coverageYEndElem.value = `${covEnd}`;
    if (this.colorBySelect) {
      const selectedAnnotation = this.getColorAnnotation();
      const selectedId = selectedAnnotation != null ? selectedAnnotation : "";
      const choices = this.allAnnotationSources.map((source) => {
        return {
          value: source.track_id,
          label: source.name,
          selected: source.track_id === selectedId,
        };
      });
      choices.unshift({
        label: "None",
        value: "",
        selected: selectedId === "",
      });
      this.colorBySelect.setValues(choices);
    }
  }
}

//   getGeneListSources(settings: {
//     selectedOnly: boolean;
//   }): { id: string; label: string }[] {
//     const sources = parseSources(
//       this.geneLists,
//       this.geneListSelect,
//       settings.selectedOnly,
//       this.session.getGeneListSelections(),
//       (source) => source.id,
//       (source) => `${source.name} + ${source.version}`,
//     );
//     return sources;
//   }

function getMainSampleChoices(
  samples: Sample[],
  prevSelected: string | null,
): InputChoice[] {
  const choices: InputChoice[] = [];
  for (const sample of samples) {
    const id = getSampleID(sample);
    const choice = {
      value: id,
      label: `${sample.sampleId} (${sample.sampleType}, case: ${sample.caseId})`,
      selected: prevSelected == id,
    };
    choices.push(choice);
  }
  return choices;
}

function getAnnotationChoices(
  annotationSources: ApiAnnotationTrack[],
  prevSelected: string[],
): InputChoice[] {
  const choices: InputChoice[] = [];
  for (const source of annotationSources) {
    const choice = {
      value: source.track_id,
      label: source.name,
      selected: prevSelected.includes(source.track_id),
    };
    choices.push(choice);
  }
  return choices.sort((source1, source2) =>
    source1.label.toString().localeCompare(source2.label.toString()),
  );
}

function getSamplesSection(
  samples: Sample[],
  removeSample: (sample: Sample) => void,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = `${SIZES.xs}px`;

  for (const sample of samples) {
    const sampleRow = new SampleRow();
    sampleRow.initialize(sample, removeSample);
    container.appendChild(sampleRow);
  }

  return container;
}

function getHighlightsSection(
  highlights: RangeHighlight[],
  onGotoHighlight: (region: Region) => void,
  onRemoveHighlight: (id: string) => void,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = `${SIZES.xs}px`;

  if (highlights.length > 0) {
    for (const highlight of highlights) {
      const highlightRow = new HighlightRow();
      highlightRow.initialize(highlight, onGotoHighlight, onRemoveHighlight);
      container.appendChild(highlightRow);
    }
  } else {
    const placeholder = document.createTextNode(
      "No highlights currently active",
    );
    container.appendChild(placeholder);
  }

  return container;
}

function getTracksSection(
  tracks: DataTrackSettings[],
  onMove: (trackId: string, direction: "up" | "down") => void,
  onToggleShow: (trackId: string) => void,
  onToggleCollapse: (trackId: string) => void,
): HTMLDivElement {
  const tracksSection = document.createElement("div");

  for (const track of tracks) {
    const trackRow = document.createElement("track-row") as TrackRow;
    trackRow.className = "row";
    trackRow.initialize(
      track,
      onMove,
      onToggleShow,
      onToggleCollapse,
      () => track.isHidden,
      () => track.isExpanded,
    );
    tracksSection.appendChild(trackRow);
  }
  return tracksSection;
}

customElements.define("settings-page", SettingsMenu);
