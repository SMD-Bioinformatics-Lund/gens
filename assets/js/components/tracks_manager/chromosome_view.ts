import { CHROMOSOMES, SIZES, STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { div, removeOne } from "../../util/utils";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import {
  createAnnotTrack,
  createDataTrackWrapper,
  createDotTrack,
} from "./utils";

const COV_Y_RANGE: [number, number] = [-2, 2];

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #chromosome-tracks-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
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

  initialize(session: GensSession, dataSource: RenderDataSource) {
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

    // Adding new tracks per chromosome
    for (const chrom of CHROMOSOMES) {
      const chromGroup = this.chromosomeGroups[chrom];

      // FIXME: Paused for now, bring back when UPD tracks are in place
      // addAnnotTracks(
      //   annotDiff.new,
      //   (id: string) => {
      //     return this.session
      //       .getAnnotationSources({ selectedOnly: true })
      //       .find((source) => source.id == id).label;
      //   },
      //   this.session,
      //   chrom,
      //   this.dataSource,
      //   (trackInfo: ChromViewTrackInfo) =>
      //     this.onAddTrack(chromGroup.annotations, trackInfo),
      // );

      const settingSamples = this.session.getSamples()[0];

      const getCovData = (sample: Sample, chrom: string) =>
        this.dataSource.getCovData(sample, chrom, [
          1,
          this.session.getChromSize(chrom),
        ]);

      addSampleTracks(
        this.session,
        settingSamples,
        // settingSamples.filter((sample) =>
        //   sampleDiff.new.includes(sample.sampleId),
        // ),
        chrom,
        (sample: Sample) => getCovData(sample, chrom),
        (trackInfo: ChromViewTrackInfo) => {
          this.onAddTrack(chromGroup.samples, trackInfo);
        },
      );
    }
  }

  public render(settings: RenderSettings) {
    // FIXME: Some parts of this might be needed later when UPD is introduced

    // const currentBandTracks = this.tracks
    //   .filter(
    //     (track) => track.chromosome === "1" && track.type === "annotation",
    //   )
    //   .map((track) => track.sourceId);

    // const trackIds = currentBandTracks;
    // const sourceIds = this.session
    //   .getAnnotationSources({ selectedOnly: true })
    //   .map((source) => source.id);

    // const annotDiff = getDiff(trackIds, sourceIds);

    // const trackSampleIds = this.tracks
    //   .filter((track) => track.chromosome === "1" && track.type == "coverage")
    //   .map((track) => track.sampleId);
    // const settingSamples = this.session.getSamples()[0];
    // const settingSampleIds = settingSamples.map((sample) => sample.sampleId);
    // const sampleDiff = getDiff(trackSampleIds, settingSampleIds);

    // // Adding new tracks per chromosome
    // for (const chrom of CHROMOSOMES) {
    //   const chromGroup = this.chromosomeGroups[chrom];

    //   // FIXME: Paused for now, bring back when UPD tracks are in place
    //   // addAnnotTracks(
    //   //   annotDiff.new,
    //   //   (id: string) => {
    //   //     return this.session
    //   //       .getAnnotationSources({ selectedOnly: true })
    //   //       .find((source) => source.id == id).label;
    //   //   },
    //   //   this.session,
    //   //   chrom,
    //   //   this.dataSource,
    //   //   (trackInfo: ChromViewTrackInfo) =>
    //   //     this.onAddTrack(chromGroup.annotations, trackInfo),
    //   // );

    //   addSampleTracks(
    //     this.session,
    //     settingSamples.filter((sample) =>
    //       sampleDiff.new.includes(sample.sampleId),
    //     ),
    //     chrom,
    //     (sample: Sample) => getCovData(sample, chrom),
    //     (trackInfo: ChromViewTrackInfo) => {
    //       this.onAddTrack(chromGroup.samples, trackInfo);
    //     },
    //   );
    // }

    // annotDiff.removed.forEach((sourceId) => {
    //   this.onRemoveTrack(sourceId, "annotations");
    // });

    // sampleDiff.removed.forEach((id) => {
    //   this.onRemoveTrack(id, "samples");
    // });

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

function addAnnotTracks(
  annotIds: string[],
  getLabel: (id: string) => string,
  session: GensSession,
  chrom: string,
  dataSource: RenderDataSource,
  addTrack: (trackInfo: ChromViewTrackInfo) => void,
) {
  for (const annotId of annotIds) {
    const trackId = `${annotId}_${chrom}`;
    const trackLabel = getLabel(annotId);

    const annotTrack = createAnnotTrack(
      trackId,
      trackLabel,
      () => dataSource.getAnnotationBands(annotId, chrom),
      (bandId: string) => dataSource.getAnnotationDetails(bandId),
      session,
      null,
      {
        height: STYLE.tracks.trackHeight.xxs,
        showLabelWhenCollapsed: false,
        yPadBands: false,
        startExpanded: false,
      },
    );
    const annotTrackWrapper = createDataTrackWrapper(annotTrack);
    const trackInfo: ChromViewTrackInfo = {
      track: annotTrack,
      container: annotTrackWrapper,
      sampleId: null,
      chromosome: chrom,
      sourceId: annotId,
      type: "annotation",
    };
    addTrack(trackInfo);
  }
}

function getDiff(
  previousIds: string[],
  updatedIds: string[],
): { new: string[]; removed: string[] } {
  const newIds = updatedIds.filter(
    (sampleId) => !previousIds.includes(sampleId),
  );
  const removedIds = previousIds.filter((id) => !updatedIds.includes(id));
  return {
    new: newIds,
    removed: removedIds,
  };
}

function addSampleTracks(
  session: GensSession,
  sample: Sample,
  chrom: Chromosome,
  getCovData: (sample: Sample, chrom: Chromosome) => Promise<RenderDot[]>,
  onAddTrack: (track: ChromViewTrackInfo) => void,
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
        range: COV_Y_RANGE,
        label: "Log2 ratio",
        hideLabelOnCollapse: true,
        hideTicksOnCollapse: true,
      },
      hasLabel: true,
      fixedChrom: chrom,
    },
    session,
    null,
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
