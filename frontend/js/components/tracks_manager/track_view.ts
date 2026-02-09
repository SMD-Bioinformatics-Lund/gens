import {
  ANIM_TIME,
  BAF_Y_RANGE,
  bandTrackTypes,
  COLORS,
  dotTrackTypes,
  SIZES,
  STYLE,
} from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import Sortable, { SortableEvent } from "sortablejs";
import {
  createOverviewTrack,
  makeTrackContainer,
  TRACK_HANDLE_CLASS,
} from "./utils";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { setupDrag, setupDragging } from "../../movements/dragging";
import { GensSession } from "../../state/gens_session";
import { getLinearScale } from "../../draw/render_utils";
import { OverviewTrack } from "../tracks/overview_track";
import { IdeogramTrack } from "../tracks/ideogram_track";
import { keyLogger } from "../util/keylogger";
import { renderHighlights } from "../tracks/base_tracks/interactive_tools";
import { getSampleKey, removeOne, setDiff } from "../../util/utils";
import { PositionTrack } from "../tracks/position_track";
import {
  getSampleTrackSettings,
  syncDataTrackSettings,
} from "./utils/sync_tracks";
import { getTrack as getTrack } from "./utils/create_tracks";
import { getOpenTrackContextMenu } from "./utils/track_menues";
import { SessionPosition } from "../../state/session_helpers/session_position";

const trackHeight = STYLE.tracks.trackHeight;

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
      display: flex;
      flex-direction: column;
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
  private requestRender!: (settings: RenderSettings) => void;

  private session: GensSession;
  private sessionPos: SessionPosition;
  private dataSource: RenderDataSource;

  private lastRenderedSamples: Sample[] = [];

  private dataTracks: DataTrackWrapper[] = [];
  private ideogramTrack: IdeogramTrack;
  private positionTrack: PositionTrack;
  private overviewTracks: OverviewTrack[] = [];

  private colorBands: RenderBand[] = [];

  public saveTrackLayout() {
    this.session.saveTrackLayout();
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

  public async initialize(
    render: (settings: RenderSettings) => void,
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSources: RenderDataSource,
    session: GensSession,
  ) {
    this.dataSource = dataSources;
    this.session = session;
    const sessionPos = session.pos;
    this.sessionPos = sessionPos;
    this.requestRender = render;

    Sortable.create(this.tracksContainer, {
      animation: ANIM_TIME.medium,
      handle: `.${TRACK_HANDLE_CLASS}`,
      swapThreshold: 0.5,
      onEnd: (evt: SortableEvent) => {
        const { oldIndex, newIndex } = evt;

        const targetTrack = this.session.tracks.getTracks()[oldIndex];
        this.session.tracks.moveTrackToPos(targetTrack.trackId, newIndex);

        render({ saveLayoutChange: true });
      },
    });

    setupDragging(this.tracksContainer, (dragRangePx: Rng) => {
      const inverted = true;
      const invertedXScale = this.getXScale(inverted);

      const scaledStart = invertedXScale(dragRangePx[0]);
      const scaledEnd = invertedXScale(dragRangePx[1]);
      const panDistance = scaledStart - scaledEnd;

      this.sessionPos.moveXRange(panDistance);
      render({ reloadData: true, positionOnly: true });
    });

    this.ideogramTrack = new IdeogramTrack(
      "ideogram",
      "Ideogram",
      { height: trackHeight.xs },
      async () => {
        return {
          xRange: this.sessionPos.getXRange(),
          chromInfo: await dataSources.getChromInfo(
            this.sessionPos.getChromosome(),
          ),
        };
      },
      (band: RenderBand) => {
        this.sessionPos.setViewRange([band.start, band.end]);
        render({ reloadData: true, positionOnly: true });
      },
    );

    const yAxisCov = {
      range: session.profile.getCoverageRange(),
      label: `Log2 Ratio`,
      hideLabelOnCollapse: false,
      hideTicksOnCollapse: false,
    };
    const overviewTrackCov = createOverviewTrack(
      "overview_cov",
      "Overview (cov)",
      () => dataSources.getOverviewCovData(session.getMainSample()),
      session.profile.getCoverageRange(),
      chromSizes,
      chromClick,
      session,
      yAxisCov,
    );

    const yAxisBaf = {
      range: BAF_Y_RANGE,
      label: `BAF`,
      hideLabelOnCollapse: false,
      hideTicksOnCollapse: false,
      highlightedYs: [0.5],
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

    const positionTrackSettings: DataTrackSettings = {
      trackId: "position",
      trackLabel: "Position",
      trackType: "position",
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
      () => session.getMarkerModeOn(),
      () => this.sessionPos.getXRange(),
      () => this.colorBands,
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
      () => sessionPos.getXRange(),
      (range: Rng) => {
        sessionPos.setViewRange(range);
        render({ reloadData: true, positionOnly: true });
      },
      (range: Rng) => session.addHighlight(range),
      (id: string) => session.removeHighlight(id),
    );

    this.addElementListener(this.tracksContainer, "click", () => {
      if (keyLogger.heldKeys.Control) {
        sessionPos.zoomOut();
        this.requestRender({ reloadData: true, positionOnly: true });
      }
      if (keyLogger.heldKeys.Shift) {
        sessionPos.zoomIn();
        this.requestRender({ reloadData: true, positionOnly: true });
      }
    });

    await this.initializeTracks();

    this.session.loadTrackLayout();
    this.colorBands = await getAnnotColorBands(this.session, this.dataSource);
  }

  private async initializeTracks() {
    const samples = this.session.getSamples();
    const getSample = (id: SampleIdentifier) => this.session.getSample(id);
    const getSampleAnnotSources = (id: SampleIdentifier) =>
      this.dataSource.getSampleAnnotSources(id);
    const getCoverageRange = () => this.session.profile.getCoverageRange();

    const sampleKeys = new Set(samples.map((s) => getSampleKey(s)));
    const dataTrackSettings = await getSampleTrackSettings(
      sampleKeys,
      getSample,
      getCoverageRange,
      getSampleAnnotSources,
    );
    this.lastRenderedSamples = samples;
    this.session.tracks.setTracks(dataTrackSettings);
  }

  private getXScale(inverted: boolean = false): Scale {
    const xRange = this.sessionPos.getXRange();
    const yAxisWidth = STYLE.yAxis.width;
    const xDomain: Rng = [yAxisWidth, this.tracksContainer.offsetWidth];
    const xScale = !inverted
      ? getLinearScale(xRange, xDomain)
      : getLinearScale(xDomain, xRange);
    return xScale;
  }

  public render(renderSettings: RenderSettings) {

    console.log("Rendering");

    if (renderSettings.tracksReorderedOnly) {
      this.syncTrackOrder();
      return;
    }

    // Every time a new chromosome is selected, the color bands needs to be updated
    // This is hard to avoid, as it requires an API call
    // Let's ponder ahead if this could be done in a nicer way
    if (
      renderSettings.chromosomeChange ||
      renderSettings.samplesUpdated ||
      renderSettings.colorByChange
    ) {
      this.updateColorBands().then(() => {
        this.requestRender({});
      });
    }

    renderHighlights(
      this.tracksContainer,
      this.session.getCurrentHighlights(),
      this.getXScale(),
      [STYLE.yAxis.width, this.tracksContainer.offsetWidth],
      (id) => this.session.removeHighlight(id),
    );

    const existingTracks = this.session.tracks.getTracks();

    console.log("Existing tracks", existingTracks);

    syncDataTrackSettings(
      existingTracks,
      this.session,
      this.dataSource,
      this.lastRenderedSamples,
    ).then(({ settings: dataTrackSettings, samples }) => {
      this.session.tracks.setTracks(dataTrackSettings);
      this.lastRenderedSamples = samples;

      this.renderTracks(renderSettings);

      if (renderSettings.tracksReordered) {
        this.syncTrackOrder();
      }
    });

    this.ideogramTrack.render(renderSettings);
    this.positionTrack.render(renderSettings);
    this.overviewTracks.forEach((track) => track.render(renderSettings));

    const [startChrSeg, endChrSeg] = this.sessionPos.getChrSegments();
    this.positionLabel.innerHTML = `${this.sessionPos.getChromosome()}${startChrSeg}${endChrSeg}`;
  }

  syncTrackOrder() {
    const desiredOrder = this.session.tracks.getTracks().map((s) => s.trackId);

    if (desiredOrder.length == 0) {
      return;
    }

    const trackById = new Map(
      this.dataTracks.map((wrapper) => [wrapper.track.id, wrapper]),
    );
    const appendedIds = new Set<string>();
    const orderedDataTracks: DataTrackWrapper[] = [];
    const fragment = document.createDocumentFragment();

    for (const id of desiredOrder) {
      const wrapper = trackById.get(id);
      if (!wrapper) {
        continue;
      }

      appendedIds.add(id);
      orderedDataTracks.push(wrapper);
      fragment.appendChild(wrapper.container);
    }

    for (const wrapper of this.dataTracks) {
      if (appendedIds.has(wrapper.track.id)) {
        continue;
      }

      orderedDataTracks.push(wrapper);
      fragment.appendChild(wrapper.container);
    }

    this.dataTracks = orderedDataTracks;
    this.tracksContainer.appendChild(fragment);
  }

  // FIXME: This goes counter to having data track settings drive the visualization
  // It would be better for the y axis to come through the data source
  public setCovYRange(covRange: Rng) {
    for (const track of this.dataTracks) {
      if (track.track.trackType == "dot-cov") {
        track.track.setYAxis(covRange);
      }
    }
  }

  renderTracks(settings: RenderSettings) {
    // Single track render, skip the full diff
    if (settings.targetTrackId != null) {
      const track = this.dataTracks.find(
        (track) => track.track.id == settings.targetTrackId,
      );
      console.log("Single track render for", track);
      track.track.render(settings);
      return;
    }

    const currIds = new Set(
      this.session.tracks.getTracks().map((setting) => setting.trackId),
    );

    const trackIds = new Set(this.dataTracks.map((track) => track.track.id));
    const addedIds = setDiff(currIds, trackIds);
    const removedIds = setDiff(trackIds, currIds);

    const showTrackContextMenu = getOpenTrackContextMenu(
      this.session,
      this.requestRender,
    );

    for (const settingId of addedIds) {
      const setIsExpanded = (trackId: string, isExpanded: boolean) => {

        console.log("Toggling expanded", trackId, isExpanded);

        this.session.tracks.setIsExpanded(trackId, isExpanded);
        this.requestRender({ saveLayoutChange: true, targetTrackId: trackId });
      };
      const setExpandedHeight = (trackId: string, expandedHeight: number) => {
        this.session.tracks.setExpandedHeight(trackId, expandedHeight);
      };

      const track = getTrack(
        this.session,
        this.dataSource,
        this.session.tracks.get(settingId),
        showTrackContextMenu,
        setIsExpanded,
        setExpandedHeight,
        () => this.colorBands,
        () => this.session.pos.getXRange(),
      );

      const trackWrapper = makeTrackContainer(track, null);
      this.dataTracks.push(trackWrapper);
      this.tracksContainer.appendChild(trackWrapper.container);
      track.initialize();
    }

    for (const id of removedIds) {
      const match = removeOne(this.dataTracks, (info) => info.track.id === id);
      this.tracksContainer.removeChild(match.container);
    }

    const trackHeights = this.session.profile.getTrackHeights();
    for (const track of this.dataTracks) {
      // Assigning track heights
      // FIXME: Consider approaches here. Might be that the track heights
      // should be part of the render object.
      if (bandTrackTypes.includes(track.track.trackType)) {
        track.track.setHeights(trackHeights.bandCollapsed);
      } else if (dotTrackTypes.includes(track.track.trackType)) {
        track.track.setHeights(
          trackHeights.dotCollapsed,
          trackHeights.dotExpanded,
        );
      }
      track.track.render(settings);
    }
  }

  private async updateColorBands() {
    this.colorBands = await getAnnotColorBands(this.session, this.dataSource);
  }
}

async function getAnnotColorBands(
  session: GensSession,
  dataSource: RenderDataSource,
) {
  let colorBands: RenderBand[] = [];
  for (const annotId of session.profile.getColorAnnotations()) {
    const annotBands = await dataSource.getAnnotationBands(
      annotId,
      session.pos.getChromosome(),
    );
    colorBands.push(...annotBands);

  }
  return colorBands;
}

customElements.define("track-view", TrackView);
