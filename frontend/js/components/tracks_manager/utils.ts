import { STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { OverviewTrack } from "../tracks/overview_track";
import { DataTrackWrapper } from "./track_view";

const trackHeight = STYLE.tracks.trackHeight;

export const TRACK_HANDLE_CLASS = "track-handle";

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
}
