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
    startExpanded: boolean;
    minBandSize?: boolean;
  },
): BandTrack {
  // FIXME: Seems the x range should be separated from the annotations or?
  async function getAnnotTrackData(
    getAnnotation: () => Promise<RenderBand[]>,
  ): Promise<BandTrackData> {
    const bands = await getAnnotation();
    return {
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
    height: { collapsedHeight: settings.height },
    showLabelWhenCollapsed: settings.showLabelWhenCollapsed,
    yPadBands: settings.yPadBands,
    isExpanded: settings.startExpanded,
    isHidden: false,
    // FIXME: This is actually a band track specific setting
    minBandSize: settings.minBandSize,
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
    () => getAnnotTrackData(getAnnotationBands),
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
  settings: {
    startExpanded: boolean;
    yAxis: Axis;
    hasLabel: boolean;
    fixedChrom: Chromosome | null;
  },
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
): DotTrack {
  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    height: {
      collapsedHeight: trackHeight.m,
      expandedHeight: trackHeight.xl,
    },
    yAxis: settings.yAxis,
    showLabelWhenCollapsed: settings.hasLabel,
    isExpanded: settings.startExpanded,
    isHidden: false,
  };

  const dotTrack = new DotTrack(
    trackId,
    label,
    () => fnSettings,
    (settings) => (fnSettings = settings),
    () =>
      settings.fixedChrom != null
        ? [1, session.getChromSize("1")]
        : session.getXRange(),
    async () => {
      const data = await dataFn(sample);
      return {
        dots: data,
      };
    },
    openTrackContextMenu,
    session,
  );
  return dotTrack;
}

export function createVariantTrack(
  sampleId: string,
  trackId: string,
  label: string,
  dataFn: () => Promise<RenderBand[]>,
  getVariantDetails: (documentId: string) => Promise<ApiVariantDetails>,
  getVariantURL: (documentId: string) => string,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  fnSettings: DataTrackSettings
): BandTrack {
  // FIXME: Move to session


  const variantTrack = new BandTrack(
    trackId,
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
      const scoutUrl = getVariantURL(details.document_id);

      const button = getSimpleButton("Set highlight", () => {
        session.addHighlight([details.start, details.end]);
      });
      const container = document.createElement("div");
      container.appendChild(button);

      const entries = getVariantContextMenuContent(sampleId, details, scoutUrl);
      const content = [container];
      content.push(...entries);

      session.showContent("Variant", content);
    },
    openTrackContextMenu,
    session,
  );
  return variantTrack;
}

export function makeTrackContainer(
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
  openTrackContextMenu: ((track: DataTrack) => void) | null,
): TrackViewTrackInfo {
  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    height: {
      collapsedHeight: STYLE.bandTrack.trackViewHeight,
    },
    showLabelWhenCollapsed: true,
    isExpanded: false,
    isHidden: false,
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
  return makeTrackContainer(genesTrack, null);
}

export function createOverviewTrack(
  id: string,
  label: string,
  getData: () => Promise<Record<string, RenderDot[]>>,
  yRange: Rng,
  chromSizes: Record<string, number>,
  chromClick: (chrom: string) => void,
  session: GensSession,
  yAxis: Axis,
): OverviewTrack {
  const overviewTrack = new OverviewTrack(
    id,
    label,
    { height: trackHeight.xl },
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
    yAxis,
  );
  return overviewTrack;
}

export function createDataTrackWrapper(track: DataTrack) {
  const wrapper = document.createElement("div");
  // wrapper.classList.add("track-wrapper");
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
