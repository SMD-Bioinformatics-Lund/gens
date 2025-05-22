import { CHROMOSOMES, SIZES, STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { div, removeOne } from "../../util/utils";
import { BandTrack } from "../tracks/band_track";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { DotTrack } from "../tracks/dot_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
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
  // private openTrackContextMenu: (track: DataTrack) => void;
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

  initialize(
    session: GensSession,
    sampleIds: string[],
    dataSource: RenderDataSource,
    openTrackContextMenu: (track: DataTrack) => void,
  ) {
    this.session = session;
    this.dataSource = dataSource;
    // this.openTrackContextMenu = openTrackContextMenu;

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

      setupDotTracks(
        session,
        sampleIds,
        chrom,
        openTrackContextMenu,
        (sampleId: string, chrom: string) =>
          dataSource.getCovData(sampleId, chrom),
        (trackInfo: ChromViewTrackInfo) => {
          this.onAddTrack(sampleGroup, trackInfo);
        },
      );

      const annotSources = session.getAnnotationSources({
        selectedOnly: true,
      });
      addAnnotTracks(
        annotSources,
        session,
        chrom,
        dataSource,
        (trackInfo: ChromViewTrackInfo) =>
          this.onAddTrack(annotGroup, trackInfo),
      );
    }
  }

  public render(settings: RenderSettings) {
    // FIXME: Util
    // const chr1GroupAnnots = this.chromosomeGroups["1"].annotations;
    // const bandTracks = [
    //   ...chr1GroupAnnots.querySelectorAll("band-track"),
    // ] as BandTrack[];
    // IDs are on the format source_chr
    // Can this be done neater?
    const currentBandTracks = this.tracks
      .filter(
        (track) => track.chromosome === "1" && track.type === "annotation",
      )
      .map((track) => track.sourceId);
    // const currentBandTracks = bandTracks.map((track) => track.id.split("_")[0]);

    const sources = this.session.getAnnotationSources({ selectedOnly: true });
    const trackIds = currentBandTracks;

    // FIXME: Merge with the track view function
    const sourceIds = sources.map((source) => source.id);
    const newSources = sources.filter(
      (source) => !trackIds.includes(source.id),
    );
    const removedSourceIds = trackIds.filter((id) => !sourceIds.includes(id));

    for (const chrom of CHROMOSOMES) {
      const annotGroup = this.chromosomeGroups[chrom].annotations;
      addAnnotTracks(
        newSources,
        this.session,
        chrom,
        this.dataSource,
        (trackInfo: ChromViewTrackInfo) =>
          this.onAddTrack(annotGroup, trackInfo),
      );
    }

    removedSourceIds.forEach((sourceId) => {
      this.onRemoveTrack(sourceId, "annotations");
    });

    // const chr1GroupSamples = this.chromosomeGroups["1"].samples;
    // const dotTracks = [
    //   ...chr1GroupSamples.querySelectorAll("dot-track"),
    // ] as DotTrack[];

    const currentDotTrackIDs = this.tracks
      .filter((track) => track.chromosome === "1" && track.type == "coverage")
      .map((track) => track.sampleId);

    // IDs are on the format source_chr
    // Can this be done neater?
    // const currentDotTrackIDs = dotTracks.map((track) => track.id.split("_")[0]);

    const samples = this.session.getSamples();
    const trackSampleIds = currentDotTrackIDs;
    const newSamples = samples.filter(
      (sampleId) => !trackSampleIds.includes(sampleId),
    );
    const removedSampleIds = trackSampleIds.filter(
      (id) => !samples.includes(id),
    );

    const onAddTrack = (track: ChromViewTrackInfo) => {
      const subgroup = this.chromosomeGroups[track.chromosome].samples;
      this.onAddTrack(subgroup, track);
    };
    const onRemoveTrack = (id: string) => {
      this.onRemoveTrack(id, "samples");
    };

    const getCovData = (sampleId: string, chrom: string) =>
      this.dataSource.getCovData(sampleId, chrom);

    newSamples.forEach((sampleId) => {
      for (const chrom of CHROMOSOMES) {
        const yAxis: Axis = {
          range: COV_Y_RANGE,
          reverse: true,
          label: sampleId,
          hideLabelOnCollapse: false,
          hideTicksOnCollapse: true,
        };

        const trackId = `${sampleId}_${chrom}`;
        const trackLabel = `${sampleId} Cov`;
        const newTrack = createDotTrack(
          trackId,
          trackLabel,
          sampleId,
          () => getCovData(sampleId, chrom),
          { startExpanded: false, hasLabel: false, yAxis },
          this.session,
          (_track: DataTrack) => {
            console.log("No context menu at the moment");
          },
        );
        const wrapper = createDataTrackWrapper(newTrack);
        const trackInfo: ChromViewTrackInfo = {
          track: newTrack,
          container: wrapper,
          chromosome: chrom,
          sourceId: null,
          sampleId: sampleId,
          type: "coverage",
        };
        onAddTrack(trackInfo);
      }

      removedSampleIds.forEach((id) => {
        onRemoveTrack(id);
      });
    });

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
  annotSources: { id: string; label: string }[],
  session: GensSession,
  chrom: string,
  dataSource: RenderDataSource,
  addTrack: (trackInfo: ChromViewTrackInfo) => void,
) {
  for (const { id: annotId, label: annotLabel } of annotSources) {
    const trackId = `${annotId}_${chrom}`;
    const trackLabel = `${annotLabel} ${chrom}`;

    const annotTrack = createAnnotTrack(
      trackId,
      trackLabel,
      () => dataSource.getAnnotationBands(annotId, chrom),
      (bandId: string) => dataSource.getAnnotationDetails(bandId),
      session,
      (_track) => {},
      {
        height: STYLE.tracks.trackHeight.thinnest,
        hasLabel: false,
        yPadBands: false,
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

// function getDiff(
//   queryElem: HTMLDivElement,
//   query: string,
//   currentIds: string[],
// ): { added: string[]; removed: string[] } {
//   const tracks = [...queryElem.querySelectorAll(query)] as DataTrack[];
//   // FIXME: How to carry these? Can we use the data structure instead?
//   const trackIds = tracks.map((track) => track.id.split("_")[0]);

// }

function setupDotTracks(
  session: GensSession,
  sampleIds: string[],
  chrom: string,
  openTrackContextMenu: (track: DataTrack) => void,
  getCovData: (sampleId: string, chrom: string) => Promise<RenderDot[]>,
  onAddTrack: (track: ChromViewTrackInfo) => void,
) {
  for (const sampleId of sampleIds) {
    const trackId = `${sampleId}_${chrom}`;
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
          label: sampleId,
          hideLabelOnCollapse: false,
          hideTicksOnCollapse: true,
        },
        hasLabel: false,
      },
      session,
      openTrackContextMenu,
    );
    const trackWrapper = createDataTrackWrapper(dotTrack);
    const trackInfo: ChromViewTrackInfo = {
      track: dotTrack,
      container: trackWrapper,
      sampleId,
      chromosome: chrom,
      sourceId: null,
      type: "coverage",
    };
    onAddTrack(trackInfo);
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
