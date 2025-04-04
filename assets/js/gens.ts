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
// import { AnnotationTrack } from "./components/tracks/annotation_track";
// import { CoverageTrack } from "./components/tracks/coverage_track";
import { GensAPI as GensAPI } from "./state/gens_api";
import { GensSession } from "./state/session";

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
  const overviewCovData = await api.getOverviewCovData();
  const overviewBafData = await api.getOverviewBafData();

  const onChromClick = async (chrom) => {
    const chromData = await api.getChromData(chrom);
    inputControls.updateChromosome(chrom, chromData.size);
    const selectedAnnots = inputControls.getAnnotations();
    const region = inputControls.getRegion();

    const renderData = await fetchRenderData(
      api,
      startRegion.chrom,
      selectedAnnots,
    );
    gensTracks.render(renderData, region);
  };

  gensTracks.initialize(allChromData, onChromClick);

  const renderData = await fetchRenderData(api, startRegion.chrom, [
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
      const renderData = await fetchRenderData(
        api,
        region.chrom,
        selectedAnnots,
      );
      gensTracks.render(renderData, region);
    },
    async (_newXRange) => {
      const selectedAnnots = inputControls.getAnnotations();
      const region = inputControls.getRegion();
      const renderData = await fetchRenderData(
        api,
        region.chrom,
        selectedAnnots,
      );
      gensTracks.render(renderData, region);
    },
    gensApiURL,
  );
}

async function fetchRenderData(
  gensDb: GensAPI,
  chrom: string,
  annotSources: string[],
): Promise<RenderData> {
  console.log("Getting data to render for chrom", chrom);

  const annotationData = {};
  for (const source of annotSources) {
    const annotData = await gensDb.getAnnotations(chrom, source);
    annotationData[source] = annotData;
  }

  const renderData: RenderData = {
    chromInfo: await gensDb.getChromData(chrom),
    annotations: annotationData,
    covData: await gensDb.getCov(chrom),
    bafData: await gensDb.getBaf(chrom),
    transcriptData: await gensDb.getTranscripts(chrom),
    variantData: await gensDb.getVariants(chrom),
    overviewCovData: await gensDb.getOverviewCovData(),
    overviewBafData: await gensDb.getOverviewBafData(),
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

export { CHROMOSOMES, setupGenericEventManager } from "./track";
