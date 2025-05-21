import { CHROMOSOMES, SIZES, STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { removeOne } from "../../util/utils";
import { BandTrack } from "../tracks/band_track";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { DataTrackInfo } from "./track_view";
import {
  createAnnotTrack,
  createDataTrackWrapper,
  createDotTrack,
  getTrackInfo,
} from "./utils";

const COV_Y_RANGE: [number, number] = [-2, 2];

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div id="chromosome-tracks-container"></div>
`;

export class ChromosomeView extends ShadowBaseElement {
  private chromosomeTracksContainer: HTMLDivElement;
  private isInitialized: boolean;
  private sampleIds: string[];
  private session: GensSession;
  private dataSource: RenderDataSource;
  private openTrackContextMenu: (track: DataTrack) => void;

  // private currentAnnotationIds: Set<string> = new Set();

  private tracks: DataTrack[] = [];

  private chromosomeGroups: Record<string, HTMLDivElement> = {};

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.chromosomeTracksContainer = this.root.querySelector(
      "#chromosome-tracks-container",
    );
  }

  initialize(
    session: GensSession,
    sampleIds: string[],
    dataSource: RenderDataSource,
    openTrackContextMenu: (track: DataTrack) => void,
  ) {
    this.session = session;
    this.sampleIds = sampleIds;
    this.dataSource = dataSource;
    this.openTrackContextMenu = openTrackContextMenu;

    for (const chrom of CHROMOSOMES) {
      const subgroup = document.createElement("div") as HTMLDivElement;
      subgroup.style.paddingBottom = `${SIZES.xxs}px`;
      // subgroup.style.display = "flex";
      // subgroup.style.flexDirection = "row";

      // const subgroupLabel = document.createTextNode(`C: ${chrom}`);
      // subgroup.appendChild(subgroupLabel);

      // const tracksCol = document.createElement("div") as HTMLDivElement;
      // tracksCol.style.display = "flex";
      // tracksCol.style.flexDirection = "column";
      // subgroup.appendChild(tracksCol);

      this.chromosomeTracksContainer.appendChild(subgroup);
      this.chromosomeGroups[chrom] = subgroup;

      setupDotTracks(
        session,
        sampleIds,
        chrom,
        openTrackContextMenu,
        (sampleId: string, chrom: string) =>
          dataSource.getCovData(sampleId, chrom),
        (trackInfo: DataTrackInfo) => {
          this.onAddTrack(subgroup, trackInfo);
        },
      );

      const annotSources = session.getAnnotationSources({
        selectedOnly: true,
      });
      // for (const { id } of annotSources) {
      //   this.currentAnnotationIds.add(id);
      // }
      setupAnnotTracks(
        annotSources,
        session,
        chrom,
        dataSource,
        (trackInfo: DataTrackInfo) => this.onAddTrack(subgroup, trackInfo),
      );
    }
  }

  public render(settings: RenderSettings) {

    // FIXME: Util
    const chr1Group = this.chromosomeGroups["1"] as HTMLDivElement;
    const bandTracks = [...chr1Group.querySelectorAll("band-track")] as BandTrack[];
    console.log("Current band tracks", bandTracks);
    // IDs are on the format source_chr
    // Can this be done neater?
    const currentBandTracks = bandTracks.map((track) => track.id.split("_")[0]);

    updateAnnotationTracks(
      this.session.getAnnotationSources({ selectedOnly: true }),
      currentBandTracks,
      (sourceId: string, chrom: string) =>
        this.dataSource.getAnnotationBands(sourceId, chrom),
      (bandId: string) => this.dataSource.getAnnotationDetails(bandId),
      this.session,
      this.openTrackContextMenu,
      (track: DataTrackInfo, chrom: string) => {
        const subgroup = this.chromosomeGroups[chrom];

        this.onAddTrack(subgroup, track);
      },
      (id: string) => {
        this.onRemoveTrack(id);
      },
    );

    for (const track of this.tracks) {
      track.render(settings);
    }
  }

  private onAddTrack(subgroup: HTMLDivElement, trackInfo: DataTrackInfo) {
    this.tracks.push(trackInfo.track);
    subgroup.appendChild(trackInfo.container);
    trackInfo.track.initialize();
  }

  private onRemoveTrack(sourceId: string) {
    console.log("Attempting to remove source", sourceId);

    for (const chrom of CHROMOSOMES) {
      const subgroup = this.chromosomeGroups[chrom];
      const trackId = `${sourceId}_${chrom}`;
      console.log("Track id", trackId, "tracks", this.tracks);
      const removedTrack = removeOne(
        this.tracks,
        (track: DataTrack) => track.id == trackId,
      );
      // FIXME: Should the info be used here as well?
      subgroup.removeChild(removedTrack.parentElement);
    }
  }
}

// FIXME: Should maybe flatten this one a bit?
// Separating the source ID logic
// Having a shared track setup logic with the init
function updateAnnotationTracks(
  sources: { id: string; label: string }[],
  trackIds: string[],
  getAnnotationBands: (
    sourceId: string,
    chrom: string,
  ) => Promise<RenderBand[]>,
  getAnnotationDetails: (bandId: string) => Promise<ApiAnnotationDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  addTrack: (track: DataTrackInfo, chrom: string) => void,
  removeTrack: (sourceId: string) => void,
) {
  // FIXME: Merge with the track view function
  const sourceIds = sources.map((source) => source.id);

  const newSources = sources.filter((source) => !trackIds.includes(source.id));
  const removedSourceIds = trackIds.filter((id) => !sourceIds.includes(id));

  console.log("New sources", newSources, "removed sources", removedSourceIds);

  newSources.forEach((source) => {
    const hasLabel = false;

    for (const chrom of CHROMOSOMES) {
      const trackId = `${source.id}_${chrom}`;
      const newTrack = createAnnotTrack(
        trackId,
        source.label,
        () => getAnnotationBands(source.id, chrom),
        (bandId: string) => getAnnotationDetails(bandId),
        session,
        openTrackContextMenu,
        STYLE.tracks.trackHeight.extraThin,
        hasLabel,
      );
      const trackInfo = getTrackInfo(newTrack, null);
      addTrack(trackInfo, chrom);
    }
  });

  removedSourceIds.forEach((sourceId) => {
    removeTrack(sourceId);
  });
}

function setupAnnotTracks(
  annotSources: { id: string; label: string }[],
  session: GensSession,
  chrom: string,
  dataSource: RenderDataSource,
  addTrack: (trackInfo: DataTrackInfo) => void,
) {
  for (const { id: annotId, label: annotLabel } of annotSources) {
    const trackId = `${annotId}_${chrom}`;
    const trackLabel = `${annotLabel} ${chrom}`;

    const hasLabel = false;
    const annotTrack = createAnnotTrack(
      trackId,
      trackLabel,
      () => dataSource.getAnnotationBands(annotId, chrom),
      (bandId: string) => dataSource.getAnnotationDetails(bandId),
      session,
      (_track) => {},
      STYLE.tracks.trackHeight.extraThin,
      hasLabel,
    );
    const annotTrackWrapper = createDataTrackWrapper(annotTrack);
    const trackInfo: DataTrackInfo = {
      track: annotTrack,
      container: annotTrackWrapper,
      sampleId: null,
    };
    addTrack(trackInfo);
  }
}

function setupDotTracks(
  session: GensSession,
  sampleIds: string[],
  chrom: string,
  openTrackContextMenu: (track: DataTrack) => void,
  getCovData: (sampleId: string, chrom: string) => Promise<RenderDot[]>,
  onAddTrack: (track: DataTrackInfo) => void,
) {
  for (const sampleId of sampleIds) {
    const trackId = `${sampleId}_${chrom}_cov`;
    const trackLabel = `${sampleId} ${chrom}`;
    const dotTrack = createDotTrack(
      trackId,
      trackLabel,
      sampleId,
      // FIXME: Control zoom levels for getCovData
      () => getCovData(sampleId, chrom),
      // () => this.dataSource.getCovData(sampleId, chrom),
      {
        startExpanded: false,
        yAxis: {
          range: COV_Y_RANGE,
          reverse: true,
          label: chrom,
          hideLabelOnCollapse: false,
          hideTicksOnCollapse: true,
        },
        hasLabel: false,
      },
      session,
      openTrackContextMenu,
    );
    const trackWrapper = createDataTrackWrapper(dotTrack);
    const trackInfo: DataTrackInfo = {
      track: dotTrack,
      container: trackWrapper,
      sampleId,
    };
    onAddTrack(trackInfo);
  }
}

customElements.define("chromosome-view", ChromosomeView);
