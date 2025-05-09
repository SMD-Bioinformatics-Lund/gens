import { STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { BandTrack } from "../tracks/band_track";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { DotTrack } from "../tracks/dot_track";
import { OverviewTrack } from "../tracks/overview_track";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "../util/menu_content_utils";
import { getSimpleButton } from "../util/menu_utils";
import { TracksManagerDataSources } from "./tracks_manager";

const trackHeight = STYLE.tracks.trackHeight;

export const TRACK_HANDLE_CLASS = "track-handle";

export function createAnnotTrack(
  sourceId: string,
  label: string,
  dataSources: TracksManagerDataSources,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): BandTrack {
  async function getAnnotTrackData(
    source: string,
    getXRange: () => Rng,
    getAnnotation: (source: string) => Promise<RenderBand[]>,
  ): Promise<BandTrackData> {
    const bands = await getAnnotation(source);
    return {
      xRange: getXRange(),
      bands,
    };
  }

  const openContextMenuId = async (id: string) => {
    const details = await dataSources.getAnnotationDetails(id);
    const button = getSimpleButton("Set highlight", () => {
      session.addHighlight([details.start, details.end]);
    });
    const entries = getAnnotationContextMenuContent(id, details);
    const content = [button];
    content.push(...entries);
    session.showContent("Annotations", content);
  };

  const track = new BandTrack(
    sourceId,
    label,
    trackHeight.thin,
    () => session.getXRange(),
    () =>
      getAnnotTrackData(
        sourceId,
        () => session.getXRange(),
        dataSources.getAnnotation,
      ),
    openContextMenuId,
    openTrackContextMenu,
    session,
  );
  return track;
}

export function createDotTrack(
  id: string,
  label: string,
  sampleId: string,
  dataFn: (sampleId: string) => Promise<RenderDot[]>,
  settings: { startExpanded: boolean; yAxis: Axis },
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): DotTrack {
  const dotTrack = new DotTrack(
    id,
    label,
    trackHeight.thick,
    settings.startExpanded,
    settings.yAxis,
    () => session.getXRange(),
    async () => {
      const data = await dataFn(sampleId);
      // const data = await this.dataSource.getCovData(sampleId);
      return {
        xRange: session.getXRange(),
        dots: data,
      };
    },
    openTrackContextMenu,
    session,
  );
  return dotTrack;
}

export function createVariantTrack(
  id: string,
  label: string,
  sampleId: string,
  dataFn: (sampleId: string) => Promise<RenderBand[]>,
  getVariantDetails: (
    sampleId: string,
    variantId: string,
  ) => Promise<ApiVariantDetails>,
  getVariantURL: (variantId: string) => string,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): BandTrack {
  const variantTrack = new BandTrack(
    id,
    label,
    trackHeight.thin,
    () => session.getXRange(),
    async () => {
      return {
        xRange: session.getXRange(),
        bands: await dataFn(sampleId),
      };
    },
    async (variantId: string) => {
      const details = await getVariantDetails(sampleId, variantId);
      const scoutUrl = getVariantURL(variantId);

      const button = getSimpleButton("Set highlight", () => {
        session.addHighlight([details.position, details.end]);
      });

      const entries = getVariantContextMenuContent(
        variantId,
        details,
        scoutUrl,
      );
      const content = [button];
      content.push(...entries);

      session.showContent("Variant", content);
    },
    openTrackContextMenu,
    session,
  );
  return variantTrack;
}

export function createGenesTrack(
  id: string,
  label: string,
  getBands: () => Promise<RenderBand[]>,
  getDetails: (id: string) => Promise<ApiGeneDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): BandTrack {
  const genesTrack = new BandTrack(
    id,
    label,
    trackHeight.thin,
    () => session.getXRange(),
    async () => {
      return {
        xRange: session.getXRange(),
        bands: await getBands(),
      };
    },
    async (id) => {
      const details = await getDetails(id);
      const button = getSimpleButton("Set highlight", () => {
        session.addHighlight([details.start, details.end]);
      });
      const entries = getGenesContextMenuContent(id, details);
      const content = [button];
      content.push(...entries);
      session.showContent("Transcript", content);
    },
    openTrackContextMenu,
    session,
  );
  return genesTrack;
}

export function createOverviewTrack(
  id: string,
  label: string,
  getData: () => Promise<Record<string, RenderDot[]>>,
  yRange: Rng,
  chromSizes: Record<string, number>,
  chromClick: (chrom: string) => void,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): OverviewTrack {
  const overviewTrack = new OverviewTrack(
    id,
    label,
    trackHeight.thick,
    chromSizes,
    chromClick,
    yRange,
    async () => {
      return {
        dotsPerChrom: await getData(),
        xRange: session.getXRange(),
        chromosome: session.getChromosome(),
      };
    },
    () => {
      const xRange = session.getXRange();
      const chrom = session.getChromosome();
      return {
        chrom,
        start: xRange[0],
        end: xRange[1],
      };
    },
    true,
  );
  return overviewTrack;
}

export function createDataTrackWrapper(track: DataTrack) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("track-wrapper");
  wrapper.style.position = "relative";
  wrapper.appendChild(track);

  const handle = document.createElement("div");
  handle.className = TRACK_HANDLE_CLASS;
  handle.style.position = "absolute";
  handle.style.top = "0";
  handle.style.left = "0";
  handle.style.width = `${STYLE.yAxis.width}px`;
  handle.style.height = "100%";
  wrapper.appendChild(handle);

  return wrapper;

  //   parentContainer.appendChild(wrapper);
}
