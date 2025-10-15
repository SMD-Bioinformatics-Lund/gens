import { STYLE } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { TrackMenu } from "../../side_menu/track_menu";
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

// FIXME: Should the track context menu come in as a separate thing or?

export function getRawTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettings,
  showTrackContextMenu: (track: DataTrack) => void,
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
    );
  } else if (setting.trackType == "variant") {
    // FIXME: Generalize the rank score threshold. Where did it come from before?
    const rankScoreThres = 4;
    const getSampleAnnotBands = () =>
      dataSource.getVariantBands(
        setting.sample,
        session.getChromosome(),
        rankScoreThres,
      );
    rawTrack = getBandTrack(
      session,
      dataSource,
      setting,
      getSampleAnnotBands,
      showTrackContextMenu,
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
    );
  } else {
    throw Error(`Not yet supported track type ${setting.trackType}`);
  }
  return rawTrack;
}

function getDotTrack(
  session: GensSession,
  setting: DataTrackSettings,
  getDots: () => Promise<RenderDot[]>,
  showTrackContextMenu: (track: DataTrack) => void,
): DotTrack {
  const dotTrack = new DotTrack(
    setting.trackId,
    setting.trackLabel,
    setting.trackType,
    () => {
      return setting;
    },
    (settings) => {
      console.warn("Assigning a new setting does not seem to be implemented");
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
      showTrackContextMenu(track);
    },
    () => session.getMarkerModeOn(),
  );
  return dotTrack;
}

function getBandTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettings,
  getRenderBands: () => Promise<RenderBand[]>,
  showTrackContextMenu: (track: DataTrack) => void,
): BandTrack {
  const rawTrack = new BandTrack(
    setting.trackId,
    setting.trackLabel,
    setting.trackType,
    () => {
      // console.warn("Attempting to retrieve setting", setting);
      return setting;
    },
    (_settings) => {
      // console.warn("Attempting to update setting", setting);
      // fnSettings = settings;
      // session.setTrackExpanded(trackId, settings.isExpanded);
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
        contextMenuFn = getAnnotOpenContextMenu(
          session,
          dataSource,
          (id: string) => dataSource.getAnnotationDetails(id),
        );
      } else if (setting.trackType == "variant") {
        // // FIXME: This is not the variant ID
        // variantOpenContextMenuId(id);
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
        contextMenuFn = getAnnotOpenContextMenu(
          session,
          dataSource,
          (id: string) => dataSource.getSampleAnnotationDetails(id),
        );
      } else {
        throw new Error(`Track type not supported: ${setting.trackType}`);
      }
      contextMenuFn(id);
    },
    (track) => {
      showTrackContextMenu(track);
    },
    // openContextMenuId,
    // openTrackContextMenu,
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
  dataSource: RenderDataSource,
  dataFn: (
    id: string,
  ) => Promise<ApiAnnotationDetails | ApiSampleAnnotationDetails>,
) {
  return async (id: string) => {
    const details = await dataFn(id);
    // const details = await dataSource.getAnnotationDetails(id);
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
    // FIXME: How to control this for the sample?
    const details = await dataSource.getVariantDetails(variantId);
    // const scoutUrl = "Placeholder";
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

