import { CHROMOSOMES, COLORS, SIZES, TRACK_HEIGHTS } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { div } from "../../util/utils";
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
        trackId: `chr-cov-${chrom}`,
        trackLabel: `Log2 cov`,
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

      const annotTrackSettings = [];
      for (const sampleAnnot of sampleAnnots) {
        const setting: DataTrackSettings = {
          trackId: `${sampleAnnot.id}-${chrom}`,
          trackLabel: `Annot. track ${chrom}`,
          trackType: "sample-annotation",
          height: {
            collapsedHeight: TRACK_HEIGHTS.xs,
          },
          showLabelWhenCollapsed: false,
          isExpanded: false,
          isHidden: false,
          chromosome: chrom,
          sample: settingSample,
          sourceId: sampleAnnot.id
        };
        annotTrackSettings.push(setting);
      }

      this.session.chromosomeViewTracks.push(
        dataTrackSetting,
        ...annotTrackSettings,
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
          (_track: DataTrack) => {
            console.warn("No context menu for chromosome view tracks");
          },
          (trackId: string, isExpanded: boolean) => {
            this.session.setIsExpanded(trackId, isExpanded);
            this.render({});
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
              trackSetting.sourceId,
              trackSetting.chromosome,
            ),
          (_track: DataTrack) => {
            console.warn("No context menu available in chromosome view");
          },
          (trackId: string, isExpanded: boolean) => {
            this.session.setIsExpanded(trackId, isExpanded);
            this.render({});
          },
          (trackId: string, expandedHeight: number) => {
            this.session.setExpandedHeight(trackId, expandedHeight);
          },
        );
        targetGroup = chromGroup.annotations;
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
        sourceId: trackSetting.sourceId,
        type: trackSetting.trackType,
      };
      this.onAddTrack(chromGroup.samples, info);
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
