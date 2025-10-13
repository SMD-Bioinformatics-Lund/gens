import { STYLE } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { BandTrack } from "../../tracks/band_track";
import { DataTrackSettingsNew } from "../../tracks/base_tracks/data_track";
import { DotTrack } from "../../tracks/dot_track";
import {
  getAnnotationContextMenuContent,
  getVariantContextMenuContent,
} from "../../util/menu_content_utils";
import { getSimpleButton } from "../../util/menu_utils";

export function getRawTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettingsNew,
) {
  let rawTrack;
  if (setting.trackType == "annotation") {
    const getAnnotationBands = () =>
      dataSource.getAnnotationBands(setting.trackId, session.getChromosome());
    rawTrack = getBandTrack(session, dataSource, setting, getAnnotationBands);
  } else if (setting.trackType == "gene-list") {
    const getGeneListBands = () =>
      dataSource.getGeneListBands(setting.trackId, session.getChromosome());
    rawTrack = getBandTrack(session, dataSource, setting, getGeneListBands);
  } else if (setting.trackType == "sample-annotation") {
    const getSampleAnnotBands = () =>
      dataSource.getSampleAnnotationBands(
        setting.trackId,
        session.getChromosome(),
      );
    rawTrack = getBandTrack(session, dataSource, setting, getSampleAnnotBands);
  } else if (setting.trackType == "variant") {
    // FIXME: Generalize the rank score threshold. Where did it come from before?
    const rankScoreThres = 4;
    const getSampleAnnotBands = () =>
      dataSource.getVariantBands(
        setting.sample,
        session.getChromosome(),
        rankScoreThres,
      );
    rawTrack = getBandTrack(session, dataSource, setting, getSampleAnnotBands);
  } else if (setting.trackType == "dot-cov") {
    const getSampleCovDots = () => {
      const data = dataSource.getCovData(
        setting.sample,
        session.getChromosome(),
        session.getXRange(),
      );
      console.log("Requesting new cov data");
      return data;
    };

    rawTrack = getDotTrack(session, setting, getSampleCovDots);
  } else if (setting.trackType == "dot-baf") {
    const getSampleBafDots = () =>
      dataSource.getBafData(
        setting.sample,
        session.getChromosome(),
        session.getXRange(),
      );
    rawTrack = getDotTrack(session, setting, getSampleBafDots);
  } else {
    throw Error(`Not yet supported track type ${setting.trackType}`);
  }
  return rawTrack;
}

function getDotTrack(
  session: GensSession,
  setting: DataTrackSettingsNew,
  getDots: () => Promise<RenderDot[]>,
): DotTrack {
  const dotTrack = new DotTrack(
    setting.trackId,
    setting.trackLabel,
    setting.trackType,
    () => {
      return setting;
    },
    (settings) => {},
    () => session.getXRange(),
    () => {
      return getDots().then((dots) => {
        return {
          dots,
        };
      });
    },
    () => {},
    () => false,
  );
  return dotTrack;
}

function getBandTrack(
  session: GensSession,
  dataSource: RenderDataSource,
  setting: DataTrackSettingsNew,
  getRenderBands: () => Promise<RenderBand[]>,
): BandTrack {
  const annotationOpenContextMenuId = async (id: string) => {
    // const details = await dataSource.getAnnotationDetails(id);
    const details = await dataSource.getAnnotationDetails(id);
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

  const variantOpenContextMenuId = async (variantId: string) => {
    // FIXME: How to control this for the sample?
    const details = await dataSource.getVariantDetails(variantId);
    const scoutUrl = "Placeholder";
    // const scoutUrl = getVariantURL(details.document_id);

    const button = getSimpleButton("Set highlight", () => {
      session.addHighlight([details.start, details.end]);
    });
    const container = document.createElement("div");
    container.appendChild(button);

    const entries = getVariantContextMenuContent(
      setting.sample.sampleId,
      details,
      scoutUrl,
    );
    const content = [container];
    content.push(...entries);

    session.showContent("Variant", content, STYLE.menu.narrowWidth);
  };

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
      if (setting.trackType == "annotation") {
        annotationOpenContextMenuId(id);
      } else if (setting.trackType == "variant") {
        // FIXME: This is not the variant ID
        variantOpenContextMenuId(id);
      } else if (setting.trackType == "gene-list") {
      } else if (setting.trackType == "gene") {
      } else {
        throw new Error(`Track type not supported: ${setting.trackType}`);
      }
    },
    () => {
      console.warn("Attempting to open track context menu");
    },
    // openContextMenuId,
    // openTrackContextMenu,
    () => session.getMarkerModeOn(),
  );
  return rawTrack;
}
