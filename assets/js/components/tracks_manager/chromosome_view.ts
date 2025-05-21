import { CHROMOSOMES, STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { DataTrackInfo } from "./track_view";
import {
  createAnnotTrack,
  createDataTrackWrapper,
  createDotTrack,
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

  private tracks: DataTrack[] = [];

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
      const subgroupLabel = document.createTextNode(`C: ${chrom}`);
      subgroup.appendChild(subgroupLabel);
      this.chromosomeTracksContainer.appendChild(subgroup);

      const onAddTrack = (trackInfo: DataTrackInfo) => {
        console.log("Adding track info", trackInfo);
        this.tracks.push(trackInfo.track);
        subgroup.appendChild(trackInfo.container);
        trackInfo.track.initialize();
      };

      setupDotTracks(
        session,
        sampleIds,
        chrom,
        openTrackContextMenu,
        (sampleId: string, chrom: string) =>
          dataSource.getCovData(sampleId, chrom),
        onAddTrack,
      );
      setupAnnotTracks(session, chrom, dataSource, onAddTrack);
    }
  }

  render(settings: RenderSettings) {
    // updateAnnotationTracks(

    // )

    for (const track of this.tracks) {
      track.render(settings);
    }
  }
}

function updateAnnotationTracks(
  currAnnotTracks: string[],
  getAnnotationBands: (
    sourceId: string,
    chrom: string,
  ) => Promise<RenderBand[]>,
  getAnnotationDetails: (bandId: string) => Promise<ApiAnnotationDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  addTrack: (track: DataTrack) => void,
  removeTrack: (id: string) => void,
) {}

function setupAnnotTracks(
  session: GensSession,
  chrom: string,
  dataSource: RenderDataSource,
  addTrack: (trackInfo: DataTrackInfo) => void,
) {
  const annotSources = session.getAnnotationSources({
    selectedOnly: true,
  });

  console.log("Annotation sources", annotSources);

  for (const { id: annotId, label: annotLabel } of annotSources) {
    const trackId = `${annotLabel}_${chrom}_annot`;
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
