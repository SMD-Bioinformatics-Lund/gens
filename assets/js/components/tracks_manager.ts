import "./tracks/base_tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import "./tracks/multi_track";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { MultiBandTracks } from "./tracks/multi_track";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { STYLE } from "../constants";
import { CanvasTrack } from "./tracks/base_tracks/canvas_track";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "./util/menu_content_utils";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import { generateID } from "../util/utils";
import { getSimpleButton, getContainer } from "./util/menu_utils";
import { DataTrack } from "./tracks/base_tracks/data_track";
import { diff, moveElement } from "../util/collections";

const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

const COV_Y_TICKS = [-3, -2, -1, 0, 1, 2, 3];
const BAF_Y_TICKS = [0.2, 0.4, 0.6, 0.8];

const trackHeight = STYLE.bandTrack.trackHeight;

// FIXME: This will need to be generalized such that tracks aren't hard-coded
const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      width: 100%;
    }
    #tracks-container {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      /* overflow-x: hidden; */
      padding-left: 10px;
      padding-right: 10px;
    }
  </style>
  <div id="top-container"></div>
  <div id="tracks-container"></div>
  <div id="bottom-container"></div>
`;

interface DragCallbacks {
  onZoomIn: (range: Rng) => void;
  onZoomOut: () => void;
  getHighlights: () => { id: string; range: Rng }[];
  addHighlight: (id: string, range: Rng) => void;
  removeHighlight: (id: string) => void;
}

export class TracksManager extends ShadowBaseElement {
  topContainer: HTMLDivElement;
  parentContainer: HTMLDivElement;
  bottomContainer: HTMLDivElement;
  isInitialized = false;
  // annotationsContainer: HTMLDivElement;

  // FIXME: Think about a shared interface
  ideogramTrack: IdeogramTrack;
  overviewTracks: OverviewTrack[];
  dataTracks: DataTrack[] = [];

  // Remove this one or?
  annotationTracks: DataTrack[] = [];
  getXRange: () => Rng;

  dragCallbacks: DragCallbacks;
  dataSource: RenderDataSource;

  getAnnotationSources: () => { id: string; label: string }[];
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>;
  openContextMenu: (header: string, content: HTMLElement[]) => void;
  openTrackContextMenu: (track: DataTrack) => void;
  // makeNewAnnotTrack: (id: string, label: string) => DataTrack;

  constructor() {
    super(template);
  }

  connectedCallback() {
    window.addEventListener("resize", () => {
      this.render(false);
    });

    this.topContainer = this.root.querySelector(
      "#top-container",
    ) as HTMLDivElement;
    this.parentContainer = this.root.querySelector(
      "#tracks-container",
    ) as HTMLDivElement;
    this.bottomContainer = this.root.querySelector(
      "#bottom-container",
    ) as HTMLDivElement;
  }

  // FIXME: Group the callbacks for better overview
  async initialize(
    sampleIds: string[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSource: RenderDataSource,
    getChromosome: () => string,
    getXRange: () => Rng,
    onZoomIn: (range: Rng) => void,
    onZoomOut: () => void,
    getAnnotSources: () => { id: string; label: string }[],
    getVariantURL: (id: string) => string,
    getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
    getTranscriptDetails: (id: string) => Promise<ApiTranscriptDetails>,
    getVariantDetails: (
      sampleId: string,
      variantId: string,
    ) => Promise<ApiVariantDetails>,
    openContextMenu: (header: string, content: HTMLElement[]) => void,
    highlightCallbacks: HighlightCallbacks,
  ) {
    this.dataSource = dataSource;
    this.getAnnotationSources = getAnnotSources;
    this.getAnnotationDetails = getAnnotationDetails;

    this.openContextMenu = openContextMenu;
    this.getXRange = getXRange;

    this.dragCallbacks = {
      onZoomIn,
      onZoomOut,
      getHighlights: highlightCallbacks.getHighlights,
      addHighlight: highlightCallbacks.addHighlight,
      removeHighlight: highlightCallbacks.removeHighlight,
    };

    this.openTrackContextMenu = (track: DataTrack) => {
      const buttonRow = getContainer("row");
      buttonRow.style.justifyContent = "left";

      buttonRow.appendChild(
        getSimpleButton("Show", () => {
          this.showTrack(track.id);
        }),
      );

      buttonRow.appendChild(
        getSimpleButton("Hide", () => {
          this.hideTrack(track.id);
        }),
      );
      buttonRow.appendChild(getSimpleButton("Move up", () => {}));
      buttonRow.appendChild(getSimpleButton("Move down", () => {}));

      openContextMenu(track.label, [buttonRow]);
    };

    const covTracks = [];
    const bafTracks = [];
    const variantTracks = [];

    this.ideogramTrack = new IdeogramTrack(
      "ideogram",
      "Ideogram",
      trackHeight.extraThin,
      async () => {
        return {
          xRange: getXRange(),
          chromInfo: await dataSource.getChromInfo(),
        };
      },
    );

    for (const sampleId of sampleIds) {
      const startExpanded = sampleIds.length == 1 ? true : false;

      const coverageTrack = this.getDotTrack(
        `${sampleId}_log2_cov`,
        `${sampleId} cov`,
        sampleId,
        (sampleId: string) => this.dataSource.getCovData(sampleId),
        { startExpanded, yAxis: { range: COV_Y_RANGE, ticks: COV_Y_TICKS } },
      );
      const bafTrack = this.getDotTrack(
        `${sampleId}_log2_baf`,
        `${sampleId} baf`,
        sampleId,
        (sampleId: string) => this.dataSource.getBafData(sampleId),
        { startExpanded, yAxis: { range: BAF_Y_RANGE, ticks: BAF_Y_TICKS } },
      );

      const variantTrack = this.getVariantTrack(
        `${sampleId}_variants`,
        `${sampleId} Variants`,
        sampleId,
        (sampleId: string) => this.dataSource.getVariantData(sampleId),
        getVariantDetails,
        getVariantURL,
      )

      covTracks.push(coverageTrack);
      bafTracks.push(bafTrack);
      variantTracks.push(variantTrack);
    }

    const genesTrack = new BandTrack(
      "genes",
      "Genes",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getTranscriptData(),
        };
      },
      async (id) => {
        const details = await getTranscriptDetails(id);
        const button = getSimpleButton("Set highlight", () => {
          const id = generateID();
          highlightCallbacks.addHighlight(id, [details.start, details.end]);
        });
        const entries = getGenesContextMenuContent(id, details);
        const content = [button];
        content.push(...entries);
        openContextMenu("Transcript", content);
      },
      this.dragCallbacks,
      this.openTrackContextMenu,
    );

    const overviewTrackCov = new OverviewTrack(
      "overview_cov",
      "Overview (cov)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      COV_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await dataSource.getOverviewCovData(sampleIds[0]),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
      true,
    );
    const overviewTrackBaf = new OverviewTrack(
      "overview_baf",
      "Overview (baf)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      BAF_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await dataSource.getOverviewBafData(sampleIds[0]),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
      false,
    );

    this.overviewTracks = [overviewTrackCov, overviewTrackBaf];

    this.dataTracks.push(
      ...covTracks,
      ...bafTracks,
      ...variantTracks,
      // ...annotationTracks,
      genesTrack,
    );

    this.topContainer.appendChild(this.ideogramTrack);
    this.ideogramTrack.initialize();
    this.ideogramTrack.renderLoading();

    this.dataTracks.forEach((track) => {
      this.parentContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    });

    this.overviewTracks.forEach((track) => {
      this.bottomContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    });
  }

  getDataTracks(): DataTrack[] {
    return this.dataTracks.filter((track) => track instanceof DataTrack);
  }

  getTrackById(trackId: string): DataTrack {
    for (let i = 0; i < this.dataTracks.length; i++) {
      if (this.dataTracks[i].id == trackId) {
        return this.dataTracks[i];
      }
    }
    console.error("Did not find any track with ID", trackId);
  }

  moveTrack(trackId: string, direction: "up" | "down") {
    const track = this.getTrackById(trackId);
    const trackIndex = this.dataTracks.indexOf(track);
    const shift = direction == "up" ? -1 : 1;

    const container = track.parentNode;
    if (direction == "up") {
      container.insertBefore(track, this.dataTracks[trackIndex - 1]);
    } else {
      container.insertBefore(
        track,
        this.dataTracks[trackIndex + 1].nextSibling,
      );
    }

    moveElement(this.dataTracks, trackIndex, shift, true);
  }

  showTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    this.parentContainer.appendChild(track);
  }

  hideTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    this.parentContainer.removeChild(track);
  }

  updateAnnotationTracks() {
    const sources = this.getAnnotationSources();
    // const sourcesIds = sources.map((source) => source.id);

    const currAnnotTracks = this.annotationTracks;
    // const currAnnotTrackIds = currAnnotTracks.map((track) => track.id);

    const newSources = diff(sources, currAnnotTracks, (source) => source.id);
    const removedSources = diff(
      currAnnotTracks,
      sources,
      (source) => source.id,
    );

    newSources.forEach((source) => {
      const newTrack = this.getAnnotTrack(source.id, source.label);
      this.dataTracks.push(newTrack);
      this.annotationTracks.push(newTrack);
      this.parentContainer.appendChild(newTrack);
      newTrack.initialize();
    });

    removedSources.forEach((source) => {
      // Remove track
      const track = this.getTrackById(source.id);
      const index = this.dataTracks.indexOf(track);
      this.dataTracks.splice(index, 0);
      this.parentContainer.removeChild(track);
    });
  }

  render(updateData: boolean) {
    // FIXME: React to whether tracks are not present

    this.updateAnnotationTracks();

    this.ideogramTrack.render(updateData);

    for (const track of this.dataTracks) {
      track.render(updateData);
    }

    this.overviewTracks.forEach((track) => track.render(updateData));
  }

  getAnnotTrack(sourceId: string, label: string) {
    async function getAnnotTrackData(
      source: string,
      getXRange: () => Rng,
      getAnnotation: (source: string) => Promise<RenderBand[]>,
    ): Promise<BandTrackData> {
      const bands = await getAnnotation(source);
      return {
        xRange: getXRange(),
        bands,
      };
    }

    const openContextMenuId = async (id: string) => {
      const details = await this.getAnnotationDetails(id);
      const button = getSimpleButton("Set highlight", () => {
        const id = generateID();
        this.dragCallbacks.addHighlight(id, [details.start, details.end]);
      });
      const entries = getAnnotationContextMenuContent(id, details);
      const content = [button];
      content.push(...entries);
      this.openContextMenu("Annotations", content);
    };

    const track = new BandTrack(
      sourceId,
      label,
      trackHeight.thin,
      () =>
        getAnnotTrackData(
          sourceId,
          this.getXRange,
          this.dataSource.getAnnotation,
        ),
      openContextMenuId,
      this.dragCallbacks,
      this.openTrackContextMenu,
    );
    return track;
  }

  getDotTrack(
    id: string,
    label: string,
    sampleId: string,
    dataFn: (sampleId: string) => Promise<RenderDot[]>,
    settings: { startExpanded: boolean; yAxis: Axis },
  ): DotTrack {
    const dotTrack = new DotTrack(
      id,
      label,
      trackHeight.thick,
      settings.startExpanded,
      settings.yAxis,
      async () => {
        const data = await dataFn(sampleId);
        // const data = await this.dataSource.getCovData(sampleId);
        return {
          xRange: this.getXRange(),
          dots: data,
        };
      },
      this.dragCallbacks,
      this.openTrackContextMenu,
    );
    return dotTrack;
  }

  getVariantTrack(
    id: string,
    label: string,
    sampleId: string,
    dataFn: (sampleId: string) => Promise<RenderBand[]>,
    getVariantDetails: (sampleId: string, variantId: string) => Promise<ApiVariantDetails>,
    getVariantURL: (variantId: string) => string,
  ) {
    const variantTrack = new BandTrack(
      id,
      label,
      trackHeight.thin,
      async () => {
        return {
          xRange: this.getXRange(),
          bands: await dataFn(sampleId),
        };
      },
      async (variantId: string) => {
        const details = await getVariantDetails(sampleId, variantId);
        const scoutUrl = getVariantURL(variantId);

        const button = getSimpleButton("Set highlight", () => {
          const id = generateID();
          this.dragCallbacks.addHighlight(id, [details.position, details.end]);
        });

        const entries = getVariantContextMenuContent(
          variantId,
          details,
          scoutUrl,
        );
        const content = [button];
        content.push(...entries);

        this.openContextMenu("Variant", content);
      },
      this.dragCallbacks,
      this.openTrackContextMenu,
    );
    return variantTrack;
  }
}

customElements.define("gens-tracks", TracksManager);
