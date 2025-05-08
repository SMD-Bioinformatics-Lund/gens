import "./tracks/base_tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import "./tracks/multi_track";
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

const COV_Y_RANGE: [number, number] = [-3, 3];
const BAF_Y_RANGE: [number, number] = [0, 1];

const trackHeight = STYLE.tracks.trackHeight;

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
  getXRange: () => Rng;
  getChromosome: () => string;

  dragCallbacks: DragCallbacks;
  dataSource: RenderDataSource;
  renderAll: (settings: RenderSettings) => void;

  getAnnotationSources: GetAnnotSources;
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>;
  openTrackContextMenu: (track: DataTrack) => void;
  session: GensSession;

  trackPages: Record<string, TrackPage> = {};

  constructor() {
    super(template);
  }

  connectedCallback() {
    window.addEventListener("resize", () => {
      this.renderAll({ resized: true });
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
    dataSource: RenderDataSource,
    getChromosome: () => string,
    getXRange: () => Rng,
    onZoomIn: (range: Rng) => void,
    onZoomOut: () => void,
    onPan: (panX: number) => void,
    getAnnotSources: GetAnnotSources,
    getVariantURL: (id: string) => string,
    getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
    getTranscriptDetails: (id: string) => Promise<ApiGeneDetails>,
    getVariantDetails: (
      sampleId: string,
      variantId: string,
    ) => Promise<ApiVariantDetails>,
    session: GensSession,
  ) {
    this.dataSource = dataSource;
    this.getAnnotationSources = getAnnotSources;
    this.getAnnotationDetails = getAnnotationDetails;

    this.getXRange = getXRange;
    this.getChromosome = getChromosome;
    this.session = session;
    this.renderAll = render;

    Sortable.create(this.tracksContainer, {
      animation: ANIM_TIME.medium,
      handle: ".track-handle",
      onEnd: (evt: SortableEvent) => {
        const { oldIndex, newIndex } = evt;
        const [moved] = this.dataTracks.splice(oldIndex, 1);
        this.dataTracks.splice(newIndex, 0, moved);
        render({});
      },
    });

    let dragStartX: number | null = null;
    let dragEndX: number | null = null;

    let isSpaceDown = false;
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        isSpaceDown = true;
        document.body.style.cursor = "grab";
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        isSpaceDown = false;
        document.body.style.cursor = "";
      }
    });

    this.tracksContainer.addEventListener("mousedown", (event) => {
      if (isSpaceDown) {
        dragStartX = event.offsetX;
      }
    });

    this.tracksContainer.addEventListener("mousemove", (event) => {
      if (!isSpaceDown) {
        return;
      }

      dragEndX = event.offsetX;
      // this.panContent(this.dragEnd.x - this.dragStart.x);
      // dragStartX = dragEndX;
    });

    this.tracksContainer.addEventListener("mouseup", (_event) => {
      const dragDistance = Math.abs(dragEndX - dragStartX);
      const inverted = true;
      const invertedXScale = this.getXScale(inverted);
      const scaledDistance = invertedXScale(dragDistance);

      const scaledStart = invertedXScale(dragStartX);
      const scaledEnd = invertedXScale(dragEndX);

      console.log(
        "Dragged from",
        dragStartX,
        "to",
        dragEndX,
        `(${scaledStart} - ${scaledEnd}), ${scaledEnd - scaledStart}`,
      );

      onPan(scaledEnd - scaledStart)

      dragStartX = null;
      dragEndX = null;
    });

    this.dragCallbacks = {
      onZoomIn,
      onZoomOut,
      getHighlights: session.getHighlights.bind(session),
      addHighlight: session.addHighlight.bind(session),
      removeHighlight: session.removeHighlight.bind(session),
    };

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
        getAnnotSources,
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
            colorBands = await dataSource.getAnnotation(annotId);
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
        { startExpanded, yAxis: { range: COV_Y_RANGE } },
      );
      const bafTrack = this.getDotTrack(
        `${sampleId}_log2_baf`,
        `${sampleId} baf`,
        sampleId,
        (sampleId: string) => this.dataSource.getBafData(sampleId),
        { startExpanded, yAxis: { range: BAF_Y_RANGE } },
      );

      const variantTrack = this.getVariantTrack(
        `${sampleId}_variants`,
        `${sampleId} Variants`,
        sampleId,
        (sampleId: string) => this.dataSource.getVariantData(sampleId),
        getVariantDetails,
        getVariantURL,
      );

      covTracks.push(coverageTrack);
      bafTracks.push(bafTrack);
      variantTracks.push(variantTrack);
    }

    const genesTrack = this.getGenesTrack(
      "genes",
      "Genes",
      () => dataSource.getTranscriptData(),
      (id: string) => getTranscriptDetails(id),
    );

    const overviewTrackCov = this.getOverviewTrack(
      "overview_cov",
      "Overview (cov)",
      () => dataSource.getOverviewCovData(sampleIds[0]),
      COV_Y_RANGE,
      chromSizes,
      chromClick,
    );

    const overviewTrackBaf = this.getOverviewTrack(
      "overview_baf",
      "Overview (baf)",
      () => dataSource.getOverviewBafData(sampleIds[0]),
      BAF_Y_RANGE,
      chromSizes,
      chromClick,
    );

    this.overviewTracks = [overviewTrackCov, overviewTrackBaf];

    this.dataTracks.push(
      ...covTracks,
      ...bafTracks,
      // ...variantTracks,
      // genesTrack,
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
      session,
      getXRange,
      getChromosome,
      this.dragCallbacks,
    );

    this.tracksContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        this.dragCallbacks.onZoomOut();
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
    const sources = this.getAnnotationSources({ selectedOnly: true });
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
    const xRange = this.getXRange();
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
      this.dragCallbacks.getHighlights(this.getChromosome()),
      this.getXScale(),
      (id) => this.dragCallbacks.removeHighlight(id),
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
        const id = generateID();
        this.dragCallbacks.addHighlight({
          id,
          chromosome: this.getChromosome(),
          range: [details.start, details.end],
          color: COLORS.transparentBlue,
        });
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
      () =>
        getAnnotTrackData(
          sourceId,
          this.getXRange,
          this.dataSource.getAnnotation,
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
      async () => {
        const data = await dataFn(sampleId);
        // const data = await this.dataSource.getCovData(sampleId);
        return {
          xRange: this.getXRange(),
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
          this.dragCallbacks.addHighlight({
            id,
            chromosome: this.getChromosome(),
            range: [details.position, details.end],
            color: COLORS.transparentBlue,
          });
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
      async () => {
        return {
          xRange: this.getXRange(),
          bands: await getBands(),
        };
      },
      async (id) => {
        const details = await getDetails(id);
        const button = getSimpleButton("Set highlight", () => {
          const id = generateID();
          this.dragCallbacks.addHighlight({
            id,
            chromosome: this.getChromosome(),
            range: [details.start, details.end],
            color: COLORS.transparentBlue,
          });
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
          xRange: this.getXRange(),
          chromosome: this.getChromosome(),
        };
      },
      () => {
        const xRange = this.getXRange();
        const chrom = this.getChromosome();
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
  handle.className = "track-handle";
  handle.style.position = "absolute";
  handle.style.top = "0";
  handle.style.left = "0";
  handle.style.width = `${STYLE.yAxis.width}px`;
  handle.style.height = "100%";
  wrapper.appendChild(handle);

  parentContainer.appendChild(wrapper);
}

function setupDrag(
  tracksContainer: HTMLElement,
  session: GensSession,
  getXRange: () => Rng,
  getChromosome: () => string,
  dragCallbacks: DragCallbacks,
) {
  const onDragEnd = (pxRangeX: Rng, _pxRangeY: Rng, shiftPress: boolean) => {
    const xRange = getXRange();
    if (xRange == null) {
      console.error("No xRange set");
    }

    const yAxisWidth = STYLE.yAxis.width;

    const pixelToPos = getLinearScale(
      [yAxisWidth, tracksContainer.offsetWidth],
      xRange,
    );
    const posStart = pixelToPos(Math.max(yAxisWidth, pxRangeX[0]));
    const posEnd = pixelToPos(Math.max(yAxisWidth, pxRangeX[1]));

    if (shiftPress) {
      dragCallbacks.onZoomIn([Math.floor(posStart), Math.floor(posEnd)]);
    } else {
      const id = generateID();
      dragCallbacks.addHighlight({
        id,
        chromosome: getChromosome(),
        range: [posStart, posEnd],
        color: COLORS.transparentBlue,
      });
    }
  };

  initializeDragSelect(
    tracksContainer,
    onDragEnd,
    dragCallbacks.removeHighlight,
    () => session.getMarkerMode(),
  );
}

customElements.define("gens-tracks", TracksManager);
