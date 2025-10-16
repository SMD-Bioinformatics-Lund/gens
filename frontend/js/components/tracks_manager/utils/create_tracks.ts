import { STYLE } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { BandTrack } from "../../tracks/band_track";
import {
  DataTrack,
  DataTrackSettings,
} from "../../tracks/base_tracks/data_track";
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
  updateDataTrackSettings: (
    trackId: string,
    settings: DataTrackSettings,
  ) => void,
) {
  let rawTrack;
  if (setting.trackType == "annotation") {
    const getAnnotationBands = () =>
      dataSource.getAnnotationBands(setting.trackId, session.getChromosome());
    rawTrack = getBandTrack(
      session,
      dataSource,
      setting,
      getAnnotationBands,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else if (setting.trackType == "gene-list") {
    const getGeneListBands = () =>
      dataSource.getGeneListBands(setting.trackId, session.getChromosome());
    rawTrack = getBandTrack(
      session,
      dataSource,
      setting,
      getGeneListBands,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else if (setting.trackType == "sample-annotation") {
    const getSampleAnnotBands = () =>
      dataSource.getSampleAnnotationBands(
        setting.trackId,
        session.getChromosome(),
      );
    rawTrack = getBandTrack(
      session,
      dataSource,
      setting,
      getSampleAnnotBands,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else if (setting.trackType == "variant") {
    const getSampleAnnotBands = () =>
      dataSource.getVariantBands(
        setting.sample,
        session.getChromosome(),
        session.getVariantThreshold(),
      );
    rawTrack = getBandTrack(
      session,
      dataSource,
      setting,
      getSampleAnnotBands,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else if (setting.trackType == "dot-cov") {
    const getSampleCovDots = () => {
      const data = dataSource.getCovData(
        setting.sample,
        session.getChromosome(),
        session.getXRange(),
      );
      return data;
    };

    rawTrack = getDotTrack(
      session,
      setting,
      getSampleCovDots,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else if (setting.trackType == "dot-baf") {
    const getSampleBafDots = () =>
      dataSource.getBafData(
        setting.sample,
        session.getChromosome(),
        session.getXRange(),
      );
    rawTrack = getDotTrack(
      session,
      setting,
      getSampleBafDots,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else if (setting.trackType == "gene") {
    const getGeneBands = () =>
      dataSource.getTranscriptBands(session.getChromosome());
    rawTrack = getBandTrack(
      session,
      dataSource,
      setting,
      getGeneBands,
      showTrackContextMenu,
      updateDataTrackSettings,
    );
  } else {
    throw Error(`Not yet supported track type ${setting.trackType}`);
  }
  return rawTrack;
}

export function getDotTrack(
  session: GensSession,
  setting: DataTrackSettings,
  getDots: () => Promise<RenderDot[]>,
  // FIXME: Would it be enough with the track setting here?
  showTrackContextMenu: (track: DataTrack) => void,
  updateDataTrackSettings: (
    trackId: string,
    updatedSetting: DataTrackSettings,
  ) => void,
): DotTrack {
  const dotTrack = new DotTrack(
    setting.trackId,
    setting.trackLabel,
    setting.trackType,
    () => {
      return setting;
    },
    (updatedSettings) => {
      updateDataTrackSettings(setting.trackId, updatedSettings);
    },
    () => session.getXRange(),
    () => {
      return getDots().then((dots) => {
        return {
          dots,
        };
      });
    },
    (track) => {
      console.log("Passing in track", track);
      showTrackContextMenu(track);
    },
    () => session.getMarkerModeOn(),
  );
  return dotTrack;
}

export function getBandTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettings,
  getRenderBands: () => Promise<RenderBand[]>,
  showTrackContextMenu: (track: DataTrack) => void,
  updateDataTrackSettings: (
    trackId: string,
    updatedSetting: DataTrackSettings,
  ) => void,
): BandTrack {
  const rawTrack = new BandTrack(
    setting.trackId,
    setting.trackLabel,
    setting.trackType,
    () => {
      return setting;
    },
    (updatedSetting) => {
      updateDataTrackSettings(setting.trackId, updatedSetting);
    },
    () => session.getXRange(),
    () => {
      async function getBandTrackData(
        getAnnotation: () => Promise<RenderBand[]>,
      ): Promise<BandTrackData> {
        const bands = await getAnnotation();
        return {
          bands,
        };
      }

      return getBandTrackData(getRenderBands);
    },
    (id) => {
      console.warn("Attempting to open context menu for ID", id);
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
    },
    (track) => {
      showTrackContextMenu(track);
    },
    () => session.getMarkerModeOn(),
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
