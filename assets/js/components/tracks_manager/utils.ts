import { STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { BandTrack } from "../tracks/band_track";
import { DataTrack, DataTrackSettings } from "../tracks/base_tracks/data_track";
import { DotTrack } from "../tracks/dot_track";
import { OverviewTrack } from "../tracks/overview_track";
import {
  getAnnotationContextMenuContent,
  getGenesContextMenuContent,
  getVariantContextMenuContent,
} from "../util/menu_content_utils";
import { getSimpleButton } from "../util/menu_utils";
import { TrackViewTrackInfo } from "./track_view";

const trackHeight = STYLE.tracks.trackHeight;

export const TRACK_HANDLE_CLASS = "track-handle";

export function createAnnotTrack(
  trackId: string,
  label: string,
  getAnnotationBands: () => Promise<RenderBand[]>,
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  settings: {
    height: number;
    showLabelWhenCollapsed: boolean;
    yPadBands?: boolean;
  },
): BandTrack {
  // FIXME: Seems the x range should be separated from the annotations or?
  async function getAnnotTrackData(
    getXRange: () => Rng,
    getAnnotation: () => Promise<RenderBand[]>,
  ): Promise<BandTrackData> {
    const bands = await getAnnotation();
    return {
      xRange: getXRange(),
      bands,
    };
  }

  const openContextMenuId = async (id: string) => {
    // const details = await dataSource.getAnnotationDetails(id);
    const details = await getAnnotationDetails(id);
    const button = getSimpleButton("Set highlight", () => {
      session.addHighlight([details.start, details.end]);
    });
    const container = document.createElement("div");
    container.appendChild(button);
    const entries = getAnnotationContextMenuContent(id, details);
    const content = [container];
    content.push(...entries);
    session.showContent("Annotations", content);
  };

  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    height: { collapsedHeight: settings.height, startExpanded: false },
    showLabelWhenCollapsed: settings.showLabelWhenCollapsed,
    yPadBands: settings.yPadBands,
    isExpanded: false,
  };

  const track = new BandTrack(
    trackId,
    label,
    "annotation",
    () => fnSettings,
    (settings) => {
      fnSettings = settings;
    },
    () => session.getXRange(),
    () => getAnnotTrackData(() => session.getXRange(), getAnnotationBands),
    openContextMenuId,
    openTrackContextMenu,
    session,
  );
  return track;
}

export function createDotTrack(
  trackId: string,
  label: string,
  sample: Sample,
  dataFn: (sample: Sample) => Promise<RenderDot[]>,
  settings: { startExpanded: boolean; yAxis: Axis; hasLabel: boolean },
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): DotTrack {
  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    height: {
      collapsedHeight: trackHeight.m,
      expandedHeight: trackHeight.xl,
      startExpanded: settings.startExpanded,
    },
    yAxis: settings.yAxis,
    showLabelWhenCollapsed: settings.hasLabel,
    isExpanded: settings.startExpanded,
  };

  const dotTrack = new DotTrack(
    trackId,
    label,
    "dot",
    () => fnSettings,
    (settings) => (fnSettings = settings),
    () => session.getXRange(),
    async () => {
      const data = await dataFn(sample);
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
  dataFn: () => Promise<RenderBand[]>,
  getVariantDetails: (variantId: string) => Promise<ApiVariantDetails>,
  getVariantURL: (variantId: string) => string,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): BandTrack {
  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    height: {
      collapsedHeight: STYLE.bandTrack.trackViewHeight,
      startExpanded: false,
    },
    showLabelWhenCollapsed: true,
    isExpanded: false,
  };

  const variantTrack = new BandTrack(
    id,
    label,
    "variant",
    () => fnSettings,
    (settings) => (fnSettings = settings),
    () => session.getXRange(),
    async () => {
      return {
        xRange: session.getXRange(),
        bands: await dataFn(),
      };
    },
    async (variantId: string) => {
      const details = await getVariantDetails(variantId);
      const scoutUrl = getVariantURL(variantId);

      const button = getSimpleButton("Set highlight", () => {
        session.addHighlight([details.position, details.end]);
      });
      const container = document.createElement("div");
      container.appendChild(button);

      const entries = getVariantContextMenuContent(
        variantId,
        details,
        scoutUrl,
      );
      const content = [container];
      content.push(...entries);

      session.showContent("Variant", content);
    },
    openTrackContextMenu,
    session,
  );
  return variantTrack;
}

export function getTrackInfo(
  track: DataTrack,
  sample: Sample | null,
): TrackViewTrackInfo {
  const wrapper = createDataTrackWrapper(track);
  return {
    track,
    container: wrapper,
    sample,
  };
}

export function createGeneTrack(
  id: string,
  label: string,
  getBands: (chrom: string) => Promise<RenderBand[]>,
  getDetails: (id: string) => Promise<ApiGeneDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): TrackViewTrackInfo {
  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    height: {
      collapsedHeight: STYLE.bandTrack.trackViewHeight,
      startExpanded: false,
    },
    showLabelWhenCollapsed: true,
    isExpanded: false,
  };

  const genesTrack = new BandTrack(
    id,
    label,
    "gene",
    () => fnSettings,
    (settings) => (fnSettings = settings),
    () => session.getXRange(),
    async () => {
      return {
        xRange: session.getXRange(),
        bands: await getBands(session.getChromosome()),
      };
    },
    async (id) => {
      const details = await getDetails(id);
      const container = document.createElement("div");
      const button = getSimpleButton("Set highlight", () => {
        session.addHighlight([details.start, details.end]);
      });
      container.appendChild(button);
      const entries = getGenesContextMenuContent(id, details);
      const content = [container];
      content.push(...entries);
      session.showContent("Transcript", content);
    },
    openTrackContextMenu,
    session,
  );
  return getTrackInfo(genesTrack, null);
}

export function createOverviewTrack(
  id: string,
  label: string,
  getData: () => Promise<Record<string, RenderDot[]>>,
  yRange: Rng,
  chromSizes: Record<string, number>,
  chromClick: (chrom: string) => void,
  session: GensSession,
): OverviewTrack {
  const overviewTrack = new OverviewTrack(
    id,
    label,
    { height: trackHeight.l },
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
