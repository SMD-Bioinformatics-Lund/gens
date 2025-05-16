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
  getTrackInfo,
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

export interface DataTrackInfo {
  track: DataTrack;
  container: HTMLDivElement;
  sampleId: string | null;
}

export class TrackView extends ShadowBaseElement {
  topContainer: HTMLDivElement;
  tracksContainer: HTMLDivElement;
  bottomContainer: HTMLDivElement;

  session: GensSession;
  dataSources: TracksManagerDataSources;
  renderAll: (settings: RenderSettings) => void;
  sampleIds: string[];

  dataTracksInfo: DataTrackInfo[] = [];
  // dataTracks: DataTrack[] = [];
  ideogramTrack: IdeogramTrack;
  overviewTracks: OverviewTrack[] = [];
  dataTrackIdToWrapper: Record<string, HTMLDivElement> = {};

  openTrackContextMenu: (track: DataTrack) => void;
  trackPages: Record<string, TrackPage> = {};

  sampleToTracks: Record<
    string,
    { cov: DataTrackInfo; baf: DataTrackInfo; variant: DataTrackInfo }
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
        const [moved] = this.dataTracksInfo.splice(oldIndex, 1);
        this.dataTracksInfo.splice(newIndex, 0, moved);
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

    const covTracks: DataTrackInfo[] = [];
    const bafTracks: DataTrackInfo[] = [];
    const variantTracks: DataTrackInfo[] = [];

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

    const tracks: DataTrackInfo[] = [
      ...covTracks,
      ...bafTracks,
      ...variantTracks,
      genesTrack,
    ];

    // const tracks: DataTrackInfo[] = bareTracks.map((track) => {
    //   // this.setupDataTrack(track);
    //   const container = document.createElement("div") as HTMLDivElement;
    //   container.appendChild(track);
    //   return {
    //     track,
    //     container,
    //   };
    // });

    // this.dataTracks.push(
    //   ...covTracks,
    //   ...bafTracks,
    //   ...variantTracks,
    //   genesTrack,
    // );

    this.topContainer.appendChild(this.ideogramTrack);
    this.ideogramTrack.initialize();
    this.ideogramTrack.renderLoading();

    tracks.forEach(({ track, container }) => {
      // const trackWrap = createDataTrackWrapper(track);
      this.tracksContainer.appendChild(container);
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
    return this.dataTracksInfo.filter((track) => track instanceof DataTrack);
  }

  // FIXME: Seems this should be a more general util
  moveTrack(trackId: string, direction: "up" | "down") {
    const trackInfo = getDataTrackInfoById(this.dataTracksInfo, trackId);
    const trackInfoIndex = this.dataTracksInfo.indexOf(trackInfo);

    if (direction == "up" && trackInfoIndex == 0) {
      return;
    }
    if (
      direction == "down" &&
      trackInfoIndex == this.dataTracksInfo.length - 1
    ) {
      return;
    }

    const shift = direction == "up" ? -1 : 1;
    const trackContainer = trackInfo.container;
    // FIXME: Shouldn't this always be the same container? Test it
    const trackSContainer = trackContainer.parentNode;
    if (direction == "up") {
      trackSContainer.insertBefore(
        trackContainer,
        this.dataTracksInfo[trackInfoIndex - 1].container,
      );
    } else {
      trackSContainer.insertBefore(
        trackContainer,
        this.dataTracksInfo[trackInfoIndex + 1].container.nextSibling,
      );
    }

    moveElement(this.dataTracksInfo, trackInfoIndex, shift, true);
  }

  addSample(sampleId: string) {
    const sampleTracks = createSampleTracks(
      sampleId,
      this.dataSources,
      false,
      this.session,
      this.openTrackContextMenu,
    );

    // this.setupDataTrack(sampleTracks.cov);
    // this.setupDataTrack(sampleTracks.baf);
    // this.setupDataTrack(sampleTracks.variant);

    this.dataTracksInfo.push(
      sampleTracks.cov,
      sampleTracks.baf,
      sampleTracks.variant,
    );
    // this.sampleToTracks[sampleId] = sampleTracks;
  }

  public removeSample(sampleId: string) {
    // const tracks = this.sampleToTracks[sampleId];

    const removeInfos = this.dataTracksInfo.filter(
      (info) => info.sampleId === sampleId,
    );

    this.dataTracksInfo = this.dataTracksInfo.filter(
      (info) => info.sampleId !== sampleId,
    );

    for (const removeInfo of removeInfos) {
      this.tracksContainer.removeChild(removeInfo.container);
    }

    // const removeInds = [];
    // for (let i = 0; i < this.dataTracksInfo.length; i++) {
    //   const info = this.dataTracksInfo[i];
    //   if (info.sampleId === sampleId) {
    //     removeInds.push(i);
    //   }
    // }

    // const toRemove = this.dataTracksInfo.filter((info) => {
    //   info.sampleId === sampleId
    // })

    // for (const [sampleId, track] of Object.entries(tracks)) {
    //   this.hideTrack(track.track.id);
    //   const index = this.dataTracksInfo.indexOf(track);
    //   this.dataTracksInfo.splice(index, 1);
    // }

    // delete this.sampleToTracks[sampleId];
  }

  public showTrack(trackId: string) {
    const track = getDataTrackInfoById(this.dataTracksInfo, trackId);
    this.tracksContainer.appendChild(track.container);
  }

  public hideTrack(trackId: string) {
    const track = getDataTrackInfoById(this.dataTracksInfo, trackId);
    this.tracksContainer.removeChild(track.container);
  }

  setTrackHeights(trackHeights: TrackHeights) {
    for (const track of this.dataTracksInfo) {
      if (track instanceof BandTrack) {
        track.setHeights(trackHeights.bandCollapsed);
      } else if (track instanceof DotTrack) {
        track.setHeights(trackHeights.dotCollapsed, trackHeights.dotExpanded);
      } else {
        console.error("Track of unknown DataTrack category:", track);
      }
    }
  }

  removeDataTrack(id: string) {
    const trackInfo = getDataTrackInfoById(this.dataTracksInfo, id);
    const index = this.dataTracksInfo.indexOf(trackInfo);
    this.dataTracksInfo.splice(index, 1);

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
      this.dataTracksInfo.filter(
        (info) => info.track.trackType == "annotation",
      ),
      this.dataSources,
      this.session,
      this.openTrackContextMenu,
      (track: DataTrack) => {
        const info = getTrackInfo(track, null);

      },
      (id: string) => this.removeDataTrack(id),
    );

    for (const trackPage of Object.values(this.trackPages)) {
      trackPage.render(settings);
    }

    this.ideogramTrack.render(settings);

    for (const trackInfo of this.dataTracksInfo) {
      trackInfo.track.render(settings);
    }

    this.overviewTracks.forEach((track) => track.render(settings));
  }
}

function getDataTrackInfoById(
  tracks: DataTrackInfo[],
  trackId: string,
): DataTrackInfo {
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].track.id == trackId) {
      const track = tracks[i];
      return track;
    }
  }
  console.error("Did not find any track with ID", trackId);
}

export function createSampleTracks(
  sampleId: string,
  dataSources: TracksManagerDataSources,
  startExpanded: boolean,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): {
  cov: DataTrackInfo;
  baf: DataTrackInfo;
  variant: DataTrackInfo;
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
    cov: getTrackInfo(coverageTrack, sampleId),
    baf: getTrackInfo(bafTrack, sampleId),
    variant: getTrackInfo(variantTrack, sampleId),
  };
}

function updateAnnotationTracks(
  currAnnotTracks: DataTrackInfo[],
  dataSources: TracksManagerDataSources,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  addTrack: (track: DataTrack) => void,
  removeTrack: (id: string) => void,
) {
  const sources = dataSources.getAnnotationSources({
    selectedOnly: true,
  });

  const currTrackIds = currAnnotTracks.map((info) => info.track.id);
  const sourceIds = sources.map((source) => source.id);

  const newSources = sources.filter(
    (source) => !currTrackIds.includes(source.id),
  );
  const removedSourceIds = currAnnotTracks
    .map((info) => info.track.id)
    .filter((id) => !sourceIds.includes(id));

  // const newSources = diff(sources, currAnnotTracks, (source) => source.track.id);
  // const removedSources = diff(currAnnotTracks, sources, (source) => source.track.id);

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

  removedSourceIds.forEach((id) => {
    removeTrack(id);
  });
}

customElements.define("track-view", TrackView);
