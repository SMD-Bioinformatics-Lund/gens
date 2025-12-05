import { getPortableId } from "../../components/tracks_manager/utils/track_layout";

export class Tracks {
  private tracks: DataTrackSettings[];
  constructor(tracks: DataTrackSettings[]) {
    console.log("Initial tracks", tracks);
    this.tracks = tracks;
  }

  public getTracks(): DataTrackSettings[] {
    return this.tracks;
  }

  public addTrack(track: DataTrackSettings) {
    this.tracks.push(track);
  }

  public removeTrack(trackId: string) {
    const trackIndex = this.tracks.findIndex(
      (track) => track.trackId == trackId,
    );
    this.tracks.splice(trackIndex, 1);
  }

  public get(trackId: string): DataTrackSettings {
    const matches = this.tracks.filter((setting) => setting.trackId == trackId);

    if (matches.length == 0) {
      throw Error(`No matches found for ID: ${trackId}`);
    } else if (matches.length > 1) {
      throw Error(
        `More than one (${matches.length}) match found for ID: ${trackId}`,
      );
    }

    return matches[0];
  }

  public updateSetting(trackId: string, newSetting: DataTrackSettings) {
    const trackIndex = this.tracks.findIndex(
      (track) => track.trackId === trackId,
    );
    this.tracks[trackIndex] = newSetting;
  }

  public setIsExpanded(trackId: string, isExpanded: boolean) {
    const setting = this.get(trackId);
    setting.isExpanded = isExpanded;
  }

  public setExpandedHeight(trackId: string, trackHeight: number) {
    const setting = this.get(trackId);
    setting.height.expandedHeight = trackHeight;
  }

  public setTracks(tracks: DataTrackSettings[]) {
    console.error("Setting all tracks", tracks);
    this.tracks = tracks;
  }

  public moveTrackToPos(trackId: string, newPos: number): void {
    const origPos = this.tracks.findIndex((track) => track.trackId === trackId);
    const [moved] = this.tracks.splice(origPos, 1);
    this.tracks.splice(newPos, 0, moved);
  }

  public shiftTrack(trackId: string, direction: "up" | "down"): void {
    const startIndex = this.tracks.findIndex(
      (track) => track.trackId == trackId,
    );

    if (startIndex == -1) {
      console.warn(`trackID ${trackId} not found`);
      return;
    }

    const endIndex = direction == "up" ? startIndex - 1 : startIndex + 1;

    // Don't move at the edge
    if (endIndex < 0 || endIndex >= this.tracks.length) {
      return;
    }

    [this.tracks[startIndex], this.tracks[endIndex]] = [
      this.tracks[endIndex],
      this.tracks[startIndex],
    ];
  }

  public toggleTrackHidden(trackId: string): void {
    const setting = this.get(trackId);
    setting.isHidden = !setting.isHidden;
  }

  public toggleTrackExpanded(trackId: string): void {
    const setting = this.get(trackId);
    setting.isExpanded = !setting.isExpanded;
  }
}

export function getArrangedTracks(
  layout: TrackLayout,
  origTrackSettings: DataTrackSettings[],
): DataTrackSettings[] {
  // First create a map layout ID -> track settings
  const layoutIdToSettings: Record<string, DataTrackSettings[]> = {};
  for (const trackSetting of origTrackSettings) {
    const layoutId = getPortableId(trackSetting);

    if (!layoutIdToSettings[layoutId]) {
      layoutIdToSettings[layoutId] = [];
    }

    layoutIdToSettings[layoutId].push(trackSetting);
  }

  const orderedTracks = [];

  const orderedLayoutIds = new Set(layout.order);
  if (layout.order.length != orderedLayoutIds.size) {
    console.warn(
      "Non-unique elements stored in layout. Proceeding with unique elements. Original:",
      layout.order,
      "Reduced:",
      orderedLayoutIds,
    );
  }

  const seenLayoutIds = new Set<string>();

  // Iterate through the IDs and grab all corresponding tracks
  for (const layoutId of orderedLayoutIds) {
    const tracks = layoutIdToSettings[layoutId] || [];

    const tracksHidden = layout.hidden[layoutId];
    const tracksExpanded = layout.expanded[layoutId];

    const updatedTracks = tracks.map((track) => {
      track.isHidden = tracksHidden;
      track.isExpanded = tracksExpanded;
      return track;
    });

    orderedTracks.push(...updatedTracks);
    if (tracks.length > 0) {
      seenLayoutIds.add(layoutId);
    }
  }

  // Don't drop leftover tracks
  for (const [layoutId, tracks] of Object.entries(layoutIdToSettings)) {
    if (seenLayoutIds.has(layoutId)) {
      continue;
    }

    orderedTracks.push(...tracks);
  }

  return orderedTracks;
}

