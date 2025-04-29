import "./tracks/canvas_track/canvas_track";
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
import { CanvasTrack } from "./tracks/canvas_track/canvas_track";
import { prefixNts, prettyRange } from "../util/utils";
import {
  getEntry,
  getSection,
  makeRefDiv,
  getContainer,
  getURLRow,
} from "./util/menu_utils";

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

  highlights: Rng[] = [[3000000, 60000000]];

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
    setXRange: (range: Rng) => void,
    onZoomOut: () => void,
    getAnnotSources: () => { id: string; label: string }[],
    getVariantURL: (id: string) => string,
    getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
    getTranscriptDetails: (id: string) => Promise<ApiTranscriptDetails>,
    getVariantDetails: (id: string) => Promise<ApiVariantDetails>,
    openContextMenu: (header: string, content: HTMLElement[]) => void,
  ) {
    const trackHeight = STYLE.bandTrack.trackHeight;

    const coverageTrack = new DotTrack(
      "log2_cov",
      "Log2 Ratio",
      trackHeight.thick,
      COV_Y_RANGE,
      COV_Y_TICKS,
      async () => {
        const data = await dataSource.getCovData();
        return {
          xRange: getXRange(),
          dots: data,
        };
      },
      setXRange,
      onZoomOut,
      () => this.highlights,
    );
    const bafTrack = new DotTrack(
      "baf",
      "B Allele Freq",
      trackHeight.thick,
      BAF_Y_RANGE,
      BAF_Y_TICKS,
      async () => {
        return {
          xRange: getXRange(),
          dots: await dataSource.getBafData(),
        };
      },
      setXRange,
      onZoomOut,
      () => this.highlights,
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
        const info: { key: string; value: string; url?: string }[] = [
          { key: "Range", value: `${details.position} - ${details.end}` },
          {
            key: "Length",
            value: prefixNts(details.length),
          },
          { key: "Scout URL", value: scoutUrl, url: scoutUrl },
          { key: "CADD score", value: details.cadd_score },
          {
            key: "Category",
            value: `${details.category} (${details.sub_category})`,
          },
          {
            key: "Cytoband",
            value: `${details.cytoband_start} - ${details.cytoband_end}`,
          },
          { key: "Rank score", value: details.rank_score.toString() },
          { key: "BNF ID", value: id },
        ];

        const entries: HTMLElement[] = info.map((i) => getEntry(i));
        const rankScoreParts = getSection(
          "Rank score parts",
          details.rank_score_results.map((part) => {
            return getContainer("row", `${part.category}: ${part.score}`);
          }),
        );

        entries.push(rankScoreParts);

        openContextMenu("Variant", entries);
      },
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

        const info: { key: string; value: string }[] = [
          { key: "Range", value: `${details.start} - ${details.end}` },
          {
            key: "Length",
            value: prefixNts(details.end - details.start + 1),
          },
          { key: "Transcript ID", value: details.transcript_id },
          { key: "Biotype", value: details.transcript_biotype },
          { key: "Gene name", value: details.gene_name },
          { key: "MANE", value: details.mane },
          { key: "HGNC ID", value: details.hgnc_id },
          { key: "Refseq ID", value: details.refseq_id },
          { key: "Strand", value: details.strand },
          { key: "BNF ID", value: id },
        ];

        const entries = info.map((i) => getEntry(i));
        openContextMenu("Transcript", entries);
      },
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
        const track = getAnnotTrack(
          sourceId,
          label,
          trackHeight.thin,
          getXRange,
          dataSource.getAnnotation,
          // FIXME: Refactor out from here
          async (id: string) => {
            const details = await getAnnotationDetails(id);

            const info: { key: string; value: string }[] = [
              {
                key: "Range",
                value: prettyRange(details.start, details.end),
              },
              {
                key: "Length",
                value: prefixNts(details.end - details.start + 1),
              },
              { key: "Name", value: details.name },
              { key: "Description", value: details.description || "-" },
              { key: "BNF ID", value: id },
            ];

            const infoDivs = info.map((i) => getEntry(i));

            const commentSection = getSection(
              "Comments",
              details.comments.flatMap((c) =>
                c.comment
                  .replace('"', "")
                  .split("; ")
                  .map((s) => getURLRow(s)),
              ),
            );
            infoDivs.push(commentSection);

            const metaSection = getSection(
              "Metadata",
              details.metadata.map((meta) => {
                let url = null;
                if (meta.field_name === "reference") {
                  const value = meta.value as {url: string, title: string};
                  url = value.url;
                }
                
                const entry = getEntry({
                  key: meta.field_name,
                  url,
                  value: url != null ? url : meta.value as string
                })
                return entry;
              }
              ),
            );
            infoDivs.push(metaSection);

            openContextMenu("Annotations", infoDivs);
          },
        );

        track.style.paddingLeft = `${STYLE.yAxis.width}px`;
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

    variantTrack.style.paddingLeft = `${STYLE.yAxis.width}px`;
    genesTrack.style.paddingLeft = `${STYLE.yAxis.width}px`;

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
): BandTrack {
  const track = new BandTrack(
    sourceId,
    label,
    trackHeight,
    () => getAnnotTrackData(sourceId, getXRange, getAnnotation),
    openContextMenu,
  );
  return track;
}

const getAnnotTrackData = async (
  source: string,
  getXRange: () => Rng,
  getAnnotation: (source: string) => Promise<RenderBand[]>,
): Promise<BandTrackData> => {
  const bands = await getAnnotation(source);
  return {
    xRange: getXRange(),
    bands,
  };
};

customElements.define("gens-tracks", TracksManager);
