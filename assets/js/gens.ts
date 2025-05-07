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
import { GensSession } from "./state/session";

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
  const gensTracks = document.getElementById("gens-tracks") as TracksManager;

  const sideMenu = document.getElementById("side-menu") as SideMenu;
  const settingsPage = document.createElement("settings-page") as SettingsPage;

  const headerInfo = document.getElementById("header-info") as HeaderInfo;
  headerInfo.initialize(caseId, sampleIds);

  const inputControls = document.getElementById(
    "input-controls",
  ) as InputControls;

  const api = new API(caseId, genomeBuild, gensApiURL);

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

  const render = (settings: RenderSettings) => {
    gensTracks.render(settings);
    settingsPage.render(settings);
    inputControls.render(settings);
  };

  const onChromClick = async (chrom) => {
    const chromData = await api.getChromData(chrom);
    inputControls.updateChromosome(chrom, chromData.size);
    render({ dataUpdated: true });
  };

  const getChromInfo = async (chromosome: string): Promise<ChromosomeInfo> => {
    return await api.getChromData(chromosome);
  };

  const getVariantURL = (variantId) => {
    const url = `${scoutBaseURL}/document_id/${variantId}`;
    return url;
  };

  const session = new GensSession(render, sideMenu);

  setupShortcuts(
    session,
    sideMenu,
    inputControls,
    onChromClick,
  );

  const annotSources = await api.getAnnotationSources();
  const defaultAnnot = annotSources
    .filter((track) => track.name === defaultAnnotationName)
    .map((track) => {
      return {
        id: track.track_id,
        label: track.name,
      };
    });

  settingsPage.setSources(
    () => render({}),
    annotSources,
    defaultAnnot,
    (_newSources) => {
      render({ dataUpdated: false });
    },
    () => gensTracks.getDataTracks(),
    (trackId: string, direction: "up" | "down") =>
      gensTracks.moveTrack(trackId, direction),
  );

  initialize(
    session,
    render,
    sampleIds,
    inputControls,
    gensTracks,
    startRegion,
    settingsPage,
    api,
    onChromClick,
    getChromInfo,
    renderDataSource,
    getVariantURL,
  );

  const settingsButton = document.getElementById(
    "settings-button",
  ) as HTMLDivElement;
  settingsButton.addEventListener("click", () => {
    sideMenu.showContent("Settings", [settingsPage]);

    if (!settingsPage.isInitialized) {
      settingsPage.initialize(render);
    }
  });
}

async function initialize(
  session: GensSession,
  render: (settings: RenderSettings) => void,
  sampleIds: string[],
  inputControls: InputControls,
  tracks: TracksManager,
  startRegion: Region,
  settingsPage: SettingsPage,
  api: API,
  onChromClick: (chrom: string) => void,
  getChromInfo: (chrom: string) => Promise<ChromosomeInfo>,
  renderDataSource: RenderDataSource,
  getVariantURL: (variantId: string) => string,
) {
  const chromSizes = {};
  for (const chromosome of CHROMOSOMES) {
    const chromInfo = await getChromInfo(chromosome);
    chromSizes[chromosome] = chromInfo.size;
  }

  inputControls.initialize(
    startRegion,
    async (_range) => {
      render({ dataUpdated: true });
    },
    session,
  );

  await tracks.initialize(
    render,
    sampleIds,
    chromSizes,
    onChromClick,
    renderDataSource,
    () => inputControls.getRegion().chrom,
    () => inputControls.getRange(),
    (range: Rng) => {
      inputControls.updatePosition(range);
      render({ dataUpdated: true });
    },
    () => inputControls.zoomOut(),
    () => settingsPage.getAnnotSources(),
    getVariantURL,
    async (id: string) => await api.getAnnotationDetails(id),
    async (id: string) => await api.getTranscriptDetails(id),
    async (sampleId: string, variantId: string) =>
      await api.getVariantDetails(
        sampleId,
        variantId,
        inputControls.getRegion().chrom,
      ),
    session,
  );

  render({ dataUpdated: true, resized: true });
}

function setupShortcuts(
  session: GensSession,
  sideMenu: SideMenu,
  inputControls: InputControls,
  onChromClick: (chrom: string) => void,
) {
  // Rebuild the keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (session.getMarkerMode()) {
        inputControls.toggleMarkerMode();
        return;
      }
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
    if (e.key === "m") {
      inputControls.toggleMarkerMode();
    }
  });
}
