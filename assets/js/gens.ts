// GENS module

// import {
//     VariantTrack,
//     AnnotationTrack,
//     TranscriptTrack,
//     CytogeneticIdeogram,
// } from "./track";
export {
  setupDrawEventManager,
  drawTrack,
  previousChromosome,
  nextChromosome,
  panTracks,
  zoomIn,
  zoomOut,
  parseRegionDesignation,
  queryRegionOrGene,
} from "./navigation";

import "./components/genstracks";
import { GensTracks } from "./components/genstracks";
import "./components/input_controls";
import { InputControls } from "./components/input_controls";
import {
  parseCoverageDot,
  parseCoverageBin,
  parseTranscripts,
  parseVariants,
  parseAnnotations,
} from "./components/tracks/render_utils";
// import { AnnotationTrack } from "./components/tracks/annotation_track";
// import { CoverageTrack } from "./components/tracks/coverage_track";
import { GensAPI as GensAPI } from "./state/gens_api";
import { GensSession } from "./state/session";
import { transformMap } from "./track/utils";
import { STYLE } from "./util/constants";

// FIXME: Query from the backend

export async function initCanvases({
  sampleName,
  sampleId,
  caseId,
  genomeBuild,
  hgFileDir,
  uiColors,
  scoutBaseURL,
  gensApiURL,
  selectedVariant,
  annotationFile,
  startRegion,
}: {
  sampleName: string;
  sampleId: string;
  caseId: string;
  genomeBuild: number;
  hgFileDir: string;
  uiColors: UIColors;
  scoutBaseURL: string;
  gensApiURL: string;
  selectedVariant: string;
  annotationFile: string;
  startRegion: Region;
}) {
  const gensTracks = document.getElementById("gens-tracks") as GensTracks;

  const inputControls = document.getElementById(
    "input-controls",
  ) as InputControls;

  const api = new GensAPI(sampleId, caseId, genomeBuild, gensApiURL);

  const allChromData = await api.getAllChromData();
  // const overviewCovData = await api.getOverviewCovData();
  // const overviewBafData = await api.getOverviewBafData();

  const onChromClick = async (chrom) => {
    const chromData = await api.getChromData(chrom);
    inputControls.updateChromosome(chrom, chromData.size);
    const selectedAnnots = inputControls.getAnnotations();
    const region = inputControls.getRegion();

    const renderData = await parseRenderData(
      api,
      startRegion.chrom,
      selectedAnnots,
    );
    gensTracks.render(renderData, region);
  };

  gensTracks.initialize(allChromData, onChromClick);

  const renderData = await parseRenderData(api, startRegion.chrom, [
    annotationFile,
  ]);
  gensTracks.render(renderData, startRegion);

  // FIXME: Look into how to parse this for predefined start URLs
  inputControls.initialize(
    startRegion,
    [annotationFile],
    async (region) => {},
    async (region, _source) => {
      const selectedAnnots = inputControls.getAnnotations();
      const renderData = await parseRenderData(
        api,
        region.chrom,
        selectedAnnots,
      );
      gensTracks.render(renderData, region);
    },
    async (_newXRange) => {
      const selectedAnnots = inputControls.getAnnotations();
      const region = inputControls.getRegion();
      const renderData = await parseRenderData(
        api,
        region.chrom,
        selectedAnnots,
      );
      gensTracks.render(renderData, region);
    },
    gensApiURL,
  );
}

async function parseRenderData(
  gensDb: GensAPI,
  chrom: string,
  annotSources: string[],
): Promise<RenderData> {

  const parsedAnnotationData = {};
  for (const source of annotSources) {
    const annotData = await gensDb.getAnnotations(chrom, source);
    parsedAnnotationData[source] = parseAnnotations(annotData);
  }

  const overviewCovRaw = await gensDb.getOverviewCovData();
  const overviewCovRender = transformMap(overviewCovRaw, (cov) =>
    parseCoverageDot(cov, STYLE.colors.darkGray),
  );
  const overviewBafRaw = await gensDb.getOverviewBafData();
  const overviewBafRender = transformMap(overviewBafRaw, (cov) =>
    parseCoverageDot(cov, STYLE.colors.darkGray),
  );

  const covRaw = await gensDb.getCov(chrom);
  // const covData = parseCoverageBin(covRaw)

  const bafRaw = await gensDb.getBaf(chrom);
  const transcriptsRaw = await gensDb.getTranscripts(chrom);
  const variantsRaw = await gensDb.getVariants(chrom);

  const renderData: RenderData = {
    chromInfo: await gensDb.getChromData(chrom),
    annotations: parsedAnnotationData,
    covData: parseCoverageDot(covRaw, STYLE.colors.teal),
    bafData: parseCoverageDot(bafRaw, STYLE.colors.orange),
    transcriptData: parseTranscripts(transcriptsRaw),
    variantData: parseVariants(variantsRaw, STYLE.colors.variantColors),
    overviewCovData: overviewCovRender,
    overviewBafData: overviewBafRender,
  };
  return renderData;
}

// Make hard link and copy link to clipboard
export function copyPermalink(genomeBuild, region) {
  // create element and add url to it
  const tempElement = document.createElement("input");
  const loc = window.location;
  tempElement.value = `${loc.host}${loc.pathname}?genome_build=${genomeBuild}&region=${region}`;
  // add element to DOM
  document.body.append(tempElement);
  tempElement.select();
  document.execCommand("copy");
  tempElement.remove(); // remove temp node
}

export { setupGenericEventManager } from "./track";
