import { COLORS, FONT_WEIGHT, ICONS, SIZES } from "../../constants";
import { removeChildren } from "../../util/utils";
import { DataTrack } from "../tracks/base_tracks/data_track";
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
    .height-row {
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
  </style>
  <div class="header-row">
    <div class="header">Annotation sources</div>
  </div>
  <div>
    <choice-select id="annotation-select" multiple></choice-select>
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
  <div class="header-row">
    <div class="header">Highlights</div>
  </div>
  <div id="highlights-overview"></div>
  <div class="header-row">
    <div class="header">Tracks</div>
  </div>
  <flex-row class="height-row">
    <div>Band track height</div>
    <flex-row class="height-inputs">
      <input title="Collapsed height" id="band-collapsed-height" class="height-input" type="number" step="5">
    </flex-row>
  </flex-row>
  <flex-row class="height-row">
    <div>Dot track heights</div>
    <flex-row class="height-inputs">
      <input title="Collapsed height" id="dot-collapsed-height" class="height-input" type="number" step="5">
      <input title="Expanded height" id="dot-expanded-height" class="height-input" type="number" step="5">
    </flex-row>
  </flex-row>
  <flex-row class="height-row">
    <div>Default cov y-range</div>
    <flex-row class="height-inputs">
      <input id="coverage-y-start" class="height-input" type="number" step="0.1">
      <input id="coverage-y-end" class="height-input" type="number" step="0.1">
      <icon-button id="apply-default-cov-y-range" icon="${ICONS.refresh}" title="Apply coverage Y-range"></icon-button>
    </flex-row>
  </flex-row>
  <flex-row class="height-row">
    <div>Variant filter</div>
    <flex-row>
      <input id="variant-filter" type="number" step="1" class="height-input">
      <icon-button id="apply-variant-filter" icon="${ICONS.refresh}" title="Apply variant filter"></icon-button>
    </flex-row>
  </flex-row>
  <div id="tracks-overview"></div>
`;

export class SettingsMenu extends ShadowBaseElement {
  private samplesOverview: HTMLDivElement;
  private tracksOverview: HTMLDivElement;
  private highlightsOverview: HTMLDivElement;
  private annotSelect: ChoiceSelect;
  private colorBySelect: ChoiceSelect;
  private sampleSelect: ChoiceSelect;
  private addSampleButton: IconButton;
  private bandTrackCollapsedHeightElem: HTMLInputElement;
  private dotTrackCollapsedHeightElem: HTMLInputElement;
  private dotTrackExpandedHeightElem: HTMLInputElement;
  private coverageYStartElem: HTMLInputElement;
  private coverageYEndElem: HTMLInputElement;

  private applyDefaultCovYRange: HTMLButtonElement;
  private rankScoreThres: HTMLInputElement;
  private applyVariantFilter: HTMLButtonElement;

  private session: GensSession;

  private onChange: () => void;
  private allAnnotationSources: ApiAnnotationTrack[];
  private defaultAnnots: { id: string; label: string }[];
  private getDataTracks: () => DataTrack[];
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
  private setCovRange: (rng: Rng) => void;
  private onColorByChange: (annotId: string | null) => void;
  private getColorAnnotation: () => string | null;

  private onApplyVariantFilter: (threshold: number) => void;
  private onApplyDefaultCovRange: (rng: Rng) => void;

  public isInitialized: boolean = false;

  constructor() {
    super(template);
  }

  setSources(
    session: GensSession,
    onChange: () => void,
    allAnnotationSources: ApiAnnotationTrack[],
    defaultAnnots: { id: string; label: string }[],
    getDataTracks: () => DataTrack[],
    onTrackMove: (trackId: string, direction: "up" | "down") => void,
    getAllSamples: () => Sample[],
    gotoHighlight: (region: Region) => void,
    onAddSample: (sample: Sample) => Promise<void>,
    onRemoveSample: (sample: Sample) => void,
    setTrackInfo: (trackHeights: TrackHeights) => void,
    onColorByChange: (annotId: string | null) => void,
    onApplyVariantFilter: (threshold: number) => void,
    onApplyDefaultCovRange: (rng: Rng) => void,
  ) {
    this.session = session;
    this.onChange = onChange;
    this.allAnnotationSources = allAnnotationSources;
    const stored = session.getAnnotationSelections();
    if (stored && stored.length > 0) {
      defaultAnnots = allAnnotationSources
        .filter((src) => stored.includes(src.track_id))
        .map((src) => ({ id: src.track_id, label: src.name }));
    }
    this.defaultAnnots = defaultAnnots;
    this.getDataTracks = getDataTracks;
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

    this.onApplyVariantFilter = onApplyVariantFilter;
    this.onApplyDefaultCovRange = onApplyDefaultCovRange;
  }

  connectedCallback() {
    super.connectedCallback();
    this.annotSelect = this.root.querySelector("#annotation-select");
    this.colorBySelect = this.root.querySelector("#color-by-select");
    this.sampleSelect = this.root.querySelector("#sample-select");
    this.tracksOverview = this.root.querySelector("#tracks-overview");
    this.samplesOverview = this.root.querySelector("#samples-overview");
    this.highlightsOverview = this.root.querySelector("#highlights-overview");
    this.addSampleButton = this.root.querySelector("#add-sample");
    this.applyDefaultCovYRange = this.root.querySelector(
      "#apply-default-cov-y-range",
    );
    this.applyVariantFilter = this.root.querySelector("#apply-variant-filter");
    this.rankScoreThres = this.root.querySelector("#variant-filter");

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
    // FIXME: Read from session
    console.log("Variant filter", this.applyVariantFilter);

    this.rankScoreThres.value = `10`;

    this.addElementListener(this.addSampleButton, "click", () => {
      const caseId_sampleId = this.sampleSelect.getValue().value;
      const [caseId, sampleId] = caseId_sampleId.split("_");
      this.onAddSample({ caseId, sampleId });
    });

    this.addElementListener(this.annotSelect, "change", () => {
      const ids = this.annotSelect
        .getValues()
        .map((obj) => obj.value as string);
      this.session.setAnnotationSelections(ids);
      this.onChange();
    });

    this.addElementListener(this.colorBySelect, "change", () => {
      const val = this.colorBySelect.getValue();
      const id = val && val.value != "" ? val.value : null;
      this.onColorByChange(id);
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
      console.log("Event 1");
      const defaultCovStart = Number.parseFloat(this.coverageYStartElem.value);
      const defaultCovEnd = Number.parseFloat(this.coverageYEndElem.value);
      this.onApplyDefaultCovRange([defaultCovStart, defaultCovEnd]);
    });

    this.addElementListener(this.applyVariantFilter, "click", () => {
      console.log("Event 2");
      const variantFilter = Number.parseInt(this.rankScoreThres.value);
      this.onApplyVariantFilter(variantFilter);
    });
  }

  initialize() {
    this.isInitialized = true;
    this.annotSelect.setValues(
      getAnnotationChoices(
        this.allAnnotationSources,
        this.defaultAnnots.map((a) => a.id),
      ).sort((source1, source2) =>
        source1.label.toString().localeCompare(source2.label.toString()),
      ),
    );
    const colorChoices = [
      { label: "None", value: "", selected: this.getColorAnnotation() == null },
      ...getAnnotationChoices(this.allAnnotationSources, []).map((c) => ({
        ...c,
        selected: c.value === this.getColorAnnotation(),
      })),
    ];
    this.colorBySelect.setValues(colorChoices);
    this.setupSampleSelect();
    this.session.setAnnotationSelections(this.defaultAnnots.map((a) => a.id));
    this.onChange();
  }

  private setupSampleSelect() {
    const rawSamples = this.getAllSamples();
    const allSamples = rawSamples.map((s) => {
      return {
        label: `${s.sampleId} (case: ${s.caseId})`,
        value: `${s.caseId}_${s.sampleId}`,
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
    const tracks = this.getDataTracks();
    // FIXME: Could part of this simply be part of the template?
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
        track.toggleExpanded();
        this.onChange();
      },
    );
    this.tracksOverview.appendChild(tracksSection);

    const samples = this.getCurrentSamples();
    removeChildren(this.samplesOverview);
    const samplesSection = getSamplesSection(samples, (sample: Sample) =>
      this.onRemoveSample(sample),
    );
    this.samplesOverview.appendChild(samplesSection);

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
      const val = this.colorBySelect.getValue();
      const selectedId = val ? val.value : "";
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

  getAnnotSources(settings: {
    selectedOnly: boolean;
  }): { id: string; label: string }[] {
    if (!settings.selectedOnly) {
      return this.allAnnotationSources.map((source) => {
        return {
          id: source.track_id,
          label: source.name,
        };
      });
    }

    if (this.annotSelect == null) {
      return this.defaultAnnots;
    }

    const choices = this.annotSelect.getValues();
    const returnVals = choices.map((obj) => {
      return {
        id: obj.value,
        label: obj.label.toString(),
      };
    });
    return returnVals;
  }

  public getRankScoreThres(): number {
    return Number.parseInt(this.rankScoreThres.value);
  }
}

function getAnnotationChoices(
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
  tracks: DataTrack[],
  onMove: (track: DataTrack, direction: "up" | "down") => void,
  onToggleShow: (track: DataTrack) => void,
  onToggleCollapse: (track: DataTrack) => void,
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
      () => track.getIsHidden(),
      () => track.getIsExpanded(),
    );
    tracksSection.appendChild(trackRow);
  }
  return tracksSection;
}

customElements.define("settings-page", SettingsMenu);
