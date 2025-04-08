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
  parseTranscripts,
  parseVariants,
  parseAnnotations,
} from "./components/tracks/render_utils";
// import { AnnotationTrack } from "./components/tracks/annotation_track";
// import { CoverageTrack } from "./components/tracks/coverage_track";
import { GensAPI as GensAPI } from "./state/gens_api";
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

  const renderDataSource = getRenderDataSource(
    api,
    () => {
      const region = inputControls.getRegion();
      return region.chrom;
    },
    () => {
      return inputControls.getAnnotations();
    },
  );

  const allChromData = await api.getAllChromData();

  const onChromClick = async (chrom) => {
    const chromData = await api.getChromData(chrom);
    inputControls.updateChromosome(chrom, chromData.size);
    gensTracks.updateRenderData();
    gensTracks.render();
  };

  gensTracks.initialize(
    allChromData,
    onChromClick,
    renderDataSource,
    () => inputControls.getRegion().chrom,
    () => inputControls.getRange(),
  );

  gensTracks.updateRenderData();
  gensTracks.render();

  // FIXME: Look into how to parse this for predefined start URLs
  inputControls.initialize(
    startRegion,
    [annotationFile],
    async (region) => {},
    async (_region, _source) => {
      gensTracks.updateRenderData();
      gensTracks.render();
    },
    async (_newXRange) => {
      gensTracks.updateRenderData();
      gensTracks.render();
    },
    gensApiURL,
  );
}

function getRenderDataSource(
  gensAPI: GensAPI,
  getChrom: () => string,
  getAnnotSources: () => string[],
): RenderDataSource {
  const getChromInfo = async () => {
    return await gensAPI.getChromData(getChrom());
  };

  const getAnnotations = async () => {
    const parsedAnnotationData = {};
    for (const source of getAnnotSources()) {
      const annotData = await gensAPI.getAnnotations(getChrom(), source);
      parsedAnnotationData[source] = parseAnnotations(annotData);
    }
    return parsedAnnotationData;
  };

  const getCovData = async () => {
    const covRaw = await gensAPI.getCov(getChrom());
    return parseCoverageDot(covRaw, STYLE.colors.teal);
  };

  const getBafData = async () => {
    const bafRaw = await gensAPI.getBaf(getChrom());
    return parseCoverageDot(bafRaw, STYLE.colors.orange);
  };

  const getTranscriptData = async () => {
    const transcriptsRaw = await gensAPI.getTranscripts(getChrom());
    return parseTranscripts(transcriptsRaw);
  };

  const getVariantData = async () => {
    const variantsRaw = await gensAPI.getVariants(getChrom());
    return parseVariants(variantsRaw, STYLE.colors.variantColors);
  };

  const getOverviewCovData = async () => {
    const overviewCovRaw = await gensAPI.getOverviewCovData();
    const overviewCovRender = transformMap(overviewCovRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewCovRender;
  };

  const getOverviewBafData = async () => {
    const overviewBafRaw = await gensAPI.getOverviewBafData();
    const overviewBafRender = transformMap(overviewBafRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewBafRender;
  };

  const renderDataSource: RenderDataSource = {
    getChromInfo,
    getAnnotations,
    getCovData,
    getBafData,
    getTranscriptData,
    getVariantData,
    getOverviewCovData,
    getOverviewBafData,
  };
  return renderDataSource;
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
