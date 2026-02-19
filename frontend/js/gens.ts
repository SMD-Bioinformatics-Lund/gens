import "./components/tracks_manager/tracks_manager";
import "./components/input_controls";
import "./components/util/popup";
import "./components/util/shadowbaseelement";
import "./components/util/choice_select";
import "./components/side_menu/settings_menu";
import "./components/side_menu/track_row";
import "./components/side_menu/side_menu";
import "./components/side_menu/info_menu";
import "./components/side_menu/help_menu";
import "./components/header_info";
import "./movements/marker";
import "./components/side_menu/track_menu";
import "./components/util/icon_button";
import "./components/util/row";

import "./home/gens_home";
import "./home/sample_table";
import "./components/tracks_manager/chromosome_view";
import "./components/tracks_manager/track_view";

import { API } from "./state/api";
import { TracksManager } from "./components/tracks_manager/tracks_manager";
import { InputControls } from "./components/input_controls";
import { getRenderDataSource } from "./state/data_source";
import { STYLE } from "./constants";
import { SideMenu } from "./components/side_menu/side_menu";
import {
  SettingsMenu,
  TrackHeights,
} from "./components/side_menu/settings_menu";
import { InfoMenu } from "./components/side_menu/info_menu";
import { HeaderInfo } from "./components/header_info";
import { GensSession } from "./state/gens_session";
import { GensHome } from "./home/gens_home";
import { SampleInfo } from "./home/sample_table";
import { setupShortcuts } from "./shortcuts";
import { getMainSample } from "./util/utils";
import { HelpMenu } from "./components/side_menu/help_menu";
import { parseSex } from "./util/meta_warnings";

/**
 * Needed when app is mounted at a reverse-proxy subpath (i.e. https://domain/gens vs https://gens)
 */
function getAppBaseURL(gensApiURL: string): string {
  const apiURL = new URL(gensApiURL);
  const normalizedPath = apiURL.pathname.replace(/\/+$/, "");
  const appPath = normalizedPath.endsWith("/api")
    ? normalizedPath.slice(0, -4)
    : normalizedPath;
  const finalPath = appPath === "" ? "/" : `${appPath.replace(/\/+$/, "")}/`;
  return new URL(finalPath, apiURL.origin).href;
}

export async function samplesListInit(
  samples: SampleInfo[],
  variantSoftwareBaseURL: string | null,
  gensBaseURL: string,
) {
  const gens_home = document.querySelector("#gens-home") as GensHome;
  const appBaseURL = getAppBaseURL(gensBaseURL);

  const getGensURL = (
    caseId: string,
    genomeBuild: number,
    sampleIds?: string[],
  ) => {
    let subpath;
    if (sampleIds != null) {
      subpath = `viewer/${caseId}?sample_ids=${sampleIds.join(",")}&genome_build=${genomeBuild}`;
    } else {
      subpath = `viewer/${caseId}?genome_build=${genomeBuild}`;
    }

    return new URL(subpath, appBaseURL).href;
  };

  gens_home.initialize(samples, variantSoftwareBaseURL, getGensURL);
}

export async function initCanvases({
  caseId,
  displayCaseId,
  sampleIds,
  genomeBuild,
  variantSoftwareBaseURL,
  gensApiURL,
  mainSampleTypes,
  startRegion,
  version,
  allSamples,
  defaultProfiles,
  warningThresholds,
}: {
  caseId: string;
  displayCaseId?: string | null;
  sampleIds: string[];
  genomeBuild: number;
  variantSoftwareBaseURL: string | null;
  gensApiURL: string;
  mainSampleTypes: string[];
  annotationFile: string;
  startRegion: { chrom: Chromosome; start?: number; end?: number } | null;
  version: string;
  allSamples: Sample[];
  defaultProfiles: Record<string, ProfileSettings>;
  warningThresholds: WarningThreshold[];
}) {
  const gensTracks = document.getElementById("gens-tracks") as TracksManager;
  const sideMenu = document.getElementById("side-menu") as SideMenu;
  const settingsPage = document.createElement("settings-page") as SettingsMenu;
  const infoPage = document.createElement("info-page") as InfoMenu;
  const helpPage = document.createElement("help-page") as HelpMenu;
  const headerInfo = document.getElementById("header-info") as HeaderInfo;

  // FIXME: This will need to be adapted when more software are introduced
  const variantSoftwareCaseUrl = variantSoftwareBaseURL
    ? `${variantSoftwareBaseURL}/case/case_id/${caseId}`
    : null;

  headerInfo.initialize(caseId, displayCaseId, variantSoftwareCaseUrl, version);

  const inputControls = document.getElementById(
    "input-controls",
  ) as InputControls;

  const api = new API(genomeBuild, gensApiURL);
  await api.initialize();

  const render = (settings: RenderSettings) => {
    gensTracks.render(settings);
    settingsPage.render(settings);
    infoPage.render();
    helpPage.render();
    inputControls.render(settings);

    if (settings.saveLayoutChange) {
      gensTracks.trackView.saveTrackLayout();
    }
  };

  // FIXME: Think about how to organize. Get data sources?
  const orderSamples = (samples: ApiSample[]): ApiSample[] => {
    const mainSample = samples.find((s) =>
      mainSampleTypes.includes(s.sample_type),
    );
    if (mainSample != null) {
      const index = samples.indexOf(mainSample);
      const remaining = samples
        .filter((_, i) => i != index)
        .sort((s1, s2) => s1.sample_id.localeCompare(s2.sample_id));
      return [mainSample, ...remaining];
    }
    return samples.sort((s1, s2) => s1.sample_id.localeCompare(s2.sample_id));
  };

  const unorderedSamples = await Promise.all(
    sampleIds.map((sampleId) =>
      api.getSample({ caseId, sampleId, genomeBuild }),
    ),
  );
  const caseSamples = orderSamples(unorderedSamples).map((sample) => {
    const parsedSex = parseSex(sample.sex);

    const result: Sample = {
      caseId: sample.case_id,
      displayCaseId: sample.display_case_id,
      sampleId: sample.sample_id,
      sampleType: sample.sample_type,
      genomeBuild: sample.genome_build,
      sex: parsedSex,
      meta: sample.meta,
    };
    return result;
  });

  const mainSample = getMainSample(caseSamples);

  const allAnnotSources = await api.getAnnotationSources();

  const session = new GensSession(
    render,
    sideMenu,
    mainSample,
    caseSamples,
    allSamples,
    variantSoftwareBaseURL,
    getAppBaseURL(gensApiURL),
    genomeBuild,
    defaultProfiles,
    api.getChromInfo(),
    api.getChromSizes(),
    startRegion,
    allAnnotSources,
    warningThresholds,
  );

  const renderDataSource = getRenderDataSource(
    api,
    () => session.pos.getChromosome(),
    () => session.pos.getXRange(),
    (id) => session.getVariantURL(id),
  );

  const onChromClick = async (chrom) => {
    session.pos.setChromosome(chrom);
    render({ reloadData: true, chromosomeChange: true });
  };

  setupShortcuts(session, sideMenu, inputControls, onChromClick, render);

  addSettingsPageSources(
    settingsPage,
    session,
    render,
    allAnnotSources,
    allSamples,
    gensTracks,
    headerInfo,
    caseId,
    displayCaseId,
  );

  infoPage.setSources(
    () => session.getSamples(),
    (metaId: string) => session.getMetaWarnings(metaId),
  );

  headerInfo.setCaseLabel(session.getDisplayCaseLabel(caseId, displayCaseId));

  const getSearchResults = (query: string) => {
    const annotIds = session
      .getAnnotationSources({ selectedOnly: true })
      .map((annot) => annot.id);
    return api.getSearchResult(query, annotIds);
  };

  initializeInputControls(
    session,
    inputControls,
    sideMenu,
    render,
    settingsPage,
    infoPage,
    helpPage,
    getSearchResults,
  );

  await gensTracks.initializeTrackView(
    render,
    session.pos.getChromSizes(),
    onChromClick,
    renderDataSource,
    session,
  );

  render({ reloadData: true, resized: true });
}

function initializeInputControls(
  session: GensSession,
  inputControls: InputControls,
  sideMenu: SideMenu,
  render: (settings: RenderSettings) => void,
  settingsPage: SettingsMenu,
  infoPage: InfoMenu,
  helpPage: HelpMenu,
  getSearchResults: (query: string) => Promise<ApiSearchResult>,
) {
  const showBadge = session.hasMetaWarnings();

  const onPositionChange = async (range) => {
    session.pos.setViewRange(range);
    render({ reloadData: true, positionOnly: true });
  };
  const onOpenSettings = () => {
    sideMenu.showContent("Settings", [settingsPage], STYLE.menu.width);
    if (!settingsPage.isInitialized) {
      settingsPage.initialize();
      render({});
    }
  };
  const onOpenInfo = () => {
    sideMenu.showContent("Sample info", [infoPage], STYLE.menu.width);
    infoPage.render();
  };
  const onOpenHelp = () => {
    sideMenu.showContent("Help", [helpPage], STYLE.menu.width);
    helpPage.render();
  };
  const onToggleChromView = () => {
    session.toggleChromViewActive();
    render({});
  };
  const onChange = (settings: RenderSettings) => {
    render(settings);
  };

  inputControls.initialize(
    session,
    onPositionChange,
    onOpenSettings,
    onOpenInfo,
    onOpenHelp,
    onToggleChromView,
    getSearchResults,
    onChange,
    showBadge,
  );
}

function addSettingsPageSources(
  settingsPage: SettingsMenu,
  session: GensSession,
  render: (settings: RenderSettings) => void,
  allAnnotSources: ApiAnnotationTrack[],
  allSamples: Sample[],
  gensTracks: TracksManager,
  headerInfo: HeaderInfo,
  caseId: string,
  displayCaseId: string | null | undefined,
) {
  const onTrackMove = (trackId: string, direction: "up" | "down") => {
    session.tracks.shiftTrack(trackId, direction);
    render({ tracksReorderedOnly: true, saveLayoutChange: true });
  };
  const getAllSamples = () => {
    const currentBuild = session.getMainSample().genomeBuild;
    const samples = session.getSamples();
    const currSampleIds = samples.map(
      (sample) => `${sample.caseId}_${sample.sampleId}`,
    );
    const filtered = allSamples.filter((s) => {
      const sampleKey = `${s.caseId}_${s.sampleId}`;
      return (
        s.genomeBuild === currentBuild && !currSampleIds.includes(sampleKey)
      );
    });
    return filtered;
  };
  const gotoHighlight = (region: Region) => {
    const positionOnly = region.chrom == session.pos.getChromosome();
    session.pos.setChromosome(region.chrom, [region.start, region.end]);
    render({ reloadData: true, positionOnly, chromosomeChange: !positionOnly });
  };
  const onAddSample = async (sample: Sample) => {
    session.addSample(sample);
    render({ reloadData: true, samplesUpdated: true });
  };
  const onRemoveSample = (sample: Sample) => {
    // FIXME: This should eventually be session only, with tracks responding on rerender
    session.removeSample(sample);
    render({ reloadData: true, samplesUpdated: true });
  };
  const setTrackHeights = (trackHeights: TrackHeights) => {
    session.profile.setTrackHeights(trackHeights);
    render({ reloadData: true });
  };
  const onColorByChange = async (annotIds: string[]) => {
    session.profile.setColorAnnotations(annotIds);
    render({ colorByChange: true });
  };
  const onApplyDefaultCovRange = (rng: Rng) => {
    gensTracks.setCovYRange(rng);
    render({ reloadData: true });
  };
  const onSetAnnotationSelection = (ids: string[]) => {
    session.profile.setAnnotationSelections(ids);
    render({});
  };
  const onSetGeneListSelection = (ids: string[]) => {
    session.profile.setAnnotationSelections(ids);
    render({});
  };
  const onSetVariantThreshold = (threshold: number) => {
    session.profile.setVariantThreshold(threshold);
    render({ reloadData: true });
  };
  const onToggleTrackHidden = (trackId: string) => {
    session.tracks.toggleTrackHidden(trackId);
    render({ saveLayoutChange: true, targetTrackId: trackId });
  };
  const onToggleTrackExpanded = (trackId: string) => {
    session.tracks.toggleTrackExpanded(trackId);
    render({ saveLayoutChange: true, targetTrackId: trackId });
  };
  const onAssignMainSample = (sample: Sample) => {
    session.setMainSample(sample);
    render({ mainSampleChanged: true, reloadData: true });
  };
  const onApplyDisplayAliases = (
    targetCaseId: string,
    caseAlias: string | null,
    sampleAliases: { sample: Sample; alias: string | null }[],
  ) => {
    let aliasesChanged = false;
    if (session.getSessionCaseDisplayAlias(targetCaseId) !== caseAlias) {
      session.setSessionCaseDisplayAlias(targetCaseId, caseAlias);
      aliasesChanged = true;
    }

    for (const { sample, alias } of sampleAliases) {
      const currentAlias = session.getSessionSampleDisplayAlias(
        sample.caseId,
        sample.sampleId,
        sample.genomeBuild,
      );
      if (currentAlias === alias) {
        continue;
      }
      session.setSessionSampleDisplayAlias(
        sample.caseId,
        sample.sampleId,
        sample.genomeBuild,
        alias,
      );
      aliasesChanged = true;
    }

    if (!aliasesChanged) {
      return;
    }
    headerInfo.setCaseLabel(session.getDisplayCaseLabel(caseId, displayCaseId));
    render({ reloadData: true, mainSampleChanged: true, samplesUpdated: true });
  };

  const getProfile = () => {
    return session.profile.getProfile();
  };

  const applyProfile = async (profile: ProfileSettings) => {
    session.loadProfile(profile);
    headerInfo.setCaseLabel(session.getDisplayCaseLabel(caseId, displayCaseId));
    session.loadTrackLayout();
    render({
      reloadData: true,
      tracksReordered: true,
      saveLayoutChange: true,
      colorByChange: true,
    });
  };

  const resetLayout = () => {
    session.resetTrackLayout();
    headerInfo.setCaseLabel(session.getDisplayCaseLabel(caseId, displayCaseId));
    render({
      reloadData: true,
      tracksReordered: true,
      saveLayoutChange: true,
      colorByChange: true,
    });
  };

  settingsPage.setSources(
    session,
    allAnnotSources,
    onTrackMove,
    getAllSamples,
    gotoHighlight,
    onAddSample,
    onRemoveSample,
    setTrackHeights,
    onColorByChange,
    onApplyDefaultCovRange,
    onSetAnnotationSelection,
    onSetGeneListSelection,
    onSetVariantThreshold,
    onToggleTrackHidden,
    onToggleTrackExpanded,
    onAssignMainSample,
    onApplyDisplayAliases,
    getProfile,
    applyProfile,
    resetLayout,
  );
}
