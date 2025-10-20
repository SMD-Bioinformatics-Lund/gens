export class Tracks {
  private tracks: DataTrackSettings[];
  constructor(tracks: DataTrackSettings[]) {
    this.tracks = tracks;
  }

  public getTracks(): DataTrackSettings[] {
    return this.tracks;
  }

  public addTrack(track: DataTrackSettings) {
    this.tracks.push(track);
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
