import { CHROMOSOMES, COLORS, SIZES, TRACK_HEIGHTS } from "../../constants";
import { getRenderDataSource } from "../../state/data_source";
import { GensSession } from "../../state/gens_session";
import { div, removeOne } from "../../util/utils";
import { TrackHeights } from "../side_menu/settings_menu";
import { DataTrack, DataTrackSettings } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { createDataTrackWrapper } from "./utils";
import { getBandTrack, getDotTrack } from "./utils/create_tracks";

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
  type: "sample-annotation" | "dot-cov";
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

    this.session.chromosomeViewTracks = [];

    for (const chrom of CHROMOSOMES) {
      const dataTrackSetting: DataTrackSettings = {
        trackId: "track ID",
        trackLabel: "Dot track label",
        trackType: "dot-cov",
        height: {
          collapsedHeight: TRACK_HEIGHTS.m,
          expandedHeight: TRACK_HEIGHTS.xl,
        },
        showLabelWhenCollapsed: false,
        isExpanded: false,
        isHidden: false,
        yAxis: {
          range: session.getCoverageRange(),
          label: "Log2 ratio",
          hideLabelOnCollapse: true,
          hideTicksOnCollapse: true,
        },
        chromosome: chrom,
        sample: settingSample,
      };

      // FIXME: Need the real source ID
      const annotTrackSetting: DataTrackSettings = {
        trackId: sampleAnnots[0].id,
        trackLabel: `Annot. track ${chrom}`,
        trackType: "sample-annotation",
        height: {
          collapsedHeight: TRACK_HEIGHTS.m,
        },
        showLabelWhenCollapsed: false,
        isExpanded: false,
        isHidden: false,
        chromosome: chrom,
        sample: settingSample,
      };

      this.session.chromosomeViewTracks.push(
        dataTrackSetting,
        annotTrackSetting,
      );
    }

    const getCovData = (sample: Sample, chrom: string) =>
      this.dataSource.getCovData(sample, chrom, [
        1,
        this.session.getChromSize(chrom),
      ]);

    for (const trackSetting of this.session.chromosomeViewTracks) {
      const chromGroup = this.chromosomeGroups[trackSetting.chromosome];

      let track: DataTrack;
      let targetGroup: HTMLDivElement;
      if (trackSetting.trackType == "dot-cov") {
        track = getDotTrack(
          session,
          trackSetting,
          () => getCovData(trackSetting.sample, trackSetting.chromosome),
          (track: DataTrack) => {
            console.warn("No context menu for chromosome view tracks");
          },
          (trackId: string, updatedSetting: DataTrackSettings) => {
            console.log(
              "Attempting to toggle the chromosome view tracks. Need a settings representation there as well?",
            );
            // console.warn("No context menu for chromosome view tracks");
          },
        );
        targetGroup = chromGroup.samples;
      } else if (trackSetting.trackType == "sample-annotation") {
        track = getBandTrack(
          session,
          this.dataSource,
          trackSetting,
          () =>
            this.dataSource.getSampleAnnotationBands(
              trackSetting.trackId,
              trackSetting.chromosome,
            ),
          () => {
            console.warn("No context menu available in chromosome view");
          },
        );
        targetGroup = chromGroup.annotations;

        // const bandTrack = createAnnotTrack(
        //   trackId,
        //   source.name,
        //   () => [1, session.getChromSize("1")],
        //   () => getBands(source.id, chrom),
        //   (id: string) => getDetails(id),
        //   session,
        //   null,
        //   {
        //     height: TRACK_HEIGHTS.xxs,
        //     showLabelWhenCollapsed: false,
        //     startExpanded: false,
        //   },
        // );
      } else {
        console.warn(
          `Unsupported track setting type: ${trackSetting.trackType}`,
        );
        continue;
      }

      const wrapper = createDataTrackWrapper(track);
      const info: ChromViewTrackInfo = {
        track,
        container: wrapper,
        chromosome: trackSetting.chromosome,
        sampleId: trackSetting.sample.sampleId,
        sourceId: trackSetting.trackId,
        type: trackSetting.trackType,
      };
      console.log("Adding track", info);
      this.onAddTrack(chromGroup.samples, info);
      // this.onAddTrack(info);
    }
  }

  public render(settings: RenderSettings) {
    for (const track of this.tracks) {
      track.track.render(settings);
    }
  }

  public setCovYRange(covRange: Rng) {
    for (const track of this.tracks) {
      if (track.type == "dot-cov") {
        track.track.setYAxis(covRange);
      }
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
  session: GensSession,
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

  const trackSettings: DataTrackSettings = {
    trackId: "track ID",
    trackLabel,
    trackType: "dot-cov",
    height: {
      collapsedHeight: TRACK_HEIGHTS.m,
      expandedHeight: TRACK_HEIGHTS.xl,
    },
    showLabelWhenCollapsed: false,
    isExpanded: false,
    isHidden: false,
    yAxis: {
      range: getCoverageRange(),
      label: "Log2 ratio",
      hideLabelOnCollapse: true,
      hideTicksOnCollapse: true,
    },
  };

  const dotTrack = getDotTrack(
    session,
    trackSettings,
    () => getCovData(sample, chrom),
    (track: DataTrack) => {
      console.warn("No context menu for chromosome view tracks");
    },
    (trackId: string, updatedSetting: DataTrackSettings) => {
      console.log(
        "Attempting to toggle the chromosome view tracks. Need a settings representation there as well?",
      );
      // console.warn("No context menu for chromosome view tracks");
    },
  );

  const trackWrapper = createDataTrackWrapper(dotTrack);
  const trackInfo: ChromViewTrackInfo = {
    track: dotTrack,
    container: trackWrapper,
    sampleId: sample.sampleId,
    chromosome: chrom,
    sourceId: null,
    type: "dot-cov",
  };
  onAddTrack(trackInfo);
}

function addSampleAnnotationTracks(
  session: GensSession,
  sample: Sample,
  chrom: Chromosome,
  annotTracks: { id: string; name: string }[],
  renderDataSource: RenderDataSource,
  getBands: (trackId: string, chrom: Chromosome) => Promise<RenderBand[]>,
  getDetails: (id: string) => Promise<ApiSampleAnnotationDetails>,
  onAddTrack: (track: ChromViewTrackInfo) => void,
) {
  for (const source of annotTracks) {
    const trackId = `${source.id}_${chrom}`;

    const trackSettings: DataTrackSettings = {
      trackId,
      trackLabel: `Annot. track ${chrom}`,
      trackType: "sample-annotation",
      height: {
        collapsedHeight: TRACK_HEIGHTS.m,
      },
      showLabelWhenCollapsed: false,
      isExpanded: false,
      isHidden: false,
    };

    const bandTrack = getBandTrack(
      session,
      renderDataSource,
      trackSettings,
      () => getBands(source.id, chrom),
      () => {
        console.warn("No context menu available in chromosome view");
      },
    );

    // const bandTrack = createAnnotTrack(
    //   trackId,
    //   source.name,
    //   () => [1, session.getChromSize("1")],
    //   () => getBands(source.id, chrom),
    //   (id: string) => getDetails(id),
    //   session,
    //   null,
    //   {
    //     height: TRACK_HEIGHTS.xxs,
    //     showLabelWhenCollapsed: false,
    //     startExpanded: false,
    //   },
    // );
    const wrapper = createDataTrackWrapper(bandTrack);
    const info: ChromViewTrackInfo = {
      track: bandTrack,
      container: wrapper,
      chromosome: chrom,
      sampleId: sample.sampleId,
      sourceId: source.id,
      type: "sample-annotation",
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
