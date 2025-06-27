import { CHROMOSOMES, COLORS, SIZES, TRACK_HEIGHTS } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { div, removeOne } from "../../util/utils";
import { TrackHeights } from "../side_menu/settings_menu";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import {
  createAnnotTrack,
  createDataTrackWrapper,
  createDotTrack,
} from "./utils";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #chromosome-tracks-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border-right: ${SIZES.one}px solid ${COLORS.lightGray};
    }
  </style>
  <div id="chromosome-tracks-container"></div>
`;

interface ChromosomeGroup {
  samples: HTMLDivElement;
  annotations: HTMLDivElement;
}

interface ChromViewTrackInfo {
  track: DataTrack;
  container: HTMLDivElement;
  chromosome: string;
  sourceId: string | null;
  sampleId: string | null;
  type: "annotation" | "coverage";
}

export class ChromosomeView extends ShadowBaseElement {
  private chromosomeTracksContainer: HTMLDivElement;
  private session: GensSession;
  private dataSource: RenderDataSource;
  private tracks: ChromViewTrackInfo[] = [];
  private chromosomeGroups: Record<string, ChromosomeGroup> = {};

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.chromosomeTracksContainer = this.root.querySelector(
      "#chromosome-tracks-container",
    );
  }

  async initialize(session: GensSession, dataSource: RenderDataSource) {
    this.session = session;
    this.dataSource = dataSource;

    for (const chrom of CHROMOSOMES) {
      const {
        container: chromContainer,
        sampleGroup,
        annotGroup,
      } = getGroupElement(chrom);

      this.chromosomeTracksContainer.appendChild(chromContainer);
      this.chromosomeGroups[chrom] = {
        samples: sampleGroup,
        annotations: annotGroup,
      };
    }

    const settingSample = this.session.getSamples()[0];
    const sampleAnnots = await dataSource.getSampleAnnotSources(
      settingSample.caseId,
      settingSample.sampleId,
    );

    for (const chrom of CHROMOSOMES) {
      const chromGroup = this.chromosomeGroups[chrom];

      const getCovData = (sample: Sample, chrom: string) =>
        this.dataSource.getCovData(sample, chrom, [
          1,
          this.session.getChromSize(chrom),
        ]);

      addSampleTracks(
        settingSample,
        chrom,
        (sample: Sample) => getCovData(sample, chrom),
        (trackInfo: ChromViewTrackInfo) => {
          this.onAddTrack(chromGroup.samples, trackInfo);
        },
        () => session.getMarkerModeOn(),
        () => [1, session.getChromSize("1")],
        () => session.getCoverageRange(),
        () => session.getTrackHeights(),
      );

      addSampleAnnotationTracks(
        this.session,
        settingSample,
        chrom,
        sampleAnnots,
        (trackId: string, chrom: Chromosome) =>
          this.dataSource.getSampleAnnotationBands(trackId, chrom),
        (id: string) => this.dataSource.getSampleAnnotationDetails(id),
        (trackInfo: ChromViewTrackInfo) => {
          this.onAddTrack(chromGroup.annotations, trackInfo);
        },
      );
    }
  }

  public render(settings: RenderSettings) {
    for (const track of this.tracks) {
      track.track.render(settings);
    }
  }

  private onAddTrack(subgroup: HTMLDivElement, trackInfo: ChromViewTrackInfo) {
    this.tracks.push(trackInfo);
    subgroup.appendChild(trackInfo.container);
    trackInfo.track.initialize();
  }

  private onRemoveTrack(sourceId: string, type: "samples" | "annotations") {
    for (const chrom of CHROMOSOMES) {
      const subgroup = this.chromosomeGroups[chrom][type];
      const trackId = `${sourceId}_${chrom}`;
      const removedTrack = removeOne(
        this.tracks,
        (track: ChromViewTrackInfo) => track.track.id == trackId,
      );
      // FIXME: Should the info be used here as well?
      subgroup.removeChild(removedTrack.container);
    }
  }
}

function addSampleTracks(
  sample: Sample,
  chrom: Chromosome,
  getCovData: (sample: Sample, chrom: Chromosome) => Promise<RenderDot[]>,
  onAddTrack: (track: ChromViewTrackInfo) => void,
  getMarkerModeOn: () => boolean,
  getXRange: () => Rng,
  getCoverageRange: () => Rng,
  getTrackHeights: () => TrackHeights,
) {
  const trackId = `${sample.sampleId}_${chrom}`;
  const trackLabel = sample.sampleId;
  const dotTrack = createDotTrack(
    trackId,
    trackLabel,
    sample,
    () => getCovData(sample, chrom),
    {
      startExpanded: false,
      yAxis: {
        range: getCoverageRange(),
        label: "Log2 ratio",
        hideLabelOnCollapse: true,
        hideTicksOnCollapse: true,
      },
      hasLabel: true,
      fixedChrom: chrom,
    },
    getMarkerModeOn,
    getXRange,
    null,
    () => getTrackHeights(),
  );
  const trackWrapper = createDataTrackWrapper(dotTrack);
  const trackInfo: ChromViewTrackInfo = {
    track: dotTrack,
    container: trackWrapper,
    sampleId: sample.sampleId,
    chromosome: chrom,
    sourceId: null,
    type: "coverage",
  };
  onAddTrack(trackInfo);
}

function addSampleAnnotationTracks(
  session: GensSession,
  sample: Sample,
  chrom: Chromosome,
  annotTracks: {id: string, name: string}[],
  getBands: (trackId: string, chrom: Chromosome) => Promise<RenderBand[]>,
  getDetails: (id: string) => Promise<ApiSampleAnnotationDetails>,
  onAddTrack: (track: ChromViewTrackInfo) => void,
) {
  for (const source of annotTracks) {
    const trackId = `${source.id}_${chrom}`;
    const bandTrack = createAnnotTrack(
      trackId,
      source.name,
      () => [1, session.getChromSize("1")],
      () => getBands(source.id, chrom),
      (id: string) => getDetails(id),
      session,
      null,
      {
        height: TRACK_HEIGHTS.xxs,
        showLabelWhenCollapsed: false,
        startExpanded: false,
      },
    );
    const wrapper = createDataTrackWrapper(bandTrack);
    const info: ChromViewTrackInfo = {
      track: bandTrack,
      container: wrapper,
      chromosome: chrom,
      sampleId: sample.sampleId,
      sourceId: source.id,
      type: "annotation",
    };
    onAddTrack(info);
  }
}

function getGroupElement(chrom: string): {
  container: HTMLDivElement;
  annotGroup: HTMLDivElement;
  sampleGroup: HTMLDivElement;
} {
  const chromosomeGroup = div();
  chromosomeGroup.style.display = "flex";
  chromosomeGroup.style.flexDirection = "row";
  chromosomeGroup.style.paddingBottom = `${SIZES.xxs}px`;

  const labelGroup = div();
  labelGroup.style.display = "flex";
  labelGroup.style.justifyContent = "center";
  labelGroup.style.alignItems = "center";
  labelGroup.style.flex = "0 0 20px";
  chromosomeGroup.appendChild(labelGroup);
  const label = document.createTextNode(chrom);
  labelGroup.appendChild(label);

  const trackGroup = div();
  trackGroup.style.flex = "1 1 auto";
  chromosomeGroup.appendChild(trackGroup);

  const sampleGroup = div();
  const annotGroup = div();

  trackGroup.appendChild(sampleGroup);
  trackGroup.appendChild(annotGroup);
  return {
    container: chromosomeGroup,
    sampleGroup,
    annotGroup,
  };
}

customElements.define("chromosome-view", ChromosomeView);
