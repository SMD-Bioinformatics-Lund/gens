import "./components/tracks_manager";
import "./components/input_controls";
import "./components/util/popup";
import "./components/util/shadowbaseelement";
import "./components/side_menu";

import { API } from "./state/api";
import { TracksManager } from "./components/tracks_manager";
import { InputControls } from "./components/input_controls";
import { getRenderDataSource } from "./state/parse_data";
import { CHROMOSOMES } from "./constants";
import { SideMenu } from "./components/side_menu";

export async function initCanvases({
  sampleId,
  caseId,
  genomeBuild,
  scoutBaseURL: scoutBaseURL,
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

  const sideMenu = document.getElementById("side-menu") as SideMenu;

  const settingsButton = document.getElementById(
    "settings-button",
  ) as HTMLDivElement;
  settingsButton.addEventListener("click", () => {
    console.log("Clicked!");
    const content = document.createElement("div");
    content.innerHTML = "Settings content";
    sideMenu.showContent("Settings", [content]);
  });

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
    () => {
      const region = inputControls.getRegion();
      return [region.start, region.end];
    },
  );

  const onChromClick = async (chrom) => {
    const chromData = await api.getChromData(chrom);
    inputControls.updateChromosome(chrom, chromData.size);
    const updateData = true;
    gensTracks.render(updateData);
  };

  const getChromInfo = async (chromosome: string): Promise<ChromosomeInfo> => {
    return await api.getChromData(chromosome);
  };

  const getVariantURL = (variantId) => {
    const url = `${scoutBaseURL}/document_id/${variantId}`;
    return url;
  };

  const openContextMenu = (header: string, content: HTMLDivElement[]) => {
    sideMenu.showContent(header, content);
  };

  // Rebuild the keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      sideMenu.close();
    } else if (e.key === "ArrowLeft") {
      if (e.ctrlKey || e.metaKey) {
        const currChrom = inputControls.getRegion().chrom;
        const currIndex = CHROMOSOMES.indexOf(currChrom);
        if (currIndex > 0) {
          const newChrom = CHROMOSOMES[currIndex - 1];
          onChromClick(newChrom);
        }
      } else {
        inputControls.panLeft();
      }
    } else if (e.key === "ArrowRight") {
      if (e.ctrlKey || e.metaKey) {
        const currChrom = inputControls.getRegion().chrom;
        const currIndex = CHROMOSOMES.indexOf(currChrom);
        if (currIndex < CHROMOSOMES.length - 1) {
          const newChrom = CHROMOSOMES[currIndex + 1];
          onChromClick(newChrom);
        }
      } else {
        inputControls.panRight();
      }
    } else if (e.key === "ArrowUp") {
      inputControls.zoomIn();
    } else if (e.key === "ArrowDown") {
      inputControls.zoomOut();
    }
  });

  initialize(
    inputControls,
    gensTracks,
    startRegion,
    annotationFile,
    api,
    onChromClick,
    getChromInfo,
    renderDataSource,
    getVariantURL,
    openContextMenu,
  );
}

async function initialize(
  inputControls: InputControls,
  tracks: TracksManager,
  startRegion: Region,
  defaultAnnotation: string,
  api: API,
  onChromClick: (chrom: string) => void,
  getChromInfo: (chrom: string) => Promise<ChromosomeInfo>,
  renderDataSource: RenderDataSource,
  getVariantURL: (variantId: string) => string,
  openContextMenu: (header: string, content: HTMLDivElement[]) => void,
) {
  const annotSources = await api.getAnnotationSources();

  const chromSizes = {};
  for (const chromosome of CHROMOSOMES) {
    const chromInfo = await getChromInfo(chromosome);
    chromSizes[chromosome] = chromInfo.size;
  }

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
    annotSources,
    (chrom: string) => {
      return chromSizes[chrom];
    },
  );

  await tracks.initialize(
    chromSizes,
    onChromClick,
    renderDataSource,
    () => inputControls.getRegion().chrom,
    () => inputControls.getRange(),
    () => inputControls.getAnnotSources(),
    getVariantURL,
    async (id: string) => await api.getAnnotationDetails(id),
    async (id: string) => await api.getTranscriptDetails(id),
    openContextMenu,
  );

  tracks.render(true);
}
