import "./tracks/base_tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { ANIM_TIME, COLORS, SIZES, STYLE } from "../constants";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "./util/menu_content_utils";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import { generateID } from "../util/utils";
import { getSimpleButton } from "./util/menu_utils";
import { DataTrack } from "./tracks/base_tracks/data_track";
import { diff, moveElement } from "../util/collections";

import Sortable, { SortableEvent } from "sortablejs";
import { GensSession } from "../state/session";
import {
  initializeDragSelect,
  renderHighlights,
} from "./tracks/base_tracks/interactive_tools";
import { getLinearScale } from "../draw/render_utils";
import { keyLogger } from "./util/keylogger";
import { TrackPage } from "./side_menu/track_page";
import { setupDrag, setupDragging } from "../movements/dragging";

const COV_Y_RANGE: [number, number] = [-3, 3];
const BAF_Y_RANGE: [number, number] = [0, 1];

const trackHeight = STYLE.tracks.trackHeight;

const TRACK_HANDLE_CLASS = "track-handle";

interface TracksManagerDataSources {
  getAnnotationSources: GetAnnotSources;
  getVariantUrl: (id: string) => string;
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>;
  getTranscriptDetails: (id: string) => Promise<ApiGeneDetails>;
  getVariantDetails: (
    sampleId: string,
    variantId: string,
  ) => Promise<ApiVariantDetails>;

  getAnnotation: (id: string) => Promise<RenderBand[]>;
  getCovData: (id: string) => Promise<RenderDot[]>;
  getBafData: (id: string) => Promise<RenderDot[]>;
  getVariantData: (id: string) => Promise<RenderBand[]>;

  getChromInfo: () => Promise<ChromosomeInfo>;
  getTranscriptData: () => Promise<RenderBand[]>;
  getOverviewCovData: (
    sampleId: string,
  ) => Promise<Record<string, RenderDot[]>>;
  getOverviewBafData: (
    sampleId: string,
  ) => Promise<Record<string, RenderDot[]>>;
}

// FIXME: This will need to be generalized such that tracks aren't hard-coded
const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      width: 100%;
      padding-left: ${SIZES.m}px;
      padding-right: ${SIZES.m}px;
      padding-bottom: ${SIZES.m}px;
    }
    .track-handle {
      cursor: grab;
    }
    .track-handle:active,
    .track.dragging .track-handle {
      cursor: grabbing;
    }
    #tracks-container {
      position: relative;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    #tracks-container.grabbable {
      cursor: grab;
    }
    #tracks-container.grabbing {
      cursor: grabbing;
    }
  </style>
  <div id="top-container"></div>
  <div id="tracks-container"></div>
  <div id="bottom-container"></div>
`;

interface DragCallbacks {
  onZoomIn: (range: Rng) => void;
  onZoomOut: () => void;
  getHighlights: (chrom: string) => RangeHighlight[];
  addHighlight: (highlight: RangeHighlight) => void;
  removeHighlight: (id: string) => void;
}

export class TracksManager extends ShadowBaseElement {
  topContainer: HTMLDivElement;
  tracksContainer: HTMLDivElement;
  bottomContainer: HTMLDivElement;
  isInitialized = false;
  // annotationsContainer: HTMLDivElement;

  // FIXME: Think about a shared interface
  ideogramTrack: IdeogramTrack;
  overviewTracks: OverviewTrack[];
  dataTracks: DataTrack[] = [];

  // FIXME: Remove this one or?
  annotationTracks: DataTrack[] = [];
  // getXRange: () => Rng;
  // getChromosome: () => string;

  // dragCallbacks: DragCallbacks;
  // dataSource: RenderDataSource;
  myDataSources: TracksManagerDataSources;
  renderAll: (settings: RenderSettings) => void;

  // getAnnotationSources: GetAnnotSources;
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>;
  openTrackContextMenu: (track: DataTrack) => void;
  session: GensSession;

  trackPages: Record<string, TrackPage> = {};

  constructor() {
    super(template);
  }

  connectedCallback() {
    window.addEventListener("resize", () => {
      if (this.renderAll != null) {
        this.renderAll({ resized: true });
      }
    });

    this.topContainer = this.root.querySelector(
      "#top-container",
    ) as HTMLDivElement;
    this.tracksContainer = this.root.querySelector(
      "#tracks-container",
    ) as HTMLDivElement;
    this.bottomContainer = this.root.querySelector(
      "#bottom-container",
    ) as HTMLDivElement;
  }

  // FIXME: Group the callbacks for better overview
  async initialize(
    render: (settings: RenderSettings) => void,
    sampleIds: string[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    // dataSource: RenderDataSource,

    // In session?
    // getChromosome: () => string,
    // getXRange: () => Rng,
    // onZoomIn: (range: Rng) => void,
    // onZoomOut: () => void,
    // onPan: (panX: number) => void,

    myDataSources: TracksManagerDataSources,
    session: GensSession,
  ) {
    // this.dataSource = dataSource;
    this.myDataSources = myDataSources;
    // this.getAnnotationSources = getAnnotSources;
    // this.getAnnotationDetails = getAnnotationDetails;

    // this.getXRange = getXRange;
    // this.getChromosome = getChromosome;
    this.session = session;
    this.renderAll = render;

    Sortable.create(this.tracksContainer, {
      animation: ANIM_TIME.medium,
      handle: `.${TRACK_HANDLE_CLASS}`,
      onEnd: (evt: SortableEvent) => {
        const { oldIndex, newIndex } = evt;
        const [moved] = this.dataTracks.splice(oldIndex, 1);
        this.dataTracks.splice(newIndex, 0, moved);
        render({});
      },
    });

    setupDragging(this.tracksContainer, (dragRange: Rng) => {
      const inverted = true;
      const invertedXScale = this.getXScale(inverted);

      const scaledStart = invertedXScale(dragRange[0]);
      const scaledEnd = invertedXScale(dragRange[1]);

      session.onPan(scaledEnd - scaledStart);
    });

    // this.dragCallbacks = {
    //   onZoomIn,
    //   onZoomOut,
    //   getHighlights: session.getHighlights.bind(session),
    //   addHighlight: session.addHighlight.bind(session),
    //   removeHighlight: session.removeHighlight.bind(session),
    // };

    this.openTrackContextMenu = (track: DataTrack) => {
      const isDotTrack = track instanceof DotTrack;

      if (this.trackPages[track.id] == null) {
        const trackPage = new TrackPage();

        const trackSettings = {
          showYAxis: isDotTrack,
          showColor: true,
        };

        trackPage.configure(track.id, trackSettings);
        this.trackPages[track.id] = trackPage;
      }

      const trackPage = this.trackPages[track.id];

      this.session.showContent(track.label, [trackPage]);

      trackPage.initialize(
        myDataSources.getAnnotationSources,
        (direction: "up" | "down") => this.moveTrack(track.id, direction),
        () => {
          track.toggleHidden(), render({});
        },
        () => {
          track.toggleCollapsed(), render({});
        },
        () => track.getIsHidden(),
        () => track.getIsCollapsed(),
        isDotTrack ? () => track.getYAxis().range : null,
        (newY: Rng) => {
          track.updateYAxis(newY);
          render({});
        },
        async (annotId: string | null) => {
          let colorBands = [];
          if (annotId != null) {
            colorBands = await myDataSources.getAnnotation(annotId);
          }
          track.setColorBands(colorBands);
          render({});
        },
      );
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
          xRange: session.getXRange(),
          chromInfo: await myDataSources.getChromInfo(),
        };
      },
    );

    for (const sampleId of sampleIds) {
      const startExpanded = sampleIds.length == 1 ? true : false;

      const coverageTrack = this.getDotTrack(
        `${sampleId}_log2_cov`,
        `${sampleId} cov`,
        sampleId,
        (sampleId: string) => this.myDataSources.getCovData(sampleId),
        { startExpanded, yAxis: { range: COV_Y_RANGE } },
      );
      const bafTrack = this.getDotTrack(
        `${sampleId}_log2_baf`,
        `${sampleId} baf`,
        sampleId,
        (sampleId: string) => this.myDataSources.getBafData(sampleId),
        { startExpanded, yAxis: { range: BAF_Y_RANGE } },
      );

      const variantTrack = this.getVariantTrack(
        `${sampleId}_variants`,
        `${sampleId} Variants`,
        sampleId,
        (sampleId: string) => this.myDataSources.getVariantData(sampleId),
        myDataSources.getVariantDetails,
        myDataSources.getVariantUrl,
      );

      covTracks.push(coverageTrack);
      bafTracks.push(bafTrack);
      variantTracks.push(variantTrack);
    }

    const genesTrack = this.getGenesTrack(
      "genes",
      "Genes",
      () => myDataSources.getTranscriptData(),
      (id: string) => myDataSources.getTranscriptDetails(id),
    );

    const overviewTrackCov = this.getOverviewTrack(
      "overview_cov",
      "Overview (cov)",
      () => myDataSources.getOverviewCovData(sampleIds[0]),
      COV_Y_RANGE,
      chromSizes,
      chromClick,
    );

    const overviewTrackBaf = this.getOverviewTrack(
      "overview_baf",
      "Overview (baf)",
      () => myDataSources.getOverviewBafData(sampleIds[0]),
      BAF_Y_RANGE,
      chromSizes,
      chromClick,
    );

    this.overviewTracks = [overviewTrackCov, overviewTrackBaf];

    this.dataTracks.push(
      ...covTracks,
      ...bafTracks,
      ...variantTracks,
      genesTrack,
    );

    this.topContainer.appendChild(this.ideogramTrack);
    this.ideogramTrack.initialize();
    this.ideogramTrack.renderLoading();

    this.dataTracks.forEach((track) => {
      appendDataTrack(this.tracksContainer, track);
      track.initialize();
      track.renderLoading();
    });

    this.overviewTracks.forEach((track) => {
      this.bottomContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    });

    // this.setupDrag();
    setupDrag(
      this.tracksContainer,
      session.getMarkerModeOn,
      session.getXRange,
      session.getChromosome,
      session.setViewRange,
      session.addHighlight,
      session.removeHighlight,

      // this.dragCallbacks,
    );

    this.tracksContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        session.zoomOut();
      }
    });
  }

  getDataTracks(): DataTrack[] {
    return this.dataTracks.filter((track) => track instanceof DataTrack);
  }

  getTrackById(trackId: string): DataTrack {
    for (let i = 0; i < this.dataTracks.length; i++) {
      if (this.dataTracks[i].id == trackId) {
        const track = this.dataTracks[i];
        return track;
      }
    }
    console.error("Did not find any track with ID", trackId);
  }

  // FIXME: Hmm, messy with the tracks containers, think about how to simplify this
  moveTrack(trackId: string, direction: "up" | "down") {
    const track = this.getTrackById(trackId);
    const trackIndex = this.dataTracks.indexOf(track);
    const shift = direction == "up" ? -1 : 1;

    const trackContainer = track.parentElement;

    // const singleTrackContainer = track.parentNode;
    const trackSContainer = trackContainer.parentNode;
    if (direction == "up") {
      trackSContainer.insertBefore(
        trackContainer,
        this.dataTracks[trackIndex - 1].parentNode,
      );
    } else {
      trackSContainer.insertBefore(
        trackContainer,
        this.dataTracks[trackIndex + 1].parentNode.nextSibling,
      );
    }

    moveElement(this.dataTracks, trackIndex, shift, true);
  }

  showTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    appendDataTrack(this.tracksContainer, track);
  }

  hideTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    this.tracksContainer.removeChild(track);
  }

  updateAnnotationTracks() {
    const sources = this.myDataSources.getAnnotationSources({
      selectedOnly: true,
    });
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
      appendDataTrack(this.tracksContainer, newTrack);
      newTrack.initialize();
    });

    removedSources.forEach((source) => {
      // Remove track
      const track = this.getTrackById(source.id);
      const index = this.dataTracks.indexOf(track);
      this.dataTracks.splice(index, 0);
      this.tracksContainer.removeChild(track);
    });
  }

  getXScale(inverted: boolean = false): Scale {
    const xRange = this.session.getXRange();
    const yAxisWidth = STYLE.yAxis.width;

    const xDomain: Rng = [yAxisWidth, this.tracksContainer.offsetWidth];

    const xScale = !inverted
      ? getLinearScale(xRange, xDomain)
      : getLinearScale(xDomain, xRange);
    return xScale;
  }

  render(settings: RenderSettings) {
    // FIXME: React to whether tracks are not present

    renderHighlights(
      this.tracksContainer,
      this.session.getCurrentHighlights(),
      this.getXScale(),
      (id) => this.session.removeHighlight(id),
    );

    this.updateAnnotationTracks();

    for (const trackPage of Object.values(this.trackPages)) {
      trackPage.render(settings);
    }

    this.ideogramTrack.render(settings);

    for (const track of this.dataTracks) {
      track.render(settings);
    }

    this.overviewTracks.forEach((track) => track.render(settings));
  }

  getAnnotTrack(sourceId: string, label: string): BandTrack {
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
      console.log("opening context menu");
      const details = await this.getAnnotationDetails(id);
      const button = getSimpleButton("Set highlight", () => {
        this.session.addHighlight([details.start, details.end]);
      });
      const entries = getAnnotationContextMenuContent(id, details);
      const content = [button];
      content.push(...entries);
      this.session.showContent("Annotations", content);
    };

    const track = new BandTrack(
      sourceId,
      label,
      trackHeight.thin,
      () => this.session.getXRange(),
      () =>
        getAnnotTrackData(
          sourceId,
          () => this.session.getXRange(),
          this.myDataSources.getAnnotation,
        ),
      openContextMenuId,
      this.openTrackContextMenu,
      this.session,
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
      () => this.session.getXRange(),
      async () => {
        const data = await dataFn(sampleId);
        // const data = await this.dataSource.getCovData(sampleId);
        return {
          xRange: this.session.getXRange(),
          dots: data,
        };
      },
      this.openTrackContextMenu,
      this.session,
    );
    return dotTrack;
  }

  getVariantTrack(
    id: string,
    label: string,
    sampleId: string,
    dataFn: (sampleId: string) => Promise<RenderBand[]>,
    getVariantDetails: (
      sampleId: string,
      variantId: string,
    ) => Promise<ApiVariantDetails>,
    getVariantURL: (variantId: string) => string,
  ): BandTrack {
    const variantTrack = new BandTrack(
      id,
      label,
      trackHeight.thin,
      () => this.session.getXRange(),
      async () => {
        return {
          xRange: this.session.getXRange(),
          bands: await dataFn(sampleId),
        };
      },
      async (variantId: string) => {
        const details = await getVariantDetails(sampleId, variantId);
        const scoutUrl = getVariantURL(variantId);

        const button = getSimpleButton("Set highlight", () => {
          this.session.addHighlight([details.position, details.end]);
        });

        const entries = getVariantContextMenuContent(
          variantId,
          details,
          scoutUrl,
        );
        const content = [button];
        content.push(...entries);

        this.session.showContent("Variant", content);
      },
      this.openTrackContextMenu,
      this.session,
    );
    return variantTrack;
  }

  getGenesTrack(
    id: string,
    label: string,
    getBands: () => Promise<RenderBand[]>,
    getDetails: (id: string) => Promise<ApiGeneDetails>,
  ): BandTrack {
    const genesTrack = new BandTrack(
      id,
      label,
      trackHeight.thin,
      () => this.session.getXRange(),
      async () => {
        return {
          xRange: this.session.getXRange(),
          bands: await getBands(),
        };
      },
      async (id) => {
        const details = await getDetails(id);
        const button = getSimpleButton("Set highlight", () => {
          this.session.addHighlight([details.start, details.end]);
        });
        const entries = getGenesContextMenuContent(id, details);
        const content = [button];
        content.push(...entries);
        this.session.showContent("Transcript", content);
      },
      this.openTrackContextMenu,
      this.session,
    );
    return genesTrack;
  }

  getOverviewTrack(
    id: string,
    label: string,
    getData: () => Promise<Record<string, RenderDot[]>>,
    yRange: Rng,
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
  ): OverviewTrack {
    const overviewTrack = new OverviewTrack(
      id,
      label,
      trackHeight.thick,
      chromSizes,
      chromClick,
      yRange,
      async () => {
        return {
          dotsPerChrom: await getData(),
          xRange: this.session.getXRange(),
          chromosome: this.session.getChromosome(),
        };
      },
      () => {
        const xRange = this.session.getXRange();
        const chrom = this.session.getChromosome();
        return {
          chrom,
          start: xRange[0],
          end: xRange[1],
        };
      },
      true,
    );
    return overviewTrack;
  }
}

function appendDataTrack(parentContainer: HTMLDivElement, track: DataTrack) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("track-wrapper");
  wrapper.style.position = "relative";
  wrapper.appendChild(track);

  const handle = document.createElement("div");
  handle.className = TRACK_HANDLE_CLASS;
  handle.style.position = "absolute";
  handle.style.top = "0";
  handle.style.left = "0";
  handle.style.width = `${STYLE.yAxis.width}px`;
  handle.style.height = "100%";
  wrapper.appendChild(handle);

  parentContainer.appendChild(wrapper);
}

customElements.define("gens-tracks", TracksManager);
