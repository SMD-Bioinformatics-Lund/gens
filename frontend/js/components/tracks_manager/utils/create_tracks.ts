import { STYLE } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { BandTrack } from "../../tracks/band_track";
import { DataTrack } from "../../tracks/base_tracks/data_track";
import { DotTrack } from "../../tracks/dot_track";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "../../util/menu_content_utils";
import { getSimpleButton } from "../../util/menu_utils";

export function getTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettings,
  showTrackContextMenu: (track: DataTrack) => void,
  setIsExpanded: (trackId: string, isExpanded: boolean) => void,
  setExpandedHeight: (trackId: string, expandedHeight: number) => void,
  getColorBands: () => RenderBand[],
  getXRange: () => Rng,
) {
  const getChromosome = () => session.pos.getChromosome();

  let track;
  if (setting.trackType == "annotation") {
    const getAnnotationBands = () =>
      dataSource.getAnnotationBands(setting.trackId, getChromosome());
    track = getBandTrack(
      session,
      dataSource,
      setting,
      getAnnotationBands,
      showTrackContextMenu,
      setIsExpanded,
      setExpandedHeight,
      getColorBands,
      getXRange,
    );
  } else if (setting.trackType == "gene-list") {
    const getGeneListBands = () =>
      dataSource.getGeneListBands(setting.trackId, getChromosome());
    track = getBandTrack(
      session,
      dataSource,
      setting,
      getGeneListBands,
      showTrackContextMenu,
      setIsExpanded,
      setExpandedHeight,
      getColorBands,
      getXRange,
    );
  } else if (setting.trackType == "sample-annotation") {
    const getSampleAnnotBands = () =>
      dataSource.getSampleAnnotationBands(setting.trackId, getChromosome());
    track = getBandTrack(
      session,
      dataSource,
      setting,
      getSampleAnnotBands,
      showTrackContextMenu,
      setIsExpanded,
      setExpandedHeight,
      getColorBands,
      getXRange,
    );
  } else if (setting.trackType == "variant") {
    const getSampleAnnotBands = () =>
      dataSource.getVariantBands(
        setting.sample,
        getChromosome(),
        session.profile.getVariantThreshold(),
      );
    track = getBandTrack(
      session,
      dataSource,
      setting,
      getSampleAnnotBands,
      showTrackContextMenu,
      setIsExpanded,
      setExpandedHeight,
      getColorBands,
      getXRange,
    );
  } else if (setting.trackType == "dot-cov") {
    const getSampleCovDots = () => {
      const data = dataSource.getCovData(
        setting.sample,
        getChromosome(),
        getXRange(),
      );
      return data;
    };

    track = getDotTrack(
      session,
      () => setting,
      getSampleCovDots,
      showTrackContextMenu,
      setIsExpanded,
      getColorBands,
      getXRange,
    );
  } else if (setting.trackType == "dot-baf") {
    const getSampleBafDots = () =>
      dataSource.getBafData(setting.sample, getChromosome(), getXRange());
    track = getDotTrack(
      session,
      () => setting,
      getSampleBafDots,
      showTrackContextMenu,
      setIsExpanded,
      getColorBands,
      getXRange,
    );
  } else if (setting.trackType == "gene") {
    const getGeneBands = () => dataSource.getTranscriptBands(getChromosome());
    track = getBandTrack(
      session,
      dataSource,
      setting,
      getGeneBands,
      showTrackContextMenu,
      setIsExpanded,
      setExpandedHeight,
      getColorBands,
      getXRange,
    );
  } else {
    throw Error(`Not yet supported track type ${setting.trackType}`);
  }
  return track;
}

export function getDotTrack(
  session: GensSession,
  getSettings: () => DataTrackSettings,
  getDots: () => Promise<RenderDot[]>,
  // FIXME: Would it be enough with the track setting here?
  showTrackContextMenu: (track: DataTrack) => void,
  setIsExpanded: (trackId: string, isExpanded: boolean) => void,
  getColorBands: () => RenderBand[],
  getXRange: () => Rng,
): DotTrack {
  const settings = getSettings();

  const getRenderData = () => {
    return getDots().then((dots) => {
      return {
        dots,
      };
    });
  };

  const dotTrack = new DotTrack(
    settings.trackId,
    settings.trackLabel,
    settings.trackType,
    getSettings,
    (isExpanded) => setIsExpanded(settings.trackId, isExpanded),
    () => getXRange(),
    getRenderData,
    (track) => {
      showTrackContextMenu(track);
    },
    () => session.getMarkerModeOn(),
    () => getColorBands(),
  );
  return dotTrack;
}

export function getBandTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettings,
  getRenderBands: () => Promise<RenderBand[]>,
  showTrackContextMenu: (track: DataTrack) => void,
  setIsExpanded: (trackId: string, isExpanded: boolean) => void,
  setExpandedHeight: (trackId: string, height: number) => void,
  getColorBands: () => RenderBand[],
  getXRange: () => Rng,
): BandTrack {
  const getSettings = () => setting;
  const mySetIsExpanded = (isExpanded: boolean) => {
    setIsExpanded(setting.trackId, isExpanded);
  };
  const mySetExpandedHeight = (expandedHeight: number) => {
    setExpandedHeight(setting.trackId, expandedHeight);
    // updateDataTrackSettings(setting.trackId, updatedSetting);
  };
  const getRenderData = () => {
    async function getBandTrackData(
      getAnnotation: () => Promise<RenderBand[]>,
    ): Promise<BandTrackData> {
      const bands = await getAnnotation();
      return {
        bands,
      };
    }

    return getBandTrackData(getRenderBands);
  };
  const openContextMenu = (id) => {
    let contextMenuFn: (id: string) => void;
    if (setting.trackType == "annotation") {
      contextMenuFn = getAnnotOpenContextMenu(session, (id: string) =>
        dataSource.getAnnotationDetails(id),
      );
    } else if (setting.trackType == "variant") {
      contextMenuFn = getVariantOpenContextMenu(
        session,
        dataSource,
        setting.sample.sampleId,
      );
    } else if (setting.trackType == "gene-list") {
      throw new Error("Not implemented yet");
    } else if (setting.trackType == "gene") {
      contextMenuFn = getGenesOpenContextMenu(session, dataSource);
    } else if (setting.trackType == "sample-annotation") {
      contextMenuFn = getAnnotOpenContextMenu(session, (id: string) =>
        dataSource.getSampleAnnotationDetails(id),
      );
    } else {
      throw new Error(`Track type not supported: ${setting.trackType}`);
    }
    contextMenuFn(id);
  };

  const rawTrack = new BandTrack(
    setting.trackId,
    setting.trackLabel,
    setting.trackType,
    getSettings,
    mySetIsExpanded,
    mySetExpandedHeight,
    () => getXRange(),
    getRenderData,
    openContextMenu,
    (track) => {
      showTrackContextMenu(track);
    },
    () => session.getMarkerModeOn(),
    () => getColorBands(),
  );
  return rawTrack;
}

function getGenesOpenContextMenu(
  session: GensSession,
  dataSource: RenderDataSource,
) {
  return async (id: string) => {
    const details = await dataSource.getTranscriptDetails(id);
    const button = getSimpleButton("Set highlight", () => {
      session.addHighlight([details.start, details.end]);
    });
    const container = document.createElement("div");
    container.appendChild(button);
    const entries = getGenesContextMenuContent(id, details);
    const content = [container];
    content.push(...entries);
    session.showContent("Genes", content, STYLE.menu.narrowWidth);
  };
}

function getAnnotOpenContextMenu(
  session: GensSession,
  dataFn: (
    id: string,
  ) => Promise<ApiAnnotationDetails | ApiSampleAnnotationDetails>,
) {
  return async (id: string) => {
    const details = await dataFn(id);
    const button = getSimpleButton("Set highlight", () => {
      session.addHighlight([details.start, details.end]);
    });
    const container = document.createElement("div");
    container.appendChild(button);
    const entries = getAnnotationContextMenuContent(id, details);
    const content = [container];
    content.push(...entries);
    session.showContent("Annotations", content, STYLE.menu.narrowWidth);
  };
}

function getVariantOpenContextMenu(
  session: GensSession,
  dataSource: RenderDataSource,
  sampleId: string,
) {
  return async (variantId: string) => {
    const details = await dataSource.getVariantDetails(variantId);
    const scoutUrl = dataSource.getVariantURL(details.document_id);

    const button = getSimpleButton("Set highlight", () => {
      session.addHighlight([details.start, details.end]);
    });
    const container = document.createElement("div");
    container.appendChild(button);

    const entries = getVariantContextMenuContent(sampleId, details, scoutUrl);
    const content = [container];
    content.push(...entries);

    session.showContent("Variant", content, STYLE.menu.narrowWidth);
  };
}
