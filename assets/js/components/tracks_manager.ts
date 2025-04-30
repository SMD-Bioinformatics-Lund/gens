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
import { prefixNts, prettyRange } from "../util/utils";
import {
  getEntry,
  getSection,
  getContainer,
  getURLRow,
} from "./util/menu_utils";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "./util/menu_content_utils";

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

export class TracksManager extends HTMLElement {
  protected _root: ShadowRoot;

  parentContainer: HTMLDivElement;
  isInitialized = false;
  annotationsContainer: HTMLDivElement;

  // FIXME: Think about a shared interface
  tracks: (CanvasTrack | MultiBandTracks)[] = [];

  // This one needs a dedicated component I think
  annotationTracks: BandTrack[] = [];

  highlights: Rng[] = [];

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    window.addEventListener("resize", () => {
      this.render(false);
    });

    this.parentContainer = this._root.getElementById(
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
  ) {
    const trackHeight = STYLE.bandTrack.trackHeight;

    const dragCallbacks = {
      onZoomIn,
      onZoomOut,
      getHighlights: () => this.highlights,
      addHighlight: (range) => {
        this.highlights.push(range);
        this.render(false);
      },
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
        const entries = getVariantContextMenuContent(id, details, scoutUrl);
        openContextMenu("Variant", entries);
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
        const entries = getGenesContextMenuContent(id, details);
        openContextMenu("Transcript", entries);
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
          const infoDivs = getAnnotationContextMenuContent(id, details);
          openContextMenu("Annotations", infoDivs);
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

    // variantTrack.style.paddingLeft = `${STYLE.yAxis.width}px`;
    // genesTrack.style.paddingLeft = `${STYLE.yAxis.width}px`;

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

function getAnnotTrack(
  sourceId: string,
  label: string,
  trackHeight: number,
  getXRange: () => Rng,
  getAnnotation: (sourceId: string) => Promise<RenderBand[]>,
  openContextMenu: (id: string) => void,
  dragCallbacks: DragCallbacks,
): BandTrack {
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

  const track = new BandTrack(
    sourceId,
    label,
    trackHeight,
    () => getAnnotTrackData(sourceId, getXRange, getAnnotation),
    openContextMenu,
    dragCallbacks,
  );
  return track;
}

customElements.define("gens-tracks", TracksManager);
