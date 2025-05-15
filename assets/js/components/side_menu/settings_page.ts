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

// FIXME: How to manage the content? Something to do later?

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
    #samples-header-row {
      gap: ${SIZES.s}px;
    }
    #sample-select {
      min-width: 100px;
      padding-right: 10px;
    }
  </style>
  <div class="header-row">
    <div class="header">Annotation sources</div>
  </div>
  <div class="choices-container">
    <choice-select id="choice-select" multiple></choice-select>
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
  <div id="tracks-overview"></div>
`;

export class SettingsPage extends ShadowBaseElement {
  private samplesOverview: HTMLDivElement;
  private tracksOverview: HTMLDivElement;
  private highlightsOverview: HTMLDivElement;
  private annotSelect: ChoiceSelect;
  private sampleSelect: ChoiceSelect;
  private addSampleButton: IconButton;

  private onChange: () => void;
  private annotationSources: ApiAnnotationTrack[];
  private defaultAnnots: { id: string; label: string }[];
  private onAnnotationChanged: (sources: string[]) => void;
  private getDataTracks: () => DataTrack[];
  private onTrackMove: (trackId: string, direction: "up" | "down") => void;

  private getCurrentSamples: () => string[];
  private getAllSamples: () => string[];
  private getHighlights: () => RangeHighlight[];
  private gotoHighlight: (region: Region) => void;
  private removeHighlight: (id: string) => void;

  private onAddSample: (id: string) => void;
  private onRemoveSample: (id: string) => void;

  public isInitialized: boolean = false;

  constructor() {
    super(template);
  }

  setSources(
    onChange: () => void,
    annotationSources: ApiAnnotationTrack[],
    defaultAnnots: { id: string; label: string }[],
    onAnnotationChanged: (sources: string[]) => void,
    getDataTracks: () => DataTrack[],
    onTrackMove: (trackId: string, direction: "up" | "down") => void,
    getCurrentSamples: () => string[],
    getAllSamples: () => string[],
    getHighlights: () => RangeHighlight[],
    gotoHighlight: (region: Region) => void,
    removeHighlight: (id: string) => void,
    onAddSample: (id: string) => void,
    onRemoveSample: (id: string) => void,
  ) {
    this.onChange = onChange;
    this.annotationSources = annotationSources;
    this.defaultAnnots = defaultAnnots;
    this.onAnnotationChanged = onAnnotationChanged;
    this.getDataTracks = getDataTracks;
    this.onTrackMove = onTrackMove;

    this.getCurrentSamples = getCurrentSamples;
    this.getAllSamples = getAllSamples;
    this.getHighlights = getHighlights;

    this.gotoHighlight = gotoHighlight;
    this.removeHighlight = removeHighlight;
    this.onAddSample = onAddSample;
    this.onRemoveSample = onRemoveSample;
  }

  connectedCallback() {
    super.connectedCallback();
    this.annotSelect = this.root.querySelector("#choice-select");
    this.sampleSelect = this.root.querySelector("#sample-select");
    this.tracksOverview = this.root.querySelector("#tracks-overview");
    this.samplesOverview = this.root.querySelector("#samples-overview");
    this.highlightsOverview = this.root.querySelector("#highlights-overview");
    this.addSampleButton = this.root.querySelector("#add-sample");

    this.addElementListener(this.addSampleButton, "click", () => {
      const sampleId = this.sampleSelect.getChoice().value;
      this.onAddSample(sampleId);
    });

    this.addElementListener(this.sampleSelect, "change", () => {
      this.render({});
    });
  }

  initialize() {
    this.isInitialized = true;
    this.annotSelect.setChoices(
      getAnnotationChoices(
        this.annotationSources,
        this.defaultAnnots.map((a) => a.id),
      ),
    );
    this.annotSelect.initialize(this.onAnnotationChanged);

    const samples = this.getAllSamples().map((s) => {
      return {
        label: s,
        value: s,
      };
    });
    const extraSamples = [];
    for (let i = 1; i <= 20000; i++) {
      extraSamples.push({ label: `sample_${i}`, value: `Sample ${i}` });
    }
    samples.push(...extraSamples);
    this.sampleSelect.setChoices(samples);
    // this.sampleSelect.initialize(() => {
    //   console.log("Sample selection changed");
    // });

    this.onChange();
  }

  render(_settings: RenderSettings) {
    if (this.tracksOverview == null) {
      return;
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
        track.toggleCollapsed();
        this.onChange();
      },
    );
    this.tracksOverview.appendChild(tracksSection);

    const samples = this.getCurrentSamples();
    console.log("Current samples", samples);
    removeChildren(this.samplesOverview);
    const samplesSection = getSamplesSection(samples, (sampleId: string) =>
      this.onRemoveSample(sampleId),
    );
    this.samplesOverview.appendChild(samplesSection);

    removeChildren(this.highlightsOverview);
    const highlightsSection = getHighlightsSection(
      this.getHighlights(),
      (region: Region) => this.gotoHighlight(region),
      (id: string) => this.removeHighlight(id),
    );
    this.highlightsOverview.appendChild(highlightsSection);

    this.addSampleButton.disabled = this.sampleSelect.getChoice() == null;
  }

  getAnnotSources(settings: {
    selectedOnly: boolean;
  }): { id: string; label: string }[] {
    if (!settings.selectedOnly) {
      return this.annotationSources.map((source) => {
        return {
          id: source.track_id,
          label: source.name,
        };
      });
    }

    if (this.annotSelect == null) {
      return this.defaultAnnots;
    }

    const choices = this.annotSelect.getChoices();
    const returnVals = choices.map((obj) => {
      return {
        id: obj.value,
        label: obj.label.toString(),
      };
    });
    return returnVals;
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
  sampleIds: string[],
  removeSample: (id: string) => void,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = `${SIZES.xs}px`;

  for (const sampleId of sampleIds) {
    const sampleRow = new SampleRow();
    sampleRow.initialize(sampleId, removeSample);
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
    const trackRow = new TrackRow();
    trackRow.className = "row";
    trackRow.initialize(track, onMove, onToggleShow, onToggleCollapse);
    tracksSection.appendChild(trackRow);
  }
  return tracksSection;
}

customElements.define("settings-page", SettingsPage);
