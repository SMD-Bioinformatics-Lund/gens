import "./components/tracks_manager/tracks_manager";
import "./components/input_controls";
import "./components/util/popup";
import "./components/util/shadowbaseelement";
import "./components/util/choice_select";
import "./components/side_menu/settings_page";
import "./components/side_menu/track_row";
import "./components/side_menu/side_menu";
import "./components/header_info";
import "./movements/marker";
import "./components/side_menu/track_page";
import "./components/util/row";
import "./components/util/icon_button";

import "./home/gens_home";
import "./home/sample_table";

import { API } from "./state/api";
import { TracksManager } from "./components/tracks_manager/tracks_manager";
import { InputControls } from "./components/input_controls";
import { getRenderDataSource } from "./state/parse_data";
import { CHROMOSOMES } from "./constants";
import { SideMenu } from "./components/side_menu/side_menu";
import { SettingsPage } from "./components/side_menu/settings_page";
import { HeaderInfo } from "./components/header_info";
import { GensSession } from "./state/gens_session";
import { GensHome } from "./home/gens_home";
import { SampleInfo } from "./home/sample_table";

export async function testHomeInit(
  samples: SampleInfo[],
  scoutBaseURL: string,
  genomeBuild: number,
) {
  const gens_home = document.querySelector("#gens-home") as GensHome;

  const getGensURL = (caseId: string, sampleIds: string[]) => {
    // FIXME: Extract genome build
    // FIXME: Look into how to organize end points - should this be through the API class? Probably.
    return `/app/viewer/${caseId}?sample_ids=${sampleIds.join(",")}&genome_build=${genomeBuild}`;
  };

  gens_home.initialize(samples, scoutBaseURL, getGensURL);
}

export async function initCanvases({
  caseId,
  sampleIds,
  genomeBuild,
  scoutBaseURL: scoutBaseURL,
  gensApiURL,
  annotationFile: defaultAnnotationName,
  startRegion,
  version,
  allSampleIds,
}: {
  caseId: string;
  sampleIds: string[];
  genomeBuild: number;
  scoutBaseURL: string;
  gensApiURL: string;
  annotationFile: string;
  startRegion: Region;
  version: string;
  allSampleIds: string[];
}) {
  const gensTracks = document.getElementById("gens-tracks") as TracksManager;

  const sideMenu = document.getElementById("side-menu") as SideMenu;
  const settingsPage = document.createElement("settings-page") as SettingsPage;

  const headerInfo = document.getElementById("header-info") as HeaderInfo;
  headerInfo.initialize(
    caseId,
    sampleIds,
    `${scoutBaseURL}/case/case_id/${caseId}`,
    version,
  );

  const inputControls = document.getElementById(
    "input-controls",
  ) as InputControls;

  const api = new API(caseId, genomeBuild, gensApiURL);
  await api.initialize();

  const render = (settings: RenderSettings) => {
    gensTracks.render(settings);
    settingsPage.render(settings);
    inputControls.render(settings);
  };

  const chromSizes = api.getChromSizes();
  const defaultRegion = { chrom: "1", start: 1, end: chromSizes["1"] };
  const session = new GensSession(
    render,
    sideMenu,
    defaultRegion,
    chromSizes,
    sampleIds,
  );

  const renderDataSource = getRenderDataSource(
    api,
    () => session.getChromosome(),
    () => session.getXRange(),
  );

  const onChromClick = async (chrom) => {
    session.updateChromosome(chrom);
    render({ dataUpdated: true });
  };

  const getChromInfo = async (chromosome: string): Promise<ChromosomeInfo> => {
    return await api.getChromData(chromosome);
  };

  const getVariantURL = (variantId) => {
    const url = `${scoutBaseURL}/document_id/${variantId}`;
    return url;
  };

  setupShortcuts(session, sideMenu, inputControls, onChromClick);

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
    () => session.getSamples(),
    () => {
      const samples = session.getSamples();
      return allSampleIds.filter(s => !samples.includes(s));
    },
    () => session.getAllHighlights(),
    (region: Region) => {
      const positionOnly = region.chrom == session.getChromosome();
      session.updateChromosome(region.chrom, [region.start, region.end]);
      render({ dataUpdated: true, positionOnly });
    },
    (id: string) => {
      session.removeHighlight(id);
    },
    (sampleId: string) => {
      gensTracks.addSample(sampleId);
      session.addSample(sampleId);
      render({ dataUpdated: true, samplesUpdated: true });
    },
    (sampleId: string) => {
      // FIXME: This should eventually be session only, with tracks responding on rerender
      session.removeSample(sampleId);
      gensTracks.removeSample(sampleId);
      render({ dataUpdated: true, samplesUpdated: true });
    },
  );

  initialize(
    session,
    render,
    sampleIds,
    inputControls,
    gensTracks,
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
      settingsPage.initialize();
    }
  });
}

// FIXME: Remove this subfunction? Move it to the main function above
async function initialize(
  session: GensSession,
  render: (settings: RenderSettings) => void,
  sampleIds: string[],
  inputControls: InputControls,
  tracks: TracksManager,
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

  inputControls.initialize(session, async (range) => {
    session.setViewRange(range);
    render({ dataUpdated: true, positionOnly: true });
  });

  const tracksDataSources = {
    getAnnotationSources: (settings: { selectedOnly: boolean }) =>
      settingsPage.getAnnotSources(settings),
    getVariantUrl: (id: string) => getVariantURL(id),
    getAnnotationDetails: (id: string) => api.getAnnotationDetails(id),
    getTranscriptDetails: (id: string) => api.getTranscriptDetails(id),
    getVariantDetails: (sampleId: string, variantId: string) =>
      api.getVariantDetails(sampleId, variantId, session.getChromosome()),

    getAnnotation: (id: string) => renderDataSource.getAnnotation(id),
    getCovData: (id: string) => renderDataSource.getCovData(id),
    getBafData: (id: string) => renderDataSource.getBafData(id),
    getVariantData: (id: string) => renderDataSource.getVariantData(id),

    getTranscriptData: () => renderDataSource.getTranscriptData(),
    getOverviewCovData: (sampleId: string) =>
      renderDataSource.getOverviewCovData(sampleId),
    getOverviewBafData: (sampleId: string) =>
      renderDataSource.getOverviewBafData(sampleId),

    getChromInfo: () => renderDataSource.getChromInfo(),
  };

  await tracks.initialize(
    render,
    sampleIds,
    chromSizes,
    onChromClick,
    tracksDataSources,
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
      if (session.getMarkerModeOn()) {
        inputControls.toggleMarkerMode();
        return;
      }
      sideMenu.close();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currChrom = session.getChromosome();
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
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currChrom = session.getChromosome();
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
      e.preventDefault();
      inputControls.zoomIn();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
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
