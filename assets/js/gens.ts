export {
  setupDrawEventManager,
  previousChromosome,
  nextChromosome,
  panTracks,
  zoomIn,
  zoomOut,
  parseRegionDesignation,
  queryRegionOrGene,
} from "./unused/_navigation";

import "./components/top_bar";
import "./components/util/tag_multi_select";
// import { TopBar } from "./components/top_bar";
import "./components/tracks_manager";
import { TracksManager } from "./components/tracks_manager";
import "./components/input_controls";
import { InputControls } from "./components/input_controls";
import {
  parseCoverageDot,
  parseTranscripts,
  parseVariants,
  parseAnnotations,
} from "./draw/render_utils";
import { API } from "./state/api";
import { transformMap } from "./util/utils";
import { STYLE } from "./constants";

export async function initCanvases({
  sampleId,
  caseId,
  genomeBuild,
  gensApiURL,
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
  const gensTracks = document.getElementById("gens-tracks") as TracksManager;

  const inputControls = document.getElementById(
    "input-controls",
  ) as InputControls;

  const api = new API(sampleId, caseId, genomeBuild, gensApiURL);

  const renderDataSource = getRenderDataSource(
    api,
    () => {
      const region = inputControls.getRegion();
      return region.chrom;
    },
  );

  const allChromData = await api.getAllChromData();

  const onChromClick = async (chrom) => {
    const chromData = await api.getChromData(chrom);
    inputControls.updateChromosome(chrom, chromData.size);
    const updateData = true;
    gensTracks.render(updateData);
  };

  const getChromInfo = (chromosome: string) => {
    return allChromData[chromosome];
  };

  initialize(
    inputControls,
    gensTracks,
    startRegion,
    annotationFile,
    api,
    onChromClick,
    getChromInfo,
    renderDataSource,
  );
}

async function initialize(
  inputControls: InputControls,
  tracks: TracksManager,
  startRegion: Region,
  defaultAnnotation: string,
  api: API,
  onChromClick: (string) => void,
  getChromInfo: (string) => ChromosomeInfo,
  renderDataSource: RenderDataSource,
) {

  const annotSources = await api.getAnnotationSources();

  console.log(annotSources);

  // FIXME: Look into how to parse this for predefined start URLs
  inputControls.initialize(
    startRegion,
    [defaultAnnotation],
    async (_region, _source) => {
      tracks.render(true);
    },
    async (_newXRange) => {
      tracks.render(true);
    },
    annotSources
  );

  await tracks.initialize(
    getChromInfo,
    onChromClick,
    renderDataSource,
    () => inputControls.getRegion().chrom,
    () => inputControls.getRange(),
    () => inputControls.getAnnotSources(),
  );

  tracks.render(true);
}

function getRenderDataSource(
  gensAPI: API,
  getChrom: () => string,
): RenderDataSource {
  const getChromInfo = async () => {
    return await gensAPI.getChromData(getChrom());
  };

  const getAnnotation = async (source: string) => {
    const annotData = await gensAPI.getAnnotations(getChrom(), source);
    return parseAnnotations(annotData);
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
    getAnnotation,
    getCovData,
    getBafData,
    getTranscriptData,
    getVariantData,
    getOverviewCovData,
    getOverviewBafData,
  };
  return renderDataSource;
}

