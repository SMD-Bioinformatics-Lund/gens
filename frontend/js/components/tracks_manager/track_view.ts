import {
  ANIM_TIME,
  COLORS,
  SIZES,
  STYLE,
  TRACK_HEIGHTS,
} from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import Sortable, { SortableEvent } from "sortablejs";
import {
  createAnnotTrack,
  createDotTrack,
  createGeneTrack,
  createOverviewTrack,
  createVariantTrack,
  makeTrackContainer,
  TRACK_HANDLE_CLASS,
} from "./utils";
import {
  DataTrack,
  DataTrackSettings,
  DataTrackSettingsNew,
} from "../tracks/base_tracks/data_track";
import { setupDrag, setupDragging } from "../../movements/dragging";
import { GensSession } from "../../state/gens_session";
import { getLinearScale } from "../../draw/render_utils";
import { OverviewTrack } from "../tracks/overview_track";
import { IdeogramTrack } from "../tracks/ideogram_track";
import { BAF_Y_RANGE } from "./tracks_manager";
import { TrackMenu } from "../side_menu/track_menu";
import { DotTrack } from "../tracks/dot_track";
import { keyLogger } from "../util/keylogger";
import { zoomOut } from "../../util/navigation";
import { BandTrack } from "../tracks/band_track";
import { TrackHeights } from "../side_menu/settings_menu";
import { moveElement } from "../../util/collections";
import { renderHighlights } from "../tracks/base_tracks/interactive_tools";
import { getDifferences, removeOne, setDiff } from "../../util/utils";
import { PositionTrack } from "../tracks/position_track";
import { loadTrackLayout, saveTrackLayout } from "./utils/track_layout";
import { ChromosomeView } from "./chromosome_view";
import { syncDataTrackSettings } from "./utils/sync_tracks";
import { getRawTrack } from "./utils/create_tracks";

const trackHeight = STYLE.tracks.trackHeight;

const GENE_LIST_TRACK_TYPE = "gene-list";
const GENE_TRACK_TYPE = "gene";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
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
      border-right: ${SIZES.one}px solid ${COLORS.lightGray};
    }
    #tracks-container.grabbable {
      cursor: grab;
    }
    #tracks-container.grabbing {
      cursor: grabbing;
    }
    #top-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #position-label {
      white-space: nowrap;
      overflow: hidden;
      width: 100px;
    }
  </style>
  <div id="top-container"></div>
  <div id="tracks-container"></div>
  <div id="bottom-container"></div>
`;

export interface DataTrackWrapper {
  track: DataTrack;
  container: HTMLDivElement;
  sample: Sample | null;
}

export class TrackView extends ShadowBaseElement {
  private topContainer: HTMLDivElement;
  private tracksContainer: HTMLDivElement;
  private bottomContainer: HTMLDivElement;
  private positionLabel: HTMLDivElement;

  private session: GensSession;
  private dataSource: RenderDataSource;

  // FIXME: Document what this is
  private dataTrackSettings: DataTrackSettingsNew[] = [];
  private lastRenderedSamples: Sample[] = [];

  private dataTracks: DataTrackWrapper[] = [];
  private ideogramTrack: IdeogramTrack;
  private positionTrack: PositionTrack;
  private overviewTracks: OverviewTrack[] = [];

  private openTrackContextMenu: (track: DataTrack) => void;
  private trackPages: Record<string, TrackMenu> = {};

  private geneTrackInitialized = false;

  private sampleToTracks: Record<
    string,
    {
      cov: DataTrackWrapper;
      baf: DataTrackWrapper;
      variant: DataTrackWrapper;
    }
  > = {};

  public saveTrackLayout() {
    saveTrackLayout(this.session, this.dataTracks);
  }

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.topContainer = this.root.querySelector("#top-container");
    this.tracksContainer = this.root.querySelector("#tracks-container");
    this.bottomContainer = this.root.querySelector("#bottom-container");
    this.positionLabel = this.root.querySelector("#position-label");
  }

  public initialize(
    render: (settings: RenderSettings) => void,
    samples: Sample[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSources: RenderDataSource,
    session: GensSession,
  ) {
    this.dataSource = dataSources;
    this.session = session;

    const openTrackContextMenu = this.createOpenTrackContextMenu(render);
    this.openTrackContextMenu = openTrackContextMenu;

    Sortable.create(this.tracksContainer, {
      animation: ANIM_TIME.medium,
      handle: `.${TRACK_HANDLE_CLASS}`,
      swapThreshold: 0.5,
      onEnd: (evt: SortableEvent) => {
        // FIXME: Would it make sense for this to first shift the settings
        // And then let the render sort things through

        const { oldIndex, newIndex } = evt;
        const [moved] = this.dataTracks.splice(oldIndex, 1);
        this.dataTracks.splice(newIndex, 0, moved);

        render({ layout: true });
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

    // const covTracks: DataTrackWrapper[] = [];
    // const bafTracks: DataTrackWrapper[] = [];
    // const variantTracks: DataTrackWrapper[] = [];
    // const sampleAnnotTracks: DataTrackWrapper[] = [];

    this.ideogramTrack = new IdeogramTrack(
      "ideogram",
      "Ideogram",
      { height: trackHeight.xs },
      async () => {
        return {
          xRange: session.getXRange(),
          chromInfo: await dataSources.getChromInfo(session.getChromosome()),
        };
      },
      (band: RenderBand) => {
        session.setViewRange([band.start, band.end]);
        render({ dataUpdated: true, positionOnly: true });
      },
    );

    const yAxisCov = {
      range: session.getCoverageRange(),
      label: "Log2 Ratio",
      hideLabelOnCollapse: false,
      hideTicksOnCollapse: false,
    };
    const overviewTrackCov = createOverviewTrack(
      "overview_cov",
      "Overview (cov)",
      () => dataSources.getOverviewCovData(session.getMainSample()),
      session.getCoverageRange(),
      chromSizes,
      chromClick,
      session,
      yAxisCov,
    );

    const yAxisBaf = {
      range: BAF_Y_RANGE,
      label: "B Allele Freq",
      hideLabelOnCollapse: false,
      hideTicksOnCollapse: false,
    };
    const overviewTrackBaf = createOverviewTrack(
      "overview_baf",
      "Overview (baf)",
      () => dataSources.getOverviewBafData(session.getMainSample()),
      BAF_Y_RANGE,
      chromSizes,
      chromClick,
      session,
      yAxisBaf,
    );

    this.overviewTracks = [overviewTrackBaf, overviewTrackCov];

    let positionTrackSettings: DataTrackSettings = {
      height: {
        collapsedHeight: STYLE.tracks.trackHeight.xs,
      },
      showLabelWhenCollapsed: false,
      isExpanded: false,
      isHidden: false,
    };

    this.positionTrack = new PositionTrack(
      "position",
      "Position",
      () => positionTrackSettings,
      (settings) => (positionTrackSettings = settings),
      () => session.getMarkerModeOn(),
      () => session.getXRange(),
    );

    const chromosomeRow = document.createElement("flex-row");
    chromosomeRow.style.width = "100%";
    this.positionLabel = document.createElement("div");
    this.positionLabel.id = "position-label";
    chromosomeRow.appendChild(this.positionLabel);
    chromosomeRow.appendChild(this.ideogramTrack);

    this.topContainer.appendChild(chromosomeRow);
    this.topContainer.appendChild(this.positionTrack);
    this.ideogramTrack.initialize();
    this.ideogramTrack.renderLoading();
    this.positionTrack.initialize();
    this.positionTrack.renderLoading();

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

    this.addElementListener(this.tracksContainer, "click", () => {
      if (keyLogger.heldKeys.Control) {
        const updatedRange = zoomOut(
          this.session.getXRange(),
          this.session.getCurrentChromSize(),
        );
        session.setViewRange(updatedRange);
      }
    });
  }

  private getXScale(inverted: boolean = false): Scale {
    const xRange = this.session.getXRange();
    const yAxisWidth = STYLE.yAxis.width;
    const xDomain: Rng = [yAxisWidth, this.tracksContainer.offsetWidth];
    const xScale = !inverted
      ? getLinearScale(xRange, xDomain)
      : getLinearScale(xDomain, xRange);
    return xScale;
  }

  // FIXME: Lift this one up one level
  private createOpenTrackContextMenu(
    render: (settings: RenderSettings) => void,
  ) {
    const openTrackContextMenu = (track: DataTrack) => {
      const isDotTrack = track instanceof DotTrack;

      if (this.trackPages[track.id] == null) {
        const trackPage = new TrackMenu();
        const trackSettings = {
          showYAxis: isDotTrack,
          showColor: false,
        };
        trackPage.configure(track.id, trackSettings);
        this.trackPages[track.id] = trackPage;
      }

      const trackPage = this.trackPages[track.id];
      this.session.showContent(
        track.label,
        [trackPage],
        STYLE.menu.narrowWidth,
      );

      trackPage.initialize(
        (settings: { selectedOnly: boolean }) =>
          this.session.getAnnotationSources(settings),
        (direction: "up" | "down") => this.moveTrack(track.id, direction),
        () => {
          track.toggleHidden();
          render({ layout: true });
        },
        () => {
          track.toggleExpanded();
          render({ layout: true });
        },
        () => track.getIsHidden(),
        () => track.getIsExpanded(),
        isDotTrack ? () => track.getYAxis().range : null,
        (newY: Rng) => {
          track.setYAxis(newY);
          render({});
        },
        async (annotId: string | null) => {
          let colorBands = [];
          if (annotId != null) {
            colorBands = await this.dataSource.getAnnotationBands(
              annotId,
              this.session.getChromosome(),
            );
          }
          track.setColorBands(colorBands);
          render({});
        },
      );
    };
    return openTrackContextMenu;
  }

  public getDataTracks(): DataTrack[] {
    return this.dataTracks.map((info) => info.track);
  }

  public async setColorAnnotation(annotId: string | null) {
    this.session.setColorAnnotation(annotId);
    await this.updateColorBands();
  }

  private async updateColorBands() {
    let colorBands: RenderBand[] = [];
    if (this.session.getColorAnnotation() != null) {
      colorBands = await this.dataSource.getAnnotationBands(
        this.session.getColorAnnotation(),
        this.session.getChromosome(),
      );
    }
    for (const info of this.dataTracks) {
      info.track.setColorBands(colorBands);
    }
  }

  public moveTrack(trackId: string, direction: "up" | "down") {
    const trackInfo = getDataTrackInfoById(this.dataTracks, trackId);
    const trackInfoIndex = this.dataTracks.indexOf(trackInfo);

    if (direction == "up" && trackInfoIndex == 0) {
      return;
    }
    if (direction == "down" && trackInfoIndex == this.dataTracks.length - 1) {
      return;
    }

    const shift = direction == "up" ? -1 : 1;
    const trackContainer = trackInfo.container;
    // FIXME: Shouldn't this always be the same container? Test it
    const trackSContainer = trackContainer.parentNode;
    if (direction == "up") {
      trackSContainer.insertBefore(
        trackContainer,
        this.dataTracks[trackInfoIndex - 1].container,
      );
    } else {
      trackSContainer.insertBefore(
        trackContainer,
        this.dataTracks[trackInfoIndex + 1].container.nextSibling,
      );
    }

    moveElement(this.dataTracks, trackInfoIndex, shift, true);
  }

  // FIXME: Move to session?
  public addSample(sample: Sample, isTrackViewTrack: boolean) {
    // const sampleTracks = createSampleTracks(
    //   sample,
    //   this.dataSource,
    //   false,
    //   this.session,
    //   isTrackViewTrack,
    //   this.openTrackContextMenu,
    // );
    // // this.setupSampleAnnotationTracks(sample);
    // this.dataTracks.push(
    //   sampleTracks.cov,
    //   sampleTracks.baf,
    //   sampleTracks.variant,
    // );
    // this.tracksContainer.appendChild(sampleTracks.cov.container);
    // this.tracksContainer.appendChild(sampleTracks.baf.container);
    // this.tracksContainer.appendChild(sampleTracks.variant.container);
    // sampleTracks.cov.track.initialize();
    // sampleTracks.baf.track.initialize();
    // sampleTracks.variant.track.initialize();
  }

  // FIXME: Move to session?
  public removeSample(sample: Sample) {
    // const trackMatches = (trackInfo: DataTrackWrapper) =>
    //   trackInfo.sample != null &&
    //   trackInfo.sample.sampleId === sample.sampleId &&
    //   trackInfo.sample.caseId === sample.caseId;
    // const removeInfos = this.dataTracks.filter((track: DataTrackWrapper) =>
    //   trackMatches(track),
    // );
    // this.dataTracks = this.dataTracks.filter(
    //   (track: DataTrackWrapper) => !trackMatches(track),
    // );
    // for (const removeInfo of removeInfos) {
    //   this.tracksContainer.removeChild(removeInfo.container);
    // }
  }

  public showTrack(trackId: string) {
    const track = getDataTrackInfoById(this.dataTracks, trackId);
    this.tracksContainer.appendChild(track.container);
  }

  public hideTrack(trackId: string) {
    const track = getDataTrackInfoById(this.dataTracks, trackId);
    this.tracksContainer.removeChild(track.container);
  }

  public setTrackHeights(trackHeights: TrackHeights) {
    for (const track of this.dataTracks) {
      if (track.track instanceof BandTrack) {
        track.track.setHeights(trackHeights.bandCollapsed);
      } else if (track.track instanceof DotTrack) {
        track.track.setHeights(
          trackHeights.dotCollapsed,
          trackHeights.dotExpanded,
        );
      } else {
        console.error("Track of unknown DataTrack category:", track);
      }
    }
  }

  public setCovYRange(yRange: Rng) {
    for (const trackContainer of this.dataTracks) {
      if (trackContainer.track.trackType == "dot-cov") {
        trackContainer.track.setYAxis(yRange);
      }
    }
  }

  public render(renderSettings: RenderSettings) {
    if (renderSettings.dataUpdated) {
      this.updateColorBands();
    }

    renderHighlights(
      this.tracksContainer,
      this.session.getCurrentHighlights(),
      this.getXScale(),
      [STYLE.yAxis.width, this.tracksContainer.offsetWidth],
      (id) => this.session.removeHighlight(id),
    );

    // lastRenderedSamples

    syncDataTrackSettings(
      this.dataTrackSettings,
      this.session,
      this.dataSource,
      this.lastRenderedSamples,
    ).then(({ settings: dataTrackSettings, samples }) => {
      this.dataTrackSettings = dataTrackSettings;
      this.lastRenderedSamples = samples;

      // Load it after the other tracks
      if (!this.geneTrackInitialized) {
        const geneTrackSettings: DataTrackSettingsNew = {
          trackId: "genes",
          trackLabel: "Genes",
          trackType: "gene",
          height: {
            collapsedHeight: TRACK_HEIGHTS.m,
          },
          showLabelWhenCollapsed: true,
          isExpanded: true,
          isHidden: false,
        };

        this.dataTrackSettings.push(geneTrackSettings);
        this.geneTrackInitialized = true;
      }

      this.renderTracks(renderSettings);
    });

    // FIXME: Only the active one needs to be rendered isn't it?
    Object.values(this.trackPages).forEach((trackPage) =>
      trackPage.render(renderSettings),
    );

    this.ideogramTrack.render(renderSettings);
    this.positionTrack.render(renderSettings);
    // this.dataTracks.forEach((trackInfo) => trackInfo.track.render(settings));
    this.overviewTracks.forEach((track) => track.render(renderSettings));

    const [startChrSeg, endChrSeg] = this.session.getChrSegments();
    this.positionLabel.innerHTML = `${startChrSeg} - ${endChrSeg}`;
  }

  renderTracks(settings: RenderSettings) {
    console.log("renderTracks in tracks manager hit");

    const currIds = new Set(
      this.dataTrackSettings.map((setting) => setting.trackId),
    );
    const trackIds = new Set(this.dataTracks.map((track) => track.track.id));
    const addedIds = setDiff(currIds, trackIds);
    const removedIds = setDiff(trackIds, currIds);

    for (const settingId of addedIds) {
      const setting = this.dataTrackSettings.filter(
        (setting) => setting.trackId == settingId,
      )[0];
      const rawTrack = getRawTrack(this.session, this.dataSource, setting);

      const trackWrapper = makeTrackContainer(rawTrack, null);
      this.dataTracks.push(trackWrapper);
      this.tracksContainer.appendChild(trackWrapper.container);
      rawTrack.initialize();
    }

    for (const id of removedIds) {
      const match = removeOne(this.dataTracks, (info) => info.track.id === id);
      this.tracksContainer.removeChild(match.container);
    }

    for (const track of this.dataTracks) {
      track.track.render(settings);
    }
  }
}

function getDataTrackInfoById(
  tracks: DataTrackWrapper[],
  trackId: string,
): DataTrackWrapper {
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].track.id == trackId) {
      const track = tracks[i];
      return track;
    }
  }
  console.error("Did not find any track with ID", trackId);
}

customElements.define("track-view", TrackView);
