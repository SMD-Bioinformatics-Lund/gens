import "./components/tracks_manager/tracks_manager";
import "./components/input_controls";
import "./components/util/popup";
import "./components/util/shadowbaseelement";
import "./components/util/choice_select";
import "./components/side_menu/settings_menu";
import "./components/side_menu/track_row";
import "./components/side_menu/side_menu";
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
import { getRenderDataSource } from "./state/parse_data";
import { CHROMOSOMES, STYLE } from "./constants";
import { SideMenu } from "./components/side_menu/side_menu";
import {
  SettingsMenu,
  TrackHeights,
} from "./components/side_menu/settings_menu";
import { HeaderInfo } from "./components/header_info";
import { GensSession } from "./state/gens_session";
import { GensHome } from "./home/gens_home";
import { SampleInfo } from "./home/sample_table";
import { IconButton } from "./components/util/icon_button";
import { setupShortcuts } from "./shortcuts";

export async function samplesListInit(
  samples: SampleInfo[],
  scoutBaseURL: string,
  gensBaseURL: string,
  genomeBuild: number,
) {
  const gens_home = document.querySelector("#gens-home") as GensHome;

  const getGensURL = (caseId: string, sampleIds: string[]) => {
    const subpath = `app/viewer/${caseId}?sample_ids=${sampleIds.join(",")}&genome_build=${genomeBuild}`;

    return new URL(subpath, gensBaseURL).href;
  };

  const dummySamples = [];
  for (let i = 1; i <= 10000; i++) {
    const dummySample: SampleInfo = {
      sample_ids: ["S1", "S2", "S3"],
      case_id: `Case ${i}`,
      genome_build: 38,
      has_overview_file: true,
      files_present: true,
      created_at: "",
    }
    dummySamples.push(dummySample);
  }
  const final = [...samples, ...dummySamples];

  gens_home.initialize(final, scoutBaseURL, getGensURL);
}

export async function initCanvases({
  caseId,
  sampleIds,
  genomeBuild,
  scoutBaseURL,
  gensApiURL,
  annotationFile: defaultAnnotationName,
  // FIXME: Will be needed for link with external software, going directly to location
  startRegion,
  version,
  allSamples,
}: {
  caseId: string;
  sampleIds: string[];
  genomeBuild: number;
  scoutBaseURL: string;
  gensApiURL: string;
  annotationFile: string;
  startRegion: Region;
  version: string;
  allSamples: Sample[];
}) {
  const gensTracks = document.getElementById("gens-tracks") as TracksManager;
  const sideMenu = document.getElementById("side-menu") as SideMenu;
  const settingsPage = document.createElement("settings-page") as SettingsMenu;
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

  const api = new API(genomeBuild, gensApiURL);
  await api.initialize();

  const render = (settings: RenderSettings) => {
    gensTracks.render(settings);
    settingsPage.render(settings);
    inputControls.render(settings);
  };

  const trackHeights: TrackHeights = {
    bandCollapsed: STYLE.tracks.trackHeight.m,
    dotCollapsed: STYLE.tracks.trackHeight.m,
    dotExpanded: STYLE.tracks.trackHeight.xl,
  };

  const chromInfo = api.getChromInfo();
  const chromSizes = api.getChromSizes();
  const defaultRegion = { chrom: "1", start: 1, end: chromSizes["1"] };
  const samples = sampleIds.map((sampleId) => {
    return {
      caseId,
      sampleId
    }
  })
  const session = new GensSession(
    render,
    sideMenu,
    defaultRegion,
    chromInfo,
    chromSizes,
    samples,
    trackHeights,
    scoutBaseURL,
    gensApiURL.replace(/\/$/, "") + "/app/",
    settingsPage,
    genomeBuild,
  );

  const renderDataSource = getRenderDataSource(
    api,
    () => session.getChromosome(),
    () => session.getXRange(),
  );

  const onChromClick = async (chrom) => {
    session.setChromosome(chrom);
    render({ dataUpdated: true });
  };

  setupShortcuts(session, sideMenu, inputControls, onChromClick);

  const allAnnotSources = await api.getAnnotationSources();
  const defaultAnnot = allAnnotSources
    .filter((track) => track.name === defaultAnnotationName)
    .map((track) => {
      return {
        id: track.track_id,
        label: track.name,
      };
    });

  settingsPage.setSources(
    session,
    () => render({}),
    allAnnotSources,
    defaultAnnot,
    () => gensTracks.trackView.getDataTracks(),
    (trackId: string, direction: "up" | "down") =>
      gensTracks.trackView.moveTrack(trackId, direction),
    () => {
      const samples = session.getSamples();
      const currSampleIds = samples.map((sample) => sample.sampleId);
      const filtered = allSamples.filter((s) => !currSampleIds.includes(s.sampleId));
      return filtered;
    },
    (region: Region) => {
      const positionOnly = region.chrom == session.getChromosome();
      session.setChromosome(region.chrom, [region.start, region.end]);
      render({ dataUpdated: true, positionOnly });
    },
    // FIXME: Something strange here in how things are organized,
    // why is the trackview looping to itself?
    (sample: Sample) => {
      const isTrackView = true;
      gensTracks.trackView.addSample(
        sample,
        isTrackView,
      );
      session.addSample(sample);
      render({ dataUpdated: true, samplesUpdated: true });
    },
    (sample: Sample) => {
      // FIXME: This should eventually be session only, with tracks responding on rerender
      session.removeSample(sample);
      gensTracks.trackView.removeSample(sample);
      render({ dataUpdated: true, samplesUpdated: true });
    },
    (trackHeights: TrackHeights) => {
      session.setTrackHeights(trackHeights);
      gensTracks.trackView.setTrackHeights(trackHeights);
      render({});
    },
  );

  inputControls.initialize(
    session,
    async (range) => {
      session.setViewRange(range);
      render({ dataUpdated: true, positionOnly: true });
    },
    () => {
      sideMenu.showContent("Settings", [settingsPage]);

      if (!settingsPage.isInitialized) {
        settingsPage.initialize();
      }
    },
    () => {
      session.toggleChromViewActive();
      render({});
    },
    (query: string) => {
      return api.getSearchResult(query);
    },
    (settings: RenderSettings) => {
      render(settings);
    }
  );

  await gensTracks.initialize(
    render,
    samples,
    chromSizes,
    onChromClick,
    renderDataSource,
    session,
  );

  render({ dataUpdated: true, resized: true });
}
