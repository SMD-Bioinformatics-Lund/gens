import { ANIM_TIME, COLORS, SIZES, STYLE } from "../../constants";
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

    // Sortable.create(this.tracksContainer, {
    //   animation: ANIM_TIME.medium,
    //   handle: `.${TRACK_HANDLE_CLASS}`,
    //   swapThreshold: 0.5,
    //   onEnd: (evt: SortableEvent) => {

    //     // FIXME: Would it make sense for this to first shift the settings
    //     // And then let the render sort things through

    //     const { oldIndex, newIndex } = evt;
    //     const [moved] = this.dataTracks.splice(oldIndex, 1);
    //     this.dataTracks.splice(newIndex, 0, moved);

    //     render({layout: true});
    //   },
    // });

    // setupDragging(this.tracksContainer, (dragRangePx: Rng) => {
    //   const inverted = true;
    //   const invertedXScale = this.getXScale(inverted);

    //   const scaledStart = invertedXScale(dragRangePx[0]);
    //   const scaledEnd = invertedXScale(dragRangePx[1]);
    //   const panDistance = scaledStart - scaledEnd;

    //   session.moveXRange(panDistance);
    //   render({ dataUpdated: true, positionOnly: true });
    // });

    // const covTracks: DataTrackWrapper[] = [];
    // const bafTracks: DataTrackWrapper[] = [];
    // const variantTracks: DataTrackWrapper[] = [];
    // const sampleAnnotTracks: DataTrackWrapper[] = [];

    // this.ideogramTrack = new IdeogramTrack(
    //   "ideogram",
    //   "Ideogram",
    //   { height: trackHeight.xs },
    //   async () => {
    //     return {
    //       xRange: session.getXRange(),
    //       chromInfo: await dataSources.getChromInfo(session.getChromosome()),
    //     };
    //   },
    //   (band: RenderBand) => {
    //     session.setViewRange([band.start, band.end]);
    //     render({ dataUpdated: true, positionOnly: true });
    //   },
    // );

    // const yAxisCov = {
    //   range: session.getCoverageRange(),
    //   label: "Log2 Ratio",
    //   hideLabelOnCollapse: false,
    //   hideTicksOnCollapse: false,
    // };
    // const overviewTrackCov = createOverviewTrack(
    //   "overview_cov",
    //   "Overview (cov)",
    //   () => dataSources.getOverviewCovData(session.getMainSample()),
    //   session.getCoverageRange(),
    //   chromSizes,
    //   chromClick,
    //   session,
    //   yAxisCov,
    // );

    // const yAxisBaf = {
    //   range: BAF_Y_RANGE,
    //   label: "B Allele Freq",
    //   hideLabelOnCollapse: false,
    //   hideTicksOnCollapse: false,
    // };
    // const overviewTrackBaf = createOverviewTrack(
    //   "overview_baf",
    //   "Overview (baf)",
    //   () => dataSources.getOverviewBafData(session.getMainSample()),
    //   BAF_Y_RANGE,
    //   chromSizes,
    //   chromClick,
    //   session,
    //   yAxisBaf,
    // );

    // this.overviewTracks = [overviewTrackBaf, overviewTrackCov];

    // for (const sample of samples) {
    //   const startExpanded = samples.length == 1 ? true : false;

    //   const sampleTracks = createSampleTracks(
    //     sample,
    //     dataSources,
    //     startExpanded,
    //     session,
    //     true,
    //     openTrackContextMenu,
    //   );

    //   this.sampleToTracks[sample.sampleId] = sampleTracks;

    //   covTracks.push(sampleTracks.cov);
    //   bafTracks.push(sampleTracks.baf);
    //   variantTracks.push(sampleTracks.variant);

    //   this.setupSampleAnnotationTracks(sample);
    // }

    // const genesTrack = createGeneTrack(
    //   "genes",
    //   "Genes",
    //   GENE_TRACK_TYPE,
    //   (chrom: string) => dataSources.getTranscriptBands(chrom),
    //   (id: string) => dataSources.getTranscriptDetails(id),
    //   session,
    //   openTrackContextMenu,
    // );

    // const trackSettings = [];

    // const tracks: DataTrackWrapper[] = [
    //   ...bafTracks,
    //   ...covTracks,
    //   ...variantTracks,
    //   ...sampleAnnotTracks,
    //   genesTrack,
    // ];

    // let positionTrackSettings: DataTrackSettings = {
    //   height: {
    //     collapsedHeight: STYLE.tracks.trackHeight.xs,
    //   },
    //   showLabelWhenCollapsed: false,
    //   isExpanded: false,
    //   isHidden: false,
    // };

    // this.positionTrack = new PositionTrack(
    //   "position",
    //   "Position",
    //   () => positionTrackSettings,
    //   (settings) => (positionTrackSettings = settings),
    //   () => session.getMarkerModeOn(),
    //   () => session.getXRange(),
    // );

    // const chromosomeRow = document.createElement("flex-row");
    // chromosomeRow.style.width = "100%";
    // this.positionLabel = document.createElement("div");
    // this.positionLabel.id = "position-label";
    // chromosomeRow.appendChild(this.positionLabel);
    // chromosomeRow.appendChild(this.ideogramTrack);

    // this.topContainer.appendChild(chromosomeRow);
    // this.topContainer.appendChild(this.positionTrack);
    // this.ideogramTrack.initialize();
    // this.ideogramTrack.renderLoading();
    // this.positionTrack.initialize();
    // this.positionTrack.renderLoading();

    // this.dataTracks = this.dataTracks;

    // const orderedTracks = loadTrackLayout(this.session, tracks);
    // orderedTracks.forEach(({ track, container }) => {
    //   this.tracksContainer.appendChild(container);
    //   track.initialize();
    //   track.renderLoading();
    // });

    // this.dataTracks = orderedTracks;

    // this.overviewTracks.forEach((track) => {
    //   this.bottomContainer.appendChild(track);
    //   track.initialize();
    //   track.renderLoading();
    // });

    // setupDrag(
    //   this.tracksContainer,
    //   () => session.getMarkerModeOn(),
    //   () => session.getXRange(),
    //   (range: Rng) => {
    //     session.setViewRange(range);
    //     render({ dataUpdated: true, positionOnly: true });
    //   },
    //   (range: Rng) => session.addHighlight(range),
    //   (id: string) => session.removeHighlight(id),
    // );

    // this.addElementListener(this.tracksContainer, "click", () => {
    //   if (keyLogger.heldKeys.Control) {
    //     const updatedRange = zoomOut(
    //       this.session.getXRange(),
    //       this.session.getCurrentChromSize(),
    //     );
    //     session.setViewRange(updatedRange);
    //   }
    // });
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

  public render(settings: RenderSettings) {
    if (settings.dataUpdated) {
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
    ).then(({ settings, samples }) => {
      this.dataTrackSettings = settings;
      this.lastRenderedSamples = samples;
      this.renderTracks();
    });

    // FIXME: Only the active one needs to be rendered isn't it?
    Object.values(this.trackPages).forEach((trackPage) =>
      trackPage.render(settings),
    );

    // this.ideogramTrack.render(settings);
    // this.positionTrack.render(settings);
    // this.dataTracks.forEach((trackInfo) => trackInfo.track.render(settings));
    // this.overviewTracks.forEach((track) => track.render(settings));

    // const [startChrSeg, endChrSeg] = this.session.getChrSegments();

    // this.positionLabel.innerHTML = `${startChrSeg} - ${endChrSeg}`;
  }

  renderTracks() {
    console.log("renderTracks in tracks manager hit");

    const currIds = new Set(
      this.dataTrackSettings.map((setting) => setting.trackId),
    );
    const trackIds = new Set(this.dataTracks.map((track) => track.track.id));
    const addedIds = setDiff(currIds, trackIds);
    const removedIds = setDiff(trackIds, currIds);

    // Aha, adding new things here
    for (const settingId of addedIds) {
      const setting = this.dataTrackSettings.filter(
        (setting) => setting.trackId == settingId,
      )[0];
      let rawTrack;
      if (setting.trackType == "annotation") {
        const getAnnotationBands = () =>
          this.dataSource.getAnnotationBands(
            setting.trackId,
            this.session.getChromosome(),
          );
        rawTrack = this.getBandTrack(setting, getAnnotationBands);
      } else if (setting.trackType == "gene-list") {
        const getGeneListBands = () =>
          this.dataSource.getGeneListBands(
            setting.trackId,
            this.session.getChromosome(),
          );
        rawTrack = this.getBandTrack(setting, getGeneListBands);
      } else if (setting.trackType == "sample-annotation") {
        const getSampleAnnotBands = () =>
          this.dataSource.getSampleAnnotationBands(
            setting.trackId,
            this.session.getChromosome(),
          );
        rawTrack = this.getBandTrack(setting, getSampleAnnotBands);
      } else if (setting.trackType == "variant") {
        // FIXME: Generalize the rank score threshold. Where did it come from before?
        const getSampleAnnotBands = () =>
          this.dataSource.getVariantBands(
            setting.sample,
            this.session.getChromosome(),
            4,
          );
        rawTrack = this.getBandTrack(setting, getSampleAnnotBands);
      } else if (setting.trackType == "dot-cov") {
        const getSampleCovDots = () =>
          this.dataSource.getCovData(
            setting.sample,
            this.session.getChromosome(),
            this.session.getXRange(),
          );
        rawTrack = this.getDotTrack(setting, getSampleCovDots);
      } else if (setting.trackType == "dot-baf") {
        const getSampleBafDots = () =>
          this.dataSource.getBafData(
            setting.sample,
            this.session.getChromosome(),
            this.session.getXRange(),
          );
        rawTrack = this.getDotTrack(setting, getSampleBafDots);
      } else {
        throw Error(`Not yet supported track type ${setting.trackType}`);
      }

      const trackWrapper = makeTrackContainer(rawTrack, null);
      this.dataTracks.push(trackWrapper);
      this.tracksContainer.appendChild(trackWrapper.container);
      rawTrack.initialize();
      // rawTrack.render({});
    }

    // And removing things here
    for (const id of removedIds) {
      const match = removeOne(this.dataTracks, (info) => info.track.id === id);
      this.tracksContainer.removeChild(match.container);
    }

    // But we should render everything here isn't it
    for (const track of this.dataTracks) {
      track.track.render({});
    }
  }

  getDotTrack(
    setting: DataTrackSettingsNew,
    getDots: () => Promise<RenderDot[]>,
  ): DotTrack {
    const dotTrack = new DotTrack(
      setting.trackId,
      setting.trackLabel,
      setting.trackType,
      () => {
        return setting;
      },
      (settings) => {},
      () => this.session.getXRange(),
      () => {
        return getDots().then((dots) => {
          return {
            dots,
          };
        });
      },
      () => {},
      () => false,
    );
    return dotTrack;
  }

  getBandTrack(
    setting: DataTrackSettingsNew,
    getRenderBands: () => Promise<RenderBand[]>,
  ): BandTrack {
    const rawTrack = new BandTrack(
      setting.trackId,
      setting.trackLabel,
      setting.trackType,
      () => {
        // console.warn("Attempting to retrieve setting", setting);
        return setting;
      },
      (_settings) => {
        // console.warn("Attempting to update setting", setting);
        // fnSettings = settings;
        // session.setTrackExpanded(trackId, settings.isExpanded);
      },
      () => this.session.getXRange(),
      () => {
        async function getBandTrackData(
          getAnnotation: () => Promise<RenderBand[]>,
        ): Promise<BandTrackData> {
          const bands = await getAnnotation();
          return {
            bands,
          };
        }

        return getBandTrackData(getRenderBands);
      },
      () => {
        console.warn("Attempting to open context menu");
      },
      () => {
        console.warn("Attempting to open track context menu");
      },
      // openContextMenuId,
      // openTrackContextMenu,
      () => this.session.getMarkerModeOn(),
    );
    return rawTrack;
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

/**
 * Given a Select element state and the last used settings
 * Calculate what settings have been added and what IDs removed
 */
const getSettingsDiffs = (
  currentlySelectedIds: string[],
  previousSettingsIds: string[],
  trackType: TrackType,
): { newSettings: DataTrackSettingsNew[]; removedIds: string[] } => {
  // FIXME: Ponder here a bit more

  const removedIds = setDiff(
    new Set(previousSettingsIds),
    new Set(currentlySelectedIds),
  );
  const newIds = setDiff(
    new Set(currentlySelectedIds),
    new Set(previousSettingsIds),
  );

  // const rememberedIds = previousSettings.map((setting) => setting.trackId);
  // const currentIds = currentlySelected.map(())

  // const { onlyAIds: removedIds, onlyB: newSources } = getDifferences(
  //   previousSettings,
  //   currentlySelected,
  //   (setting) => setting.trackId,
  //   (source) => source.id,
  // );

  // FIXME: Aha, this is the original location. What to do with this one?
  const newSettings = Array.from(newIds).map((id) => {
    const newSetting: DataTrackSettingsNew = {
      trackId: id,
      trackLabel: "PLACEHOLDER",
      trackType,
      height: { collapsedHeight: 20 },
      showLabelWhenCollapsed: true,
      yAxis: null,
      isExpanded: false,
      isHidden: false,
    };
    return newSetting;
    // returnSettings.push(newSetting);
  });

  return {
    newSettings,
    removedIds: [...removedIds],
  };
};

async function syncDataTrackSettings(
  origTrackSettings: DataTrackSettingsNew[],
  session: GensSession,
  dataSources: RenderDataSource,
  lastRenderedSamples: Sample[],
): Promise<{ settings: DataTrackSettingsNew[]; samples: Sample[] }> {
  const annotSources = session.getAnnotationSources({
    selectedOnly: true,
  });
  const geneListSources = session.getGeneListSources({
    selectedOnly: true,
  });

  // FIXME: Let's start with assuming unique sample IDs
  const samples = session.getSamples();
  const sampleIds = samples.map((sample) => sample.sampleId);
  const lastRenderedSampleIds = lastRenderedSamples.map(
    (sample) => sample.sampleId,
  );
  const sampleAnnotRemovedIds = setDiff(
    new Set(lastRenderedSampleIds),
    new Set(sampleIds),
  );
  const newSampleIds = setDiff(
    new Set(sampleIds),
    new Set(lastRenderedSampleIds),
  );

  // FIXME: Assuming unique sample IDs here. What to do about that.
  // const { onlyAIds: sampleAnnotRemovedIds, onlyB: newSamples } = getDifferences(
  //   lastRenderedSamples,
  //   samples,
  //   (sample) => sample.sampleId,
  //   (sample) => sample.sampleId,
  // );

  const origAnnotTrackSettings = origTrackSettings.filter(
    (track) => track.trackType == "annotation",
  );
  console.log(
    "Annot sources",
    annotSources,
    "origAnnotTrackSettings",
    origAnnotTrackSettings,
  );
  const annotUpdates = getSettingsDiffs(
    annotSources.map((source) => source.id),
    origAnnotTrackSettings.map((value) => value.trackId),
    "annotation",
  );
  console.log("Annot updates", annotUpdates);

  const origGeneListTrackSettings = origTrackSettings.filter(
    (track) => track.trackType == "gene-list",
  );
  const geneListUpdates = getSettingsDiffs(
    geneListSources.map((geneList) => geneList.id),
    origGeneListTrackSettings.map((trackSetting) => trackSetting.trackId),
    "gene-list",
  );

  const sampleSettings = [];
  for (const sampleId of newSampleIds) {
    const sample = session.getSample(sampleId);
    const sampleSources = await dataSources.getSampleAnnotSources(
      sample.caseId,
      sample.sampleId,
    );

    const cov: DataTrackSettingsNew = {
      trackId: `${sample.sampleId}_log2_cov`,
      trackLabel: `${sample.sampleId} cov`,
      trackType: "dot-cov",
      sample,
      height: { collapsedHeight: 20, expandedHeight: 40 },
      showLabelWhenCollapsed: true,
      yAxis: {
        range: [-2, 2],
        label: "Cov",
        hideLabelOnCollapse: false,
        hideTicksOnCollapse: false,
      },
      isExpanded: false,
      isHidden: false,
    };

    const baf: DataTrackSettingsNew = {
      trackId: `${sample.sampleId}_baf`,
      trackLabel: `${sample.sampleId} baf`,
      trackType: "dot-baf",
      sample,
      height: { collapsedHeight: 20, expandedHeight: 40 },
      showLabelWhenCollapsed: true,
      yAxis: {
        range: [-2, 2],
        label: "Cov",
        hideLabelOnCollapse: false,
        hideTicksOnCollapse: false,
      },
      isExpanded: false,
      isHidden: false,
    };

    const variants: DataTrackSettingsNew = {
      trackId: `${sample.sampleId}_variants`,
      trackLabel: `${sample.sampleId} Variants`,
      trackType: "variant",
      sample,
      height: { collapsedHeight: 20, expandedHeight: 40 },
      showLabelWhenCollapsed: true,
      yAxis: null,
      isExpanded: false,
      isHidden: false,
    };

    const sampleAnnots = [];
    for (const source of sampleSources) {
      const sampleAnnot: DataTrackSettingsNew = {
        trackId: source.id,
        trackLabel: source.name,
        trackType: "sample-annotation",
        sample,
        height: { collapsedHeight: 20 },
        showLabelWhenCollapsed: true,
        yAxis: null,
        isExpanded: false,
        isHidden: false,
      };
      sampleAnnots.push(sampleAnnot);
    }
    sampleSettings.push(cov, baf, variants, ...sampleAnnots);
  }

  const returnTrackSettings = [...origTrackSettings];
  const removeIds = [
    ...annotUpdates.removedIds,
    ...geneListUpdates.removedIds,
    ...sampleAnnotRemovedIds,
  ];
  for (const removeId of removeIds) {
    removeOne(returnTrackSettings, (setting) => setting.trackId == removeId);
  }

  returnTrackSettings.push(...annotUpdates.newSettings);
  returnTrackSettings.push(...geneListUpdates.newSettings);
  returnTrackSettings.push(...sampleSettings);

  console.log("Return track settings", returnTrackSettings);

  return { settings: returnTrackSettings, samples };
}

customElements.define("track-view", TrackView);
