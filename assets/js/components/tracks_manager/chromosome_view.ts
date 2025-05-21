import { CHROMOSOMES, SIZES, STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { div, removeOne } from "../../util/utils";
import { BandTrack } from "../tracks/band_track";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { DotTrack } from "../tracks/dot_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { createSampleTracks, DataTrackInfo } from "./track_view";
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
  private session: GensSession;
  private dataSource: RenderDataSource;
  private openTrackContextMenu: (track: DataTrack) => void;

  private tracks: DataTrack[] = [];

  private chromosomeGroups: Record<
    string,
    { samples: HTMLDivElement; annotations: HTMLDivElement }
  > = {};

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
    this.openTrackContextMenu = openTrackContextMenu;

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
        (trackInfo: DataTrackInfo) => {
          this.onAddTrack(sampleGroup, trackInfo);
        },
      );

      const annotSources = session.getAnnotationSources({
        selectedOnly: true,
      });
      setupAnnotTracks(
        annotSources,
        session,
        chrom,
        dataSource,
        (trackInfo: DataTrackInfo) => this.onAddTrack(annotGroup, trackInfo),
      );
    }
  }

  public render(settings: RenderSettings) {
    // FIXME: Util
    const chr1GroupAnnots = this.chromosomeGroups["1"].annotations;
    const bandTracks = [
      ...chr1GroupAnnots.querySelectorAll("band-track"),
    ] as BandTrack[];
    // IDs are on the format source_chr
    // Can this be done neater?
    const currentBandTracks = bandTracks.map((track) => track.id.split("_")[0]);

    const sources = this.session.getAnnotationSources({ selectedOnly: true });
    const trackIds = currentBandTracks;

    // FIXME: Merge with the track view function
    const sourceIds = sources.map((source) => source.id);
    const newSources = sources.filter(
      (source) => !trackIds.includes(source.id),
    );
    const removedSourceIds = trackIds.filter((id) => !sourceIds.includes(id));

    newSources.forEach((source) => {
      const hasLabel = false;

      for (const chrom of CHROMOSOMES) {
        const chromElem = this.chromosomeGroups[chrom].annotations;
        const trackId = `${source.id}_${chrom}`;
        const newTrack = createAnnotTrack(
          trackId,
          source.label,
          () => this.dataSource.getAnnotationBands(source.id, chrom),
          (bandId: string) => this.dataSource.getAnnotationDetails(bandId),
          this.session,
          this.openTrackContextMenu,
          {
            height: STYLE.tracks.trackHeight.thinnest,
            hasLabel,
            yPadBands: false,
          },
        );
        const trackInfo = getTrackInfo(newTrack, null);
        this.onAddTrack(chromElem, trackInfo);
      }
    });

    removedSourceIds.forEach((sourceId) => {
      this.onRemoveTrack(sourceId, "annotations");
    });

    const chr1GroupSamples = this.chromosomeGroups["1"].samples;
    const dotTracks = [
      ...chr1GroupSamples.querySelectorAll("dot-track"),
    ] as DotTrack[];
    // IDs are on the format source_chr
    // Can this be done neater?
    const currentDotTrackIDs = dotTracks.map((track) => track.id.split("_")[0]);

    updateSampleTracks(
      this.session.getSamples(),
      currentDotTrackIDs,
      (sampleId: string, chrom: string) =>
        this.dataSource.getCovData(sampleId, chrom),
      this.session,
      (track: DataTrackInfo, chrom: string) => {
        const subgroup = this.chromosomeGroups[chrom].samples;
        this.onAddTrack(subgroup, track);
      },
      (id: string) => {
        this.onRemoveTrack(id, "samples");
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

  private onRemoveTrack(sourceId: string, type: "samples" | "annotations") {
    for (const chrom of CHROMOSOMES) {
      const subgroup = this.chromosomeGroups[chrom][type];
      const trackId = `${sourceId}_${chrom}`;
      const removedTrack = removeOne(
        this.tracks,
        (track: DataTrack) => track.id == trackId,
      );
      // FIXME: Should the info be used here as well?
      subgroup.removeChild(removedTrack.parentElement);
    }
  }
}

function updateSampleTracks(
  samples: string[],
  trackSampleIds: string[],
  getCovData: (sampleId: string, chrom: string) => Promise<RenderDot[]>,
  session,
  onAddTrack: (track: DataTrackInfo, chrom: string) => void,
  onRemoveTrack: (sampleId: string) => void,
) {
  const newSamples = samples.filter(
    (sampleId) => !trackSampleIds.includes(sampleId),
  );
  const removedSampleIds = trackSampleIds.filter((id) => !samples.includes(id));

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
        session,
        (_track: DataTrack) => {
          console.log("No context menu at the moment");
        },
      );
      onAddTrack(getTrackInfo(newTrack, sampleId), chrom);
    }

    removedSampleIds.forEach((id) => {
      onRemoveTrack(id);
    });
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
    const trackInfo: DataTrackInfo = {
      track: dotTrack,
      container: trackWrapper,
      sampleId,
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
