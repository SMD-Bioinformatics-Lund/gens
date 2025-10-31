import { TrackHeights } from "../components/side_menu/settings_menu";
import { SideMenu } from "../components/side_menu/side_menu";
import { COV_Y_RANGE } from "../components/tracks_manager/tracks_manager";
import { annotationDiff } from "../components/tracks_manager/utils/sync_tracks";
import { getPortableId } from "../components/tracks_manager/utils/track_layout";
import {
  COLORS,
  DEFAULT_VARIANT_THRES,
  TRACK_LAYOUT_VERSION,
} from "../constants";
import { loadProfileSettings, saveProfileToBrowser } from "../util/storage";
import { generateID } from "../util/utils";
import { SessionPosition } from "./session_helpers/session_position";
import { Tracks } from "./session_helpers/session_tracks";

/**
 * The purpose of this class is to keep track of the web session,
 * i.e. state of Gens unrelated to the data.
 * Examples might be what region is watched, highlights, whether
 * in marker mode.
 *
 * What annotations are currently selected.
 *
 * It might also be whether tracks are hidden / collapsed / toggled actually.
 * Currently that is maintained by the tracks themselves though. But
 * it should probably be kept here as well.
 */

export class GensSession {
  private render: (settings: RenderSettings) => void;
  private sideMenu: SideMenu;
  private markerModeOn: boolean = false;
  private highlights: Record<string, RangeHighlight>;
  private mainSample: Sample;
  private samples: Sample[];
  private chromViewActive: boolean;

  // Constants
  private scoutBaseURL: string;
  private gensBaseURL: string;
  // private settings: SettingsMenu;
  private genomeBuild: number;
  private idToAnnotSource: Record<string, ApiAnnotationTrack>;

  // Loaded parameters
  private layoutProfileKey: string;
  private trackHeights: TrackHeights;
  private colorAnnotationId: string | null = null;
  private annotationSelections: string[] = [];
  private coverageRange: Rng = COV_Y_RANGE;
  private variantThreshold: number = DEFAULT_VARIANT_THRES;
  private trackLayout: TrackLayout | null = null;

  public tracks: Tracks;
  public chromTracks: Tracks;
  public pos: SessionPosition;

  constructor(
    render: (settings: RenderSettings) => void,
    sideMenu: SideMenu,
    mainSample: Sample,
    samples: Sample[],
    trackHeights: TrackHeights,
    scoutBaseURL: string,
    gensBaseURL: string,
    genomeBuild: number,
    chromInfo: Record<Chromosome, ChromosomeInfo>,
    chromSizes: Record<Chromosome, number>,
    startRegion: { chrom: Chromosome; start?: number; end?: number } | null,
    allAnnotationSources: ApiAnnotationTrack[],
  ) {
    this.render = render;
    this.sideMenu = sideMenu;
    this.mainSample = mainSample;
    this.highlights = {};

    this.samples = samples;
    this.trackHeights = trackHeights;

    this.idToAnnotSource = {};
    for (const annotSource of allAnnotationSources) {
      this.idToAnnotSource[annotSource.track_id] = annotSource;
    }

    this.scoutBaseURL = scoutBaseURL;
    this.gensBaseURL = gensBaseURL;
    this.genomeBuild = genomeBuild;

    this.layoutProfileKey = computeProfileKey(this.samples, genomeBuild);
    const profile = loadProfileSettings(this.layoutProfileKey);
    this.loadProfile(profile);

    this.tracks = new Tracks([]);
    this.chromTracks = new Tracks([]);

    const chromosome = startRegion ? startRegion.chrom : "1";
    const start = startRegion?.start ? startRegion.start : 1;
    const end = startRegion?.end ? startRegion.end : chromSizes["1"];
    this.pos = new SessionPosition(
      chromosome,
      start,
      end,
      chromSizes,
      chromInfo,
    );
  }

  public loadProfile(profile: ProfileSettings): void {
    console.log("Loading profile", profile);

    if (profile.version != TRACK_LAYOUT_VERSION) {
      console.warn(
        `Version mismatch. Found ${profile.version}, Gens is currently on ${TRACK_LAYOUT_VERSION}. Dropping the saved layout`,
      );
      profile = undefined;
    }

    if (profile) {
      this.variantThreshold = profile.variantThreshold;
      this.trackLayout = profile.layout;
      this.trackHeights = profile.trackHeights;
      this.colorAnnotationId = profile.colorAnnotationId;

      // A pre-selected track might disappear if the db is updated
      this.annotationSelections = [];
      for (const loadedSelectionId of profile.annotationSelections) {
        if (!this.idToAnnotSource[loadedSelectionId]) {
          console.warn(`Selection ID ${loadedSelectionId} not found, skipping`);
          continue;
        }
        this.annotationSelections.push(loadedSelectionId);
      }
    }
  }

  public getMainSample(): Sample {
    return this.mainSample;
  }

  public setMainSample(sample: Sample) {
    this.mainSample = sample;
  }

  public getGenomeBuild(): number {
    return this.genomeBuild;
  }

  public getGensBaseURL(): string {
    return this.gensBaseURL;
  }

  public getAnnotationSources(settings: {
    selectedOnly: boolean;
  }): { id: string; label: string }[] {
    if (settings.selectedOnly) {
      return this.annotationSelections.map((id) => {
        const track = this.idToAnnotSource[id];
        return {
          id,
          label: track.name,
        };
      });
    } else {
      Object.values(this.idToAnnotSource).map((obj) => {
        return {
          id: obj.track_id,
          label: obj.name,
        };
      });
    }

    // FIXME: Should this be owned by the session?
    // return this.settings.getAnnotSources(settings);
  }

  // public getTrackLayout(): TrackLayout {
  //   return this.trackLayout;
  // }

  public getVariantURL(variantId: string): string {
    return `${this.scoutBaseURL}/document_id/${variantId}`;
  }

  public getChromViewActive(): boolean {
    return this.chromViewActive;
  }

  public toggleChromViewActive() {
    this.chromViewActive = !this.chromViewActive;
  }

  public getProfile(): ProfileSettings {
    return {
      version: TRACK_LAYOUT_VERSION,
      layout: this.trackLayout,
      colorAnnotationId: this.colorAnnotationId,
      annotationSelections: this.annotationSelections,
      coverageRange: this.coverageRange,
      trackHeights: this.trackHeights,
      variantThreshold: this.variantThreshold,
    };
  }

  private saveProfile(): void {
    const profile = this.getProfile();
    saveProfileToBrowser(this.layoutProfileKey, profile);
  }

  public setColorAnnotation(id: string | null) {
    this.colorAnnotationId = id;
    this.saveProfile();
  }

  public getColorAnnotation(): string | null {
    return this.colorAnnotationId;
  }

  public getAnnotationSelections(): string[] {
    return this.annotationSelections;
  }

  public setAnnotationSelections(ids: string[], saveProfile: boolean): void {
    this.annotationSelections = ids;
    if (saveProfile) {
      this.saveProfile();
    }
  }

  public getTrackHeights(): TrackHeights {
    return this.trackHeights;
  }

  public setTrackHeights(heights: TrackHeights) {
    this.trackHeights = heights;
    this.saveProfile();
  }

  public getCoverageRange(): [number, number] {
    return this.coverageRange;
  }

  public setCoverageRange(range: [number, number]) {
    this.coverageRange = range;
    this.saveProfile();
  }

  public getSamples(): Sample[] {
    return this.samples;
  }

  public getSample(caseId: string, sampleId: string): Sample | null {
    const matchedSamples = this.samples.filter(
      (sample) => sample.caseId == caseId && sample.sampleId == sampleId,
    );
    if (matchedSamples.length == 1) {
      return matchedSamples[0];
    } else if (matchedSamples.length == 0) {
      return null;
    } else {
      throw new Error(`Found multiple samples: ${matchedSamples}`);
    }
  }

  public addSample(sample: Sample) {
    this.samples.push(sample);
  }

  public removeSample(sample: Sample): void {
    const pos = this.samples.findIndex(
      (currSample) =>
        currSample.caseId === sample.caseId &&
        currSample.sampleId === sample.sampleId,
    );

    if (pos === -1) {
      console.warn("Sample not found:", sample);
      return;
    }

    this.samples.splice(pos, 1);
    this.layoutProfileKey = computeProfileKey(this.samples, this.genomeBuild);
  }

  public getMarkerModeOn(): boolean {
    return this.markerModeOn;
  }

  public setVariantThreshold(threshold: number) {
    this.variantThreshold = threshold;
  }

  public getVariantThreshold(): number {
    return this.variantThreshold;
  }

  public toggleMarkerMode() {
    this.markerModeOn = !this.markerModeOn;
    this.render({});
  }

  // FIXME: It is convenient for the session to know about the side menu
  // But not clean. I think this should be worked away, passing a reference to the side menu instead
  // to other parts of the code
  public showContent(header: string, content: HTMLElement[], width: number) {
    this.sideMenu.showContent(header, content, width);
  }

  public getAllHighlights(): RangeHighlight[] {
    return Object.values(this.highlights);
  }

  public getHighlights(chrom: string): RangeHighlight[] {
    return Object.values(this.highlights).filter((h) => h.chromosome === chrom);
  }

  /**
   * Return highlights for the currently viewed chromosome
   */
  public getCurrentHighlights(): RangeHighlight[] {
    return this.getHighlights(this.pos.getChromosome());
  }

  public removeHighlights() {
    this.highlights = {};
    this.render({});
  }

  public addHighlight(range: Rng): string {
    const id = generateID();

    const intRange: Rng = [Math.round(range[0]), Math.round(range[1])];

    const highlight = {
      id,
      chromosome: this.pos.getChromosome(),
      range: intRange,
      color: COLORS.transparentBlue,
    };

    this.highlights[highlight.id] = highlight;
    this.render({});
    return id;
  }

  public removeHighlight(id: string) {
    delete this.highlights[id];
    this.render({});
  }

  public getLayoutProfileKey(): string {
    return this.layoutProfileKey;
  }

  public loadTrackLayout(): void {
    const layout = this.trackLayout;

    if (!layout) {
      // If no layout saved, save the initial one
      this.saveTrackLayout();
      return;
    }

    // Make sure annotation selections are reflected in track settings
    // prior to attempting reordering
    const annotSelections = this.annotationSelections.map((id) => {
      return {
        id,
        label: this.idToAnnotSource[id].name,
      };
    });
    const diff = annotationDiff(this.tracks.getTracks(), annotSelections);
    for (const track of diff.newAnnotationSettings) {
      this.tracks.addTrack(track);
    }
    for (const removedId of diff.removedIds) {
      this.tracks.removeTrack(removedId);
    }

    const arrangedTracks = getArrangedTracks(layout, this.tracks.getTracks());

    this.tracks.setTracks(arrangedTracks);
  }

  public saveTrackLayout(): void {
    const order: Set<string> = new Set();
    const hidden: Record<string, boolean> = {};
    const expanded: Record<string, boolean> = {};
    for (const info of this.tracks.getTracks()) {
      const pid = getPortableId(info);
      order.add(pid);
      hidden[pid] = info.isHidden;
      expanded[pid] = info.isExpanded;
    }

    const layout = {
      version: TRACK_LAYOUT_VERSION,
      order: Array.from(order),
      hidden,
      expanded,
    };

    this.trackLayout = layout;

    this.saveProfile();
  }
}

function computeProfileKey(samples: Sample[], genomeBuild: number): string {
  const types = new Set(
    samples.map((s) => (s.sampleType ? s.sampleType : "unknown")).sort(),
  );

  const signature = Array.from(types).join("+");
  return `v${TRACK_LAYOUT_VERSION}.${genomeBuild}.${signature}`;
}

function getArrangedTracks(
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
