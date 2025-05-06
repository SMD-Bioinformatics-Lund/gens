import "./tracks/base_tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import "./tracks/multi_track";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { MultiBandTracks } from "./tracks/multi_track";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { STYLE } from "../constants";
import { CanvasTrack } from "./tracks/base_tracks/canvas_track";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "./util/menu_content_utils";
import { ShadowBaseElement } from "./util/shadowbaseelement";
import { generateID, moveElement } from "../util/utils";
import { getSimpleButton, getContainer } from "./util/menu_utils";
import { DataTrack } from "./tracks/base_tracks/data_track";

const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

const COV_Y_TICKS = [-3, -2, -1, 0, 1, 2, 3];
const BAF_Y_TICKS = [0.2, 0.4, 0.6, 0.8];

// FIXME: This will need to be generalized such that tracks aren't hard-coded
const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      width: 100%;
    }
    #tracks-container {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      /* overflow-x: hidden; */
      padding-left: 10px;
      padding-right: 10px;
    }
  </style>
  <div id="top-container"></div>
  <div id="tracks-container"></div>
  <div id="bottom-container"></div>
`;

export class TracksManager extends ShadowBaseElement {
  topContainer: HTMLDivElement;
  parentContainer: HTMLDivElement;
  bottomContainer: HTMLDivElement;
  isInitialized = false;
  annotationsContainer: HTMLDivElement;

  // FIXME: Think about a shared interface
  ideogramTrack: IdeogramTrack;
  overviewTracks: OverviewTrack[];
  tracks: DataTrack[] = [];

  // This one needs a dedicated component I think
  annotationTracks: BandTrack[] = [];

  constructor() {
    super(template);
  }

  connectedCallback() {
    window.addEventListener("resize", () => {
      this.render(false);
    });

    this.topContainer = this.root.querySelector(
      "#top-container",
    ) as HTMLDivElement;
    this.parentContainer = this.root.querySelector(
      "#tracks-container",
    ) as HTMLDivElement;
    this.bottomContainer = this.root.querySelector(
      "#bottom-container",
    ) as HTMLDivElement;
  }

  // FIXME: Group the callbacks for better overview
  async initialize(
    sampleIds: string[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSource: RenderDataSource,
    getChromosome: () => string,
    getXRange: () => Rng,
    onZoomIn: (range: Rng) => void,
    onZoomOut: () => void,
    getAnnotSources: () => { id: string; label: string }[],
    getVariantURL: (id: string) => string,
    getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
    getTranscriptDetails: (id: string) => Promise<ApiTranscriptDetails>,
    getVariantDetails: (
      sampleId: string,
      variantId: string,
    ) => Promise<ApiVariantDetails>,
    openContextMenu: (header: string, content: HTMLElement[]) => void,
    highlightCallbacks: HighlightCallbacks,
  ) {
    const trackHeight = STYLE.bandTrack.trackHeight;

    const dragCallbacks = {
      onZoomIn,
      onZoomOut,
      getHighlights: highlightCallbacks.getHighlights,
      addHighlight: highlightCallbacks.addHighlight,
      removeHighlight: highlightCallbacks.removeHighlight,
    };

    const openTrackContextMenu = (track: DataTrack) => {
      const buttonRow = getContainer("row");
      buttonRow.style.justifyContent = "left";

      buttonRow.appendChild(
        getSimpleButton("Show", () => {
          this.showTrack(track.id);
        }),
      );

      buttonRow.appendChild(
        getSimpleButton("Hide", () => {
          this.hideTrack(track.id);
        }),
      );
      buttonRow.appendChild(getSimpleButton("Move up", () => {}));
      buttonRow.appendChild(getSimpleButton("Move down", () => {}));

      openContextMenu(track.label, [buttonRow]);
    };

    const covTracks = [];
    const bafTracks = [];
    const variantTracks = [];

    this.ideogramTrack = new IdeogramTrack(
      "ideogram",
      "Ideogram",
      trackHeight.extraThin,
      async () => {
        return {
          xRange: getXRange(),
          chromInfo: await dataSource.getChromInfo(),
        };
      },
    );
    // const hello = document.createTextNode("Hello");
    // // this.topContainer.appendChild(hello);
    // this.topContainer.appendChild(ideogramTrack);

    for (const sampleId of sampleIds) {
      const startExpanded = sampleIds.length == 1 ? true : false;

      const coverageTrack = new DotTrack(
        `${sampleId}_log2_cov`,
        `${sampleId} cov`,
        trackHeight.thick,
        startExpanded,
        { range: COV_Y_RANGE, ticks: COV_Y_TICKS },
        async () => {
          const data = await dataSource.getCovData(sampleId);
          return {
            xRange: getXRange(),
            dots: data,
          };
        },
        dragCallbacks,
        openTrackContextMenu,
      );
      const bafTrack = new DotTrack(
        `${sampleId}_baf`,
        `${sampleId} BAF`,
        trackHeight.thick,
        startExpanded,
        { range: BAF_Y_RANGE, ticks: BAF_Y_TICKS },
        async () => {
          return {
            xRange: getXRange(),
            dots: await dataSource.getBafData(sampleId),
          };
        },
        dragCallbacks,
        openTrackContextMenu,
      );
      const variantTrack = new BandTrack(
        `${sampleId}_variants`,
        `${sampleId} Variants`,
        trackHeight.thin,
        async () => {
          return {
            xRange: getXRange(),
            bands: await dataSource.getVariantData(sampleId),
          };
        },
        async (variantId: string) => {
          const details = await getVariantDetails(sampleId, variantId);
          const scoutUrl = getVariantURL(variantId);

          const button = getSimpleButton("Set highlight", () => {
            const id = generateID();
            highlightCallbacks.addHighlight(id, [
              details.position,
              details.end,
            ]);
          });

          const entries = getVariantContextMenuContent(
            variantId,
            details,
            scoutUrl,
          );
          const content = [button];
          content.push(...entries);

          openContextMenu("Variant", content);
        },
        dragCallbacks,
        openTrackContextMenu,
      );

      covTracks.push(coverageTrack);
      bafTracks.push(bafTrack);
      variantTracks.push(variantTrack);
    }

    const genesTrack = new BandTrack(
      "genes",
      "Genes",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getTranscriptData(),
        };
      },
      async (id) => {
        const details = await getTranscriptDetails(id);
        const button = getSimpleButton("Set highlight", () => {
          const id = generateID();
          highlightCallbacks.addHighlight(id, [details.start, details.end]);
        });
        const entries = getGenesContextMenuContent(id, details);
        const content = [button];
        content.push(...entries);
        openContextMenu("Transcript", content);
      },
      dragCallbacks,
      openTrackContextMenu,
    );

    const annotationTracks = new MultiBandTracks(
      getAnnotSources,
      (sourceId: string, label: string) => {
        async function getAnnotTrackData(
          source: string,
          getXRange: () => Rng,
          getAnnotation: (source: string) => Promise<RenderBand[]>,
        ): Promise<BandTrackData> {
          const bands = await getAnnotation(source);
          return {
            xRange: getXRange(),
            bands,
          };
        }

        const openContextMenuId = async (id: string) => {
          const details = await getAnnotationDetails(id);
          const button = getSimpleButton("Set highlight", () => {
            const id = generateID();
            highlightCallbacks.addHighlight(id, [details.start, details.end]);
          });
          const entries = getAnnotationContextMenuContent(id, details);
          const content = [button];
          content.push(...entries);
          openContextMenu("Annotations", content);
        };

        const track = new BandTrack(
          sourceId,
          label,
          trackHeight.thin,
          () =>
            getAnnotTrackData(sourceId, getXRange, dataSource.getAnnotation),
          openContextMenuId,
          dragCallbacks,
          openTrackContextMenu,
        );
        return track;
      },
    );

    const overviewTrackCov = new OverviewTrack(
      "overview_cov",
      "Overview (cov)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      COV_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await dataSource.getOverviewCovData(sampleIds[0]),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
      true,
    );
    const overviewTrackBaf = new OverviewTrack(
      "overview_baf",
      "Overview (baf)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      BAF_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await dataSource.getOverviewBafData(sampleIds[0]),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
      false,
    );

    this.overviewTracks = [overviewTrackCov, overviewTrackBaf];

    // this.bottomContainer.appendChild(overviewTrackCov);
    // this.bottomContainer.appendChild(overviewTrackBaf);

    this.tracks.push(
      ...covTracks,
      ...bafTracks,
      ...variantTracks,
      // annotationTracks,
      genesTrack,
    );

    this.topContainer.appendChild(this.ideogramTrack);
    this.ideogramTrack.initialize();
    this.ideogramTrack.renderLoading();

    this.tracks.forEach((track) => {
      this.parentContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    });

    this.overviewTracks.forEach((track) => {
      this.bottomContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    })
  }

  getDataTracks(): DataTrack[] {
    return this.tracks.filter((track) => track instanceof DataTrack);
  }

  getTrackById(trackId: string): DataTrack {
    for (let i = 0; i < this.tracks.length; i++) {
      if (this.tracks[i].id == trackId) {
        return this.tracks[i];
      }
    }
    console.error("Did not find any track with ID", trackId);
  }

  moveTrack(trackId: string, direction: "up" | "down") {
    const track = this.getTrackById(trackId);
    const trackIndex = this.tracks.indexOf(track);
    const shift = direction == "up" ? -1 : 1;

    const container = track.parentNode;
    if (direction == "up") {
      container.insertBefore(track, this.tracks[trackIndex - 1]);
    } else {
      container.insertBefore(track, this.tracks[trackIndex + 1].nextSibling);
    }

    moveElement(this.tracks, trackIndex, shift, true);
  }

  showTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    this.parentContainer.appendChild(track);
  }

  hideTrack(trackId: string) {
    const track = this.getTrackById(trackId);
    this.parentContainer.removeChild(track);
  }

  render(updateData: boolean) {
    // FIXME: React to whether tracks are not present

    this.ideogramTrack.render(updateData);

    for (const track of this.tracks) {
      track.render(updateData);
    }
  }
}

customElements.define("gens-tracks", TracksManager);
