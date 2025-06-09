import { ANIM_TIME, STYLE } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import Sortable, { SortableEvent } from "sortablejs";
import {
  createAnnotTrack,
  createDotTrack,
  createGeneTrack,
  createOverviewTrack,
  createVariantTrack,
  getTrackInfo as makeTrackContainer,
  TRACK_HANDLE_CLASS,
} from "./utils";
import { DataTrack, DataTrackSettings } from "../tracks/base_tracks/data_track";
import { setupDrag, setupDragging } from "../../movements/dragging";
import { GensSession } from "../../state/gens_session";
import { getLinearScale } from "../../draw/render_utils";
import { OverviewTrack } from "../tracks/overview_track";
import { IdeogramTrack } from "../tracks/ideogram_track";
import { BAF_Y_RANGE, COV_Y_RANGE } from "./tracks_manager";
import { TrackMenu } from "../side_menu/track_menu";
import { DotTrack } from "../tracks/dot_track";
import { keyLogger } from "../util/keylogger";
import { zoomOut } from "../../util/navigation";
import { BandTrack } from "../tracks/band_track";
import { TrackHeights } from "../side_menu/settings_menu";
import { moveElement } from "../../util/collections";
import { renderHighlights } from "../tracks/base_tracks/interactive_tools";
import { removeOne } from "../../util/utils";
import { PositionTrack } from "../tracks/position_track";

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

export interface TrackViewTrackInfo {
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

  private dataTracks: TrackViewTrackInfo[] = [];
  private ideogramTrack: IdeogramTrack;
  private positionTrack: PositionTrack;
  private overviewTracks: OverviewTrack[] = [];

  private openTrackContextMenu: (track: DataTrack) => void;
  private trackPages: Record<string, TrackMenu> = {};

  private sampleToTracks: Record<
    string,
    {
      cov: TrackViewTrackInfo;
      baf: TrackViewTrackInfo;
      variant: TrackViewTrackInfo;
    }
  > = {};

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

    const covTracks: TrackViewTrackInfo[] = [];
    const bafTracks: TrackViewTrackInfo[] = [];
    const variantTracks: TrackViewTrackInfo[] = [];

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
      range: COV_Y_RANGE,
      label: "Log2 Ratio",
      hideLabelOnCollapse: false,
      hideTicksOnCollapse: false,
    };
    const overviewTrackCov = createOverviewTrack(
      "overview_cov",
      "Overview (cov)",
      () => dataSources.getOverviewCovData(samples[0]),
      COV_Y_RANGE,
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
      () => dataSources.getOverviewBafData(samples[0]),
      BAF_Y_RANGE,
      chromSizes,
      chromClick,
      session,
      yAxisBaf,
    );

    this.overviewTracks = [overviewTrackBaf, overviewTrackCov];

    for (const sample of samples) {
      const startExpanded = samples.length == 1 ? true : false;

      const sampleTracks = createSampleTracks(
        sample,
        dataSources,
        startExpanded,
        session,
        true,
        openTrackContextMenu,
      );

      this.sampleToTracks[sample.sampleId] = sampleTracks;

      covTracks.push(sampleTracks.cov);
      bafTracks.push(sampleTracks.baf);
      variantTracks.push(sampleTracks.variant);
    }

    const genesTrack = createGeneTrack(
      "genes",
      "Genes",
      (chrom: string) => dataSources.getTranscriptBands(chrom),
      (id: string) => dataSources.getTranscriptDetails(id),
      session,
      openTrackContextMenu,
    );

    const tracks: TrackViewTrackInfo[] = [
      ...bafTracks,
      ...covTracks,
      ...variantTracks,
      genesTrack,
    ];

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
      session,
    );

    const chromosomeRow = document.createElement("flex-row");
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

    tracks.forEach(({ track, container }) => {
      this.tracksContainer.appendChild(container);
      track.initialize();
      track.renderLoading();
    });

    this.dataTracks = tracks;

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
          showColor: true,
        };
        trackPage.configure(track.id, trackSettings);
        this.trackPages[track.id] = trackPage;
      }

      const trackPage = this.trackPages[track.id];
      this.session.showContent(track.label, [trackPage]);

      trackPage.initialize(
        (settings: { selectedOnly: boolean }) =>
          this.session.getAnnotationSources(settings),
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

  public addSample(sample: Sample, isTrackViewTrack: boolean) {
    const sampleTracks = createSampleTracks(
      sample,
      this.dataSource,
      false,
      this.session,
      isTrackViewTrack,
      this.openTrackContextMenu,
    );

    this.dataTracks.push(
      sampleTracks.cov,
      sampleTracks.baf,
      sampleTracks.variant,
    );

    this.tracksContainer.appendChild(sampleTracks.cov.container);
    this.tracksContainer.appendChild(sampleTracks.baf.container);
    this.tracksContainer.appendChild(sampleTracks.variant.container);

    Object.values(sampleTracks).map(({ track }) => track.initialize());
  }

  public removeSample(sample: Sample) {
    const trackMatches = (trackInfo: TrackViewTrackInfo) =>
      trackInfo.sample != null &&
      trackInfo.sample.sampleId === sample.sampleId &&
      trackInfo.sample.caseId === sample.caseId;

    const removeInfos = this.dataTracks.filter((track: TrackViewTrackInfo) =>
      trackMatches(track),
    );

    this.dataTracks = this.dataTracks.filter(
      (track: TrackViewTrackInfo) => !trackMatches(track),
    );

    for (const removeInfo of removeInfos) {
      this.tracksContainer.removeChild(removeInfo.container);
    }
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

  public render(settings: RenderSettings) {
    renderHighlights(
      this.tracksContainer,
      this.session.getCurrentHighlights(),
      this.getXScale(),
      [STYLE.yAxis.width, this.tracksContainer.offsetWidth],
      (id) => this.session.removeHighlight(id),
    );

    updateAnnotationTracks(
      this.dataTracks.filter((info) => info.track.trackType == "annotation"),
      (sourceId: string, chrom: string) =>
        this.dataSource.getAnnotationBands(sourceId, chrom),
      (bandId: string) => this.dataSource.getAnnotationDetails(bandId),
      this.session,
      this.openTrackContextMenu,
      (track: DataTrack) => {
        const annotTrack = makeTrackContainer(track, null);
        this.dataTracks.push(annotTrack);
        this.tracksContainer.appendChild(annotTrack.container);
        annotTrack.track.initialize();
      },
      (id: string) => {
        const match = removeOne(
          this.dataTracks,
          (info) => info.track.id === id,
        );
        this.tracksContainer.removeChild(match.container);
      },
    );

    // FIXME: Only the active one needs to be rendered isn't it?
    Object.values(this.trackPages).forEach((trackPage) =>
      trackPage.render(settings),
    );

    this.ideogramTrack.render(settings);
    this.positionTrack.render(settings);
    this.dataTracks.forEach((trackInfo) => trackInfo.track.render(settings));
    this.overviewTracks.forEach((track) => track.render(settings));

    const [startChrSeg, endChrSeg] = this.session.getChrSegments();

    this.positionLabel.innerHTML = `${startChrSeg} - ${endChrSeg}`;
  }
}

function getDataTrackInfoById(
  tracks: TrackViewTrackInfo[],
  trackId: string,
): TrackViewTrackInfo {
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].track.id == trackId) {
      const track = tracks[i];
      return track;
    }
  }
  console.error("Did not find any track with ID", trackId);
}

function createSampleTracks(
  sample: Sample,
  dataSources: RenderDataSource,
  startExpanded: boolean,
  session: GensSession,
  isTrackViewTrack: boolean,
  openTrackContextMenu: (track: DataTrack) => void,
): {
  cov: TrackViewTrackInfo;
  baf: TrackViewTrackInfo;
  variant: TrackViewTrackInfo;
} {
  const coverageTrack = createDotTrack(
    `${sample.sampleId}_log2_cov`,
    `${sample.sampleId} cov`,
    sample,
    (sample: Sample) =>
      dataSources.getCovData(
        sample,
        session.getChromosome(),
        session.getXRange(),
      ),
    {
      startExpanded,
      yAxis: {
        range: COV_Y_RANGE,
        label: "Log2 Ratio",
        hideLabelOnCollapse: true,
        hideTicksOnCollapse: true,
      },
      hasLabel: isTrackViewTrack,
      fixedChrom: null,
    },
    session,
    openTrackContextMenu,
  );
  const bafTrack = createDotTrack(
    `${sample.sampleId}_log2_baf`,
    `${sample.sampleId} baf`,
    sample,
    (sample: Sample) =>
      dataSources.getBafData(
        sample,
        session.getChromosome(),
        session.getXRange(),
      ),
    {
      startExpanded,
      yAxis: {
        range: BAF_Y_RANGE,
        label: "B Allele Freq",
        hideLabelOnCollapse: true,
        hideTicksOnCollapse: true,
      },
      hasLabel: isTrackViewTrack,
      fixedChrom: null,
    },
    session,
    openTrackContextMenu,
  );

  // FIXME: Small util
  const isNotMainSample =
    sample.sampleType != null &&
    !["proband", "tumor"].includes(sample.sampleType);

  const variantTrack = createVariantTrack(
    sample.sampleId,
    `${sample.sampleId}_variants`,
    `${sample.sampleId} Variants`,
    () => dataSources.getVariantBands(sample, session.getChromosome()),
    (variantId: string) => dataSources.getVariantDetails(variantId),
    (variantId: string) => session.getVariantURL(variantId),
    session,
    openTrackContextMenu,
    {
      height: {
        collapsedHeight: STYLE.bandTrack.trackViewHeight,
      },
      showLabelWhenCollapsed: true,
      isExpanded: false,
      isHidden: isNotMainSample,
      // isHidden: isNotMainSample
    },
  );

  const cov = makeTrackContainer(coverageTrack, sample);
  const baf = makeTrackContainer(bafTrack, sample);
  const variant = makeTrackContainer(variantTrack, sample);

  // if (isNotMainSample) {
  //   variant.track.hide();
  //   // sampleTracks.variant.track.hide();
  // }

  return {
    cov,
    baf,
    variant,
  };
}

function updateAnnotationTracks(
  currAnnotTracks: TrackViewTrackInfo[],
  getAnnotationBands: (
    sourceId: string,
    chrom: string,
  ) => Promise<RenderBand[]>,
  getAnnotationDetails: (bandId: string) => Promise<ApiAnnotationDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  addTrack: (track: DataTrack) => void,
  removeTrack: (id: string) => void,
) {
  const sources = session.getAnnotationSources({
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

  newSources.forEach((source) => {
    const hasLabel = true;
    const newTrack = createAnnotTrack(
      source.id,
      source.label,
      () => getAnnotationBands(source.id, session.getChromosome()),
      (bandId: string) => getAnnotationDetails(bandId),
      session,
      openTrackContextMenu,
      {
        height: STYLE.bandTrack.trackViewHeight,
        showLabelWhenCollapsed: hasLabel,
      },
    );
    addTrack(newTrack);
  });

  removedSourceIds.forEach((id) => {
    removeTrack(id);
  });
}

customElements.define("track-view", TrackView);
