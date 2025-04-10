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

import "./components/tracks_manager";
import { TracksManager } from "./components/tracks_manager";
import "./components/input_controls";
import { InputControls } from "./components/input_controls";
import { API } from "./state/api";
import { getRenderDataSource } from "./state/parse_api";

export async function initCanvases({
  sampleId,
  caseId,
  genomeBuild,
  scoutBaseURL,
  gensApiURL,
  annotationFile,
  startRegion,
}: {
  sampleName: string;
  sampleId: string;
  caseId: string;
  genomeBuild: number;
  scoutBaseURL: string;
  gensApiURL: string;
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


