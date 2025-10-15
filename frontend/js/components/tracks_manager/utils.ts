import { STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { TrackHeights } from "../side_menu/settings_menu";
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
import { DataTrackWrapper } from "./track_view";

const trackHeight = STYLE.tracks.trackHeight;

export const TRACK_HANDLE_CLASS = "track-handle";

export function createAnnotTrack(
  trackId: string,
  label: string,
  getXRange: () => Rng,
  getAnnotationBands: () => Promise<RenderBand[]>,
  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>,
  session: GensSession,
  openTrackContextMenu: (track: DataTrack) => void,
  settings: {
    height: number;
    showLabelWhenCollapsed: boolean;
    yPadBands?: boolean;
    startExpanded: boolean;
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
    session.showContent("Annotations", content, STYLE.menu.narrowWidth);
  };

  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    trackId: "FIXME",
    trackLabel: "FIXME",
    trackType: "annotation",
    height: { collapsedHeight: settings.height },
    showLabelWhenCollapsed: settings.showLabelWhenCollapsed,
    yPadBands: settings.yPadBands,
    isExpanded: settings.startExpanded,
    isHidden: false,
  };

  const track = new BandTrack(
    trackId,
    label,
    "annotation",
    () => fnSettings,
    (settings) => {
      fnSettings = settings;
      session.setTrackExpanded(trackId, settings.isExpanded);
    },
    () => getXRange(),
    () => getAnnotTrackData(getAnnotationBands),
    openContextMenuId,
    openTrackContextMenu,
    () => session.getMarkerModeOn(),
  );
  return track;
}

export function createDotTrack(
  trackId: string,
  label: string,
  trackType: "dot-cov" | "dot-baf",
  sample: Sample,
  dataFn: (sample: Sample) => Promise<RenderDot[]>,
  settings: {
    startExpanded: boolean;
    yAxis: Axis;
    hasLabel: boolean;
    fixedChrom: Chromosome | null;
  },
  getMarkerModeOn: () => boolean,
  getXRange: () => Rng,
  openTrackContextMenu: (track: DataTrack) => void,
  getTrackHeights: () => TrackHeights,
): DotTrack {
  // FIXME: Move to session
  let fnSettings: DataTrackSettings = {
    trackId: "FIXME",
    trackLabel: "FIXME",
    trackType: "dot-cov",
    height: {
      collapsedHeight: getTrackHeights().dotCollapsed,
      expandedHeight: getTrackHeights().dotExpanded,
    },
    yAxis: settings.yAxis,
    showLabelWhenCollapsed: settings.hasLabel,
    isExpanded: settings.startExpanded,
    isHidden: false,
  };

  const dotTrack = new DotTrack(
    trackId,
    label,
    trackType,
    () => fnSettings,
    (settings) => (fnSettings = settings),
    () => getXRange(),
    async () => {
      const data = await dataFn(sample);
      return {
        dots: data,
      };
    },
    openTrackContextMenu,
    getMarkerModeOn,
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
  fnSettings: DataTrackSettings,
): BandTrack {
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

      session.showContent("Variant", content, STYLE.menu.narrowWidth);
    },
    openTrackContextMenu,
    () => session.getMarkerModeOn(),
  );
  return variantTrack;
}

export function makeTrackContainer(
  track: DataTrack,
  sample: Sample | null,
): DataTrackWrapper {
  const wrapper = createDataTrackWrapper(track);
  return {
    track,
    container: wrapper,
    sample,
  };
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
  wrapper.id = `${track.id}-container`;
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
