import "./components/tracks_manager";
import "./components/input_controls";
import "./components/util/popup";
import "./components/util/shadowbaseelement";
import "./components/util/choice_select";
import "./components/side_menu";
import "./components/settings_page";
import "./components/header_info";
import "./components/util/marker";

import { API } from "./state/api";
import { TracksManager } from "./components/tracks_manager";
import { InputControls } from "./components/input_controls";
import { getRenderDataSource } from "./state/parse_data";
import { CHROMOSOMES } from "./constants";
import { SideMenu } from "./components/side_menu";
import { SettingsPage } from "./components/settings_page";
import { HeaderInfo } from "./components/header_info";

export async function initCanvases({
  caseId,
  sampleIds,
  genomeBuild,
  scoutBaseURL: scoutBaseURL,
  gensApiURL,
  annotationFile: defaultAnnotationName,
  startRegion,
}: {
  caseId: string;
  sampleIds: string[];
  genomeBuild: number;
  scoutBaseURL: string;
  gensApiURL: string;
  annotationFile: string;
  startRegion: Region;
}) {

  console.log("Case:", caseId, "sample IDs:", sampleIds);

  const gensTracks = document.getElementById("gens-tracks") as TracksManager;

  const sideMenu = document.getElementById("side-menu") as SideMenu;

  const headerInfo = document.getElementById("header-info") as HeaderInfo;
  headerInfo.initialize(caseId, sampleIds);

  const inputControls = document.getElementById(
    "input-controls",
  ) as InputControls;

  const api = new API(caseId, sampleIds, genomeBuild, gensApiURL);

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

  setupShortcuts(sideMenu, inputControls, onChromClick);

  const annotSources = await api.getAnnotationSources();
  const defaultAnnot = annotSources
    .filter((track) => track.name === defaultAnnotationName)
    .map((track) => {
      return {
        id: track.track_id,
        label: track.name,
      };
    });

  const settingsPage = document.createElement("settings-page") as SettingsPage;
  settingsPage.setSources(annotSources, defaultAnnot, (_newSources) => {
    gensTracks.render(true);
  });

  initialize(
    inputControls,
    gensTracks,
    startRegion,
    settingsPage,
    api,
    onChromClick,
    getChromInfo,
    renderDataSource,
    getVariantURL,
    openContextMenu,
  );

  const settingsButton = document.getElementById(
    "settings-button",
  ) as HTMLDivElement;
  settingsButton.addEventListener("click", () => {
    sideMenu.showContent("Settings", [settingsPage]);

    if (!settingsPage.isInitialized) {
      settingsPage.initialize();
    }
  });
}

async function initialize(
  inputControls: InputControls,
  tracks: TracksManager,
  startRegion: Region,
  settingsPage: SettingsPage,
  api: API,
  onChromClick: (chrom: string) => void,
  getChromInfo: (chrom: string) => Promise<ChromosomeInfo>,
  renderDataSource: RenderDataSource,
  getVariantURL: (variantId: string) => string,
  openContextMenu: (header: string, content: HTMLDivElement[]) => void,
) {
  const chromSizes = {};
  for (const chromosome of CHROMOSOMES) {
    const chromInfo = await getChromInfo(chromosome);
    chromSizes[chromosome] = chromInfo.size;
  }

  // FIXME: Move to settings class
  let highlights: Record<string, Rng> = {};

  const highlightCallbacks = {
    getHighlights: () => {
      return Object.entries(highlights).map(([id, range]) => {
        return {
          id,
          range,
        };
      });
    },
    removeHighlights: () => {
      highlights = {};
      tracks.render(false);
    },
    addHighlight: (id: string, range: Rng) => {
      highlights[id] = range;
      tracks.render(false);
    },
    removeHighlight: (id: string) => {
      delete highlights[id];
      tracks.render(false);
    },
  };

  inputControls.initialize(
    startRegion,
    async (_range) => {
      tracks.render(true);
    },
    highlightCallbacks.removeHighlights,
  );

  await tracks.initialize(
    chromSizes,
    onChromClick,
    renderDataSource,
    () => inputControls.getRegion().chrom,
    () => inputControls.getRange(),
    (range: Rng) => {
      inputControls.updatePosition(range);
      tracks.render(true);
    },
    () => inputControls.zoomOut(),
    () => settingsPage.getAnnotSources(),
    getVariantURL,
    async (id: string) => await api.getAnnotationDetails(id),
    async (id: string) => await api.getTranscriptDetails(id),
    async (id: string) =>
      await api.getVariantDetails(id, inputControls.getRegion().chrom),
    openContextMenu,
    highlightCallbacks,
  );

  tracks.render(true);
}

function setupShortcuts(
  sideMenu: SideMenu,
  inputControls: InputControls,
  onChromClick: (chrom: string) => void,
) {
  // Rebuild the keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      sideMenu.close();
    }
    if (e.key === "ArrowLeft") {
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
    }
    if (e.key === "ArrowRight") {
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
    }
    if (e.key === "ArrowUp") {
      inputControls.zoomIn();
    }
    if (e.key === "ArrowDown") {
      inputControls.zoomOut();
    }
    if (e.key === "r") {
      inputControls.resetZoom();
    }
  });
}
