import "./tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import "./tracks/multi_track";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { MultiTracks } from "./tracks/multi_track";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { STYLE } from "../constants";
import { CanvasTrack } from "./tracks/canvas_track";
import { prefixNts } from "../util/utils";
import { getEntry, getSection } from "./util/menu_utils";

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
  tracks: (CanvasTrack | MultiTracks)[] = [];

  // This one needs a dedicated component I think
  annotationTracks: BandTrack[] = [];

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
    getAnnotSources: () => { id: string; label: string }[],
    getVariantURL: (id: string) => string,
    getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
    getTranscriptDetails: (id: string) => Promise<ApiTranscriptDetails>,
    openContextMenu: (header: string, content: HTMLDivElement[]) => void,
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
    );
    const variantTrack = new BandTrack(
      "variant",
      "Variant",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getVariantData(),
        };
      },
      async (id: string) => {

        const div = document.createElement("div");
        div.innerHTML = "Hello world from variants, id: " + id;
        openContextMenu("Variants", [div]);
      }
      // async (id: string) => {

      //   // Hmm. Set up API to get variant by ID as well.

      //   // FIXME: Refactor out these to stand-alone functions
      //   // FIXME: Variant details as well?
      //   // const element = box.element as RenderBand;
      //   const url = getVariantURL(id);
      //   return {
      //     header: `${element.label}`,
      //     info: [
      //       // FIXME: Only during development
      //       { key: "ID", value: element.id },
      //       { key: "Range", value: `${element.start} - ${element.end}` },
      //       {
      //         key: "Length",
      //         value: prefixNts(element.end - element.start + 1),
      //       },
      //       { key: "URL", value: "Scout", url },
      //     ],
      //   };
      // },
    );
    const transcriptTrack = new BandTrack(
      "transcript",
      "Transcript",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getTranscriptData(),
        };
      },
      async (id) => {
        // const element = box.element as RenderBand;
        const details = await getTranscriptDetails(id);

        const info: { key: string; value: string }[] = [
          { key: "ID", value: id },
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
          { key: "First feature", value: details.features[0].feature },
        ];

        // const container = document.createElement("div");
        const entries = info.map((i) => getEntry(i));

        // return container;
        openContextMenu("Transcripts", entries);

        // return {
        //   header: `${element.label}`,
        //   info,
        // };
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

    const annotationTracks = new MultiTracks(
      getAnnotSources,
      (sourceId: string, label: string) => {
        return getAnnotTrack(
          sourceId,
          label,
          trackHeight.thin,
          getXRange,
          dataSource.getAnnotation,
          getAnnotationDetails,
          (id: string) => {
            const container = document.createElement("div");
            container.innerHTML = id;
            openContextMenu("Annotations", [container]);
          },
        );
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
    );

    this.tracks.push(
      ideogramTrack,
      coverageTrack,
      bafTrack,
      annotationTracks,
      variantTrack,
      transcriptTrack,
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
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
  openContextMenu: (id: string) => void,
): BandTrack {
  const getPopupInfo = async (element: RenderBand) => {
    // const element = box.element as RenderBand;
    const details = await getAnnotationDetails(element.id);

    const content = document.createElement("div");

    const info: { key: string; value: string }[] = [
      { key: "ID", value: element.id },
      { key: "Range", value: `${element.start} - ${element.end}` },
      { key: "Length", value: prefixNts(element.end - element.start + 1) },
      { key: "Name", value: details.name },
      { key: "Description", value: details.description },
    ];

    info.map((i) => getEntry(i)).forEach((div) => content.append(div));

    const commentSection = getSection(
      "Comments",
      details.comments.map((c) => c.comment),
    );

    content.append(commentSection);

    return content;

    // if (details.comments.length > 0) {

    //   for (const comment of details.comments) {
    //     info.push({key: comment.created_at, value: comment.comment});
    //   }
    // }
    // {
    //   key: "First comment",
    //   value:
    //     details.comments.length > 0
    //       ? details.comments[0].comment
    //       : "No comment",
    // },
    // {
    //   key: "First reference title",
    //   value:
    //     details.references.length > 0
    //       ? details.references[0].title
    //       : "No references",
    // },
    // {
    //   key: `First metadata (${details.metadata[0].field_name})`,
    //   value:
    //     details.metadata.length > 0
    //       ? details.metadata[0].value
    //       : "No metadata",
    // },
    // ];

    // return {
    //   header: `${element.label}`,
    //   info,
    // };
  };

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
