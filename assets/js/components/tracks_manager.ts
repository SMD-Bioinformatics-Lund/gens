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
import { generateID } from "../util/utils";
import { getContainer } from "./util/menu_utils";

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
    #container {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      /* overflow-x: hidden; */
      padding-left: 10px;
      padding-right: 10px;
    }
  </style>
  <div id="container"></div>
`;

export class TracksManager extends ShadowBaseElement {

  parentContainer: HTMLDivElement;
  isInitialized = false;
  annotationsContainer: HTMLDivElement;

  // FIXME: Think about a shared interface
  tracks: (CanvasTrack | MultiBandTracks)[] = [];

  // This one needs a dedicated component I think
  annotationTracks: BandTrack[] = [];

  constructor() {
    super(template);
  }

  connectedCallback() {

    window.addEventListener("resize", () => {
      this.render(false);
    });

    this.parentContainer = this.root.getElementById(
      "container",
    ) as HTMLDivElement;
  }

  async initialize(
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
    getVariantDetails: (id: string) => Promise<ApiVariantDetails>,
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

    const coverageTrack = new DotTrack(
      "log2_cov",
      "Log2 Ratio",
      trackHeight.thick,
      { range: COV_Y_RANGE, ticks: COV_Y_TICKS },
      async () => {
        const data = await dataSource.getCovData();
        return {
          xRange: getXRange(),
          dots: data,
        };
      },
      dragCallbacks,
    );
    const bafTrack = new DotTrack(
      "baf",
      "B Allele Freq",
      trackHeight.thick,
      { range: BAF_Y_RANGE, ticks: BAF_Y_TICKS },
      async () => {
        return {
          xRange: getXRange(),
          dots: await dataSource.getBafData(),
        };
      },
      dragCallbacks,
    );
    const variantTrack = new BandTrack(
      "variants",
      "Variants",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getVariantData(),
        };
      },
      async (id: string) => {
        const details = await getVariantDetails(id);
        const scoutUrl = getVariantURL(id);

        const button = getButton("Set highlight", () => {
          const id = generateID();
          highlightCallbacks.addHighlight(id, [details.position, details.end]);
        });

        const entries = getVariantContextMenuContent(id, details, scoutUrl);
        const content = [button];
        content.push(...entries);

        openContextMenu("Variant", content);
      },
      dragCallbacks,
    );
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
        const button = getButton("Set highlight", () => {
          const id = generateID();
          highlightCallbacks.addHighlight(id, [details.start, details.end]);
        });
        const entries = getGenesContextMenuContent(id, details);
        const content = [button];
        content.push(...entries);
        openContextMenu("Transcript", content);
      },
      dragCallbacks,
    );
    const ideogramTrack = new IdeogramTrack(
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
          const button = getButton("Set highlight", () => {
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
          dotsPerChrom: await dataSource.getOverviewCovData(),
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
          dotsPerChrom: await dataSource.getOverviewBafData(),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
      false,
    );

    this.tracks.push(
      ideogramTrack,
      coverageTrack,
      bafTrack,
      annotationTracks,
      variantTrack,
      genesTrack,
      overviewTrackCov,
      overviewTrackBaf,
    );

    for (const track of this.tracks) {
      this.parentContainer.appendChild(track);
      track.initialize();
      track.renderLoading();
    }
  }

  public render(updateData: boolean) {
    for (const track of this.tracks) {
      track.render(updateData);
    }
  }
}

function getButton(text: string, onClick: () => void): HTMLDivElement {
  const row = getContainer("row");
  const button = document.createElement("div") as HTMLDivElement;
  button.innerHTML = text;
  button.style.cursor = "pointer";
  button.style.border = "1px solid #ccc";
  button.onclick = onClick;
  button.style.padding = "4px 8px";
  button.style.borderRadius = "4px";
  row.appendChild(button);
  return row;
}


customElements.define("gens-tracks", TracksManager);
