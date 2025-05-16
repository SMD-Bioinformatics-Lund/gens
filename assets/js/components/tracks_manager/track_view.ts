import { ANIM_TIME, STYLE } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import Sortable, { SortableEvent } from "sortablejs";
import {
  createAnnotTrack,
  createDataTrackWrapper,
  createDotTrack,
  createGenesTrack,
  createOverviewTrack,
  createVariantTrack,
  TRACK_HANDLE_CLASS,
} from "./utils";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { setupDrag, setupDragging } from "../../movements/dragging";
import { GensSession } from "../../state/gens_session";
import { getLinearScale } from "../../draw/render_utils";
import { OverviewTrack } from "../tracks/overview_track";
import { IdeogramTrack } from "../tracks/ideogram_track";
import {
  BAF_Y_RANGE,
  COV_Y_RANGE,
  TracksManagerDataSources,
} from "./tracks_manager";
import { TrackPage } from "../side_menu/track_page";
import { DotTrack } from "../tracks/dot_track";
import { keyLogger } from "../util/keylogger";
import { zoomOut } from "../../util/navigation";
import { BandTrack } from "../tracks/band_track";
import { TrackHeights } from "../side_menu/settings_page";
import { diff, moveElement } from "../../util/collections";
import { renderHighlights } from "../tracks/base_tracks/interactive_tools";

const trackHeight = STYLE.tracks.trackHeight;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
  </style>
  <div id="top-container"></div>
  <div id="tracks-container"></div>
  <div id="bottom-container"></div>
`;

export class TrackView extends ShadowBaseElement {
  topContainer: HTMLDivElement;
  tracksContainer: HTMLDivElement;
  bottomContainer: HTMLDivElement;

  session: GensSession;
  dataSources: TracksManagerDataSources;
  renderAll: (settings: RenderSettings) => void;
  sampleIds: string[];
  dataTracks: DataTrack[] = [];
  ideogramTrack: IdeogramTrack;
  overviewTracks: OverviewTrack[] = [];
  dataTrackIdToWrapper: Record<string, HTMLDivElement> = {};

  openTrackContextMenu: (track: DataTrack) => void;
  trackPages: Record<string, TrackPage> = {};

  sampleToTracks: Record<
    string,
    { cov: DataTrack; baf: DataTrack; variant: DataTrack }
  > = {};

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.topContainer = this.root.querySelector("#top-container");
    this.tracksContainer = this.root.querySelector("#tracks-container");
    this.bottomContainer = this.root.querySelector("#bottom-container");
  }

  initialize(
    render: (settings: RenderSettings) => void,
    sampleIds: string[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSources: TracksManagerDataSources,
    session: GensSession,
  ) {
    this.dataSources = dataSources;
    this.session = session;
    this.renderAll = render;
    this.sampleIds = sampleIds;

    const openTrackContextMenu = this.createOpenTrackContextMenu(render);
    this.openTrackContextMenu = openTrackContextMenu;

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

    setupDragging(this.tracksContainer, (dragRangePx: Rng) => {
      const inverted = true;
      const invertedXScale = this.getXScale(inverted);

      const scaledStart = invertedXScale(dragRangePx[0]);
      const scaledEnd = invertedXScale(dragRangePx[1]);
      const panDistance = scaledStart - scaledEnd;

      session.moveXRange(panDistance);
      render({ dataUpdated: true, positionOnly: true });
    });

    const covTracks = [];
    const bafTracks = [];
    const variantTracks = [];

    this.ideogramTrack = new IdeogramTrack(
      "ideogram",
      "Ideogram",
      { height: trackHeight.extraThin },
      async () => {
        return {
          xRange: session.getXRange(),
          chromInfo: await dataSources.getChromInfo(),
        };
      },
      (band: RenderBand) => {
        session.setViewRange([band.start, band.end]);
        render({ dataUpdated: true, positionOnly: true });
      },
    );

    const overviewTrackCov = createOverviewTrack(
      "overview_cov",
      "Overview (cov)",
      () => dataSources.getOverviewCovData(sampleIds[0]),
      COV_Y_RANGE,
      chromSizes,
      chromClick,
      session,
    );

    const overviewTrackBaf = createOverviewTrack(
      "overview_baf",
      "Overview (baf)",
      () => dataSources.getOverviewBafData(sampleIds[0]),
      BAF_Y_RANGE,
      chromSizes,
      chromClick,
      session,
    );

    this.overviewTracks = [overviewTrackCov, overviewTrackBaf];

    for (const sampleId of sampleIds) {
      const startExpanded = sampleIds.length == 1 ? true : false;

      const sampleTracks = createSampleTracks(
        sampleId,
        dataSources,
        startExpanded,
        session,
        openTrackContextMenu,
      );

      this.sampleToTracks[sampleId] = sampleTracks;

      covTracks.push(sampleTracks.cov);
      bafTracks.push(sampleTracks.baf);
      variantTracks.push(sampleTracks.variant);
    }

    const genesTrack = createGenesTrack(
      "genes",
      "Genes",
      () => dataSources.getTranscriptData(),
      (id: string) => dataSources.getTranscriptDetails(id),
      session,
      openTrackContextMenu,
    );

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
      const trackWrap = createDataTrackWrapper(track);
      this.tracksContainer.appendChild(trackWrap);
      track.initialize();
      track.renderLoading();
    });

    this.overviewTracks.forEach((track) => {
      this.bottomContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    });

    setupDrag(
      this.tracksContainer,
      () => session.getMarkerModeOn(),
      () => session.getXRange(),
      (range: Rng) => {
        session.setViewRange(range);
        render({ dataUpdated: true, positionOnly: true });
      },
      (range: Rng) => session.addHighlight(range),
      (id: string) => session.removeHighlight(id),
    );

    this.tracksContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        const updatedRange = zoomOut(
          this.session.getXRange(),
          this.session.getCurrentChromSize(),
        );
        session.setViewRange(updatedRange);
      }
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

  createOpenTrackContextMenu(render: (settings: RenderSettings) => void) {
    const openTrackContextMenu = (track: DataTrack) => {
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
        this.dataSources.getAnnotationSources,
        (direction: "up" | "down") => this.moveTrack(track.id, direction),
        () => {
          track.toggleHidden();
          render({});
        },
        () => {
          track.toggleExpanded();
          render({});
        },
        () => track.getIsHidden(),
        () => track.getIsExpanded(),
        isDotTrack ? () => track.getYAxis().range : null,
        (newY: Rng) => {
          track.updateYAxis(newY);
          render({});
        },
        async (annotId: string | null) => {
          let colorBands = [];
          if (annotId != null) {
            colorBands = await this.dataSources.getAnnotation(annotId);
          }
          track.setColorBands(colorBands);
          render({});
        },
      );
    };
    return openTrackContextMenu;
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

  moveTrack(trackId: string, direction: "up" | "down") {
    const track = this.getTrackById(trackId);
    const trackIndex = this.dataTracks.indexOf(track);

    if (direction == "up" && trackIndex == 0) {
      return;
    }
    if (direction == "down" && trackIndex == this.dataTracks.length - 1) {
      return;
    }

    const shift = direction == "up" ? -1 : 1;
    const trackContainer = track.parentElement;
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

  addSample(sampleId: string) {
    const sampleTracks = createSampleTracks(
      sampleId,
      this.dataSources,
      false,
      this.session,
      this.openTrackContextMenu,
    );

    this.addDataTrack(sampleTracks.cov);
    this.addDataTrack(sampleTracks.baf);
    this.addDataTrack(sampleTracks.variant);

    this.sampleToTracks[sampleId] = sampleTracks;
  }

  removeSample(sampleId: string) {
    const tracks = this.sampleToTracks[sampleId];

    for (const [sampleId, track] of Object.entries(tracks)) {
      this.hideTrack(track.id);
      const index = this.dataTracks.indexOf(track);
      this.dataTracks.splice(index, 1);
    }

    delete this.sampleToTracks[sampleId];
  }

  showTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    const trackWrap = createDataTrackWrapper(track);
    this.tracksContainer.appendChild(trackWrap);
  }

  hideTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    this.tracksContainer.removeChild(track.parentElement);
  }

  setTrackHeights(trackHeights: TrackHeights) {
    for (const track of this.dataTracks) {
      if (track instanceof BandTrack) {
        track.setHeights(trackHeights.bandCollapsed);
      } else if (track instanceof DotTrack) {
        track.setHeights(trackHeights.dotCollapsed, trackHeights.dotExpanded);
      } else {
        console.error("Track of unknown DataTrack category:", track);
      }
    }
  }

  addDataTrack(newTrack: DataTrack) {
    this.dataTracks.push(newTrack);
    const trackWrapper = createDataTrackWrapper(newTrack);
    this.tracksContainer.appendChild(trackWrapper);
    newTrack.initialize();

    this.dataTrackIdToWrapper[newTrack.id] = trackWrapper;
  }

  removeDataTrack(id: string) {
    const track = this.getTrackById(id);
    const index = this.dataTracks.indexOf(track);
    this.dataTracks.splice(index, 1);

    const wrapper = this.dataTrackIdToWrapper[id];

    /** Each track is wrapped in a parent div. Here, remove this wrapper. */
    this.tracksContainer.removeChild(wrapper);

    delete this.dataTrackIdToWrapper[id];
  }

  render(settings: RenderSettings) {
    // FIXME: Extract function
    renderHighlights(
      this.tracksContainer,
      this.session.getCurrentHighlights(),
      this.getXScale(),
      [STYLE.yAxis.width, this.tracksContainer.offsetWidth],
      (id) => this.session.removeHighlight(id),
    );

    updateAnnotationTracks(
      this.dataTracks.filter((track) => track.trackType == "annotation"),
      this.dataSources,
      this.session,
      this.openTrackContextMenu,
      (track: DataTrack) => this.addDataTrack(track),
      (id: string) => this.removeDataTrack(id),
    );

    for (const trackPage of Object.values(this.trackPages)) {
      trackPage.render(settings);
    }

    this.ideogramTrack.render(settings);

    for (const track of this.dataTracks) {
      track.render(settings);
    }

    this.overviewTracks.forEach((track) => track.render(settings));
  }
}

export function createSampleTracks(
  sampleId: string,
  dataSources: TracksManagerDataSources,
  startExpanded: boolean,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): {
  cov: DataTrack;
  baf: DataTrack;
  variant: DataTrack;
} {
  const coverageTrack = createDotTrack(
    `${sampleId}_log2_cov`,
    `${sampleId} cov`,
    sampleId,
    (sampleId: string) => dataSources.getCovData(sampleId, {}),
    {
      startExpanded,
      yAxis: {
        range: COV_Y_RANGE,
        reverse: true,
        label: "Log2 Ratio",
        hideLabelOnCollapse: true,
        hideTicksOnCollapse: true,
      },
    },
    session,
    openTrackContextMenu,
  );
  const bafTrack = createDotTrack(
    `${sampleId}_log2_baf`,
    `${sampleId} baf`,
    sampleId,
    (sampleId: string) => dataSources.getBafData(sampleId),
    {
      startExpanded,
      yAxis: {
        range: BAF_Y_RANGE,
        reverse: true,
        label: "B Allele Freq",
        hideLabelOnCollapse: true,
        hideTicksOnCollapse: true,
      },
    },
    session,
    openTrackContextMenu,
  );

  const variantTrack = createVariantTrack(
    `${sampleId}_variants`,
    `${sampleId} Variants`,
    sampleId,
    (sampleId: string) => dataSources.getVariantData(sampleId),
    dataSources.getVariantDetails,
    dataSources.getVariantUrl,
    session,
    openTrackContextMenu,
  );
  return {
    cov: coverageTrack,
    baf: bafTrack,
    variant: variantTrack,
  };
}

function updateAnnotationTracks(
  currAnnotTracks: DataTrack[],
  dataSources: TracksManagerDataSources,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  addTrack: (track: DataTrack) => void,
  removeTrack: (id: string) => void,
) {
  const sources = dataSources.getAnnotationSources({
    selectedOnly: true,
  });

  const newSources = diff(sources, currAnnotTracks, (source) => source.id);
  const removedSources = diff(currAnnotTracks, sources, (source) => source.id);

  newSources.forEach((source) => {
    const newTrack = createAnnotTrack(
      source.id,
      source.label,
      dataSources,
      session,
      openTrackContextMenu,
    );
    addTrack(newTrack);
  });

  removedSources.forEach((source) => {
    removeTrack(source.id);
  });
}

customElements.define("track-view", TrackView);
