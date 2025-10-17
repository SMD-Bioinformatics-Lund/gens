import { TrackHeights } from "../components/side_menu/settings_menu";
import { SideMenu } from "../components/side_menu/side_menu";
import { DataTrackSettings } from "../components/tracks/base_tracks/data_track";
import { COV_Y_RANGE } from "../components/tracks_manager/tracks_manager";
import { getPortableId } from "../components/tracks_manager/utils/track_layout";
import { COLORS } from "../constants";
import { zoomIn, zoomOut } from "../util/navigation";
import {
  loadAnnotationSelections,
  loadColorAnnotation,
  loadCoverageRange,
  loadTrackHeights,
  saveAnnotationSelections,
  saveColorAnnotation,
  saveCoverageRange,
  saveTrackHeights,
  loadGeneListSelections,
  saveGeneListSelections,
  loadTrackLayout,
  saveTrackLayout,
} from "../util/storage";
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
  private trackHeights: TrackHeights;
  private chromViewActive: boolean;
  private scoutBaseURL: string;
  private gensBaseURL: string;
  // private settings: SettingsMenu;
  private genomeBuild: number;

  private idToAnnotSource: Record<string, ApiAnnotationTrack>;
  private idToGeneList: Record<string, ApiGeneList>;

  private colorAnnotationId: string | null = null;
  private annotationSelections: string[] = [];
  private geneListSelections: string[] = [];
  private coverageRange: Rng = COV_Y_RANGE;
  private variantThreshold: number;
  // private expandedTracks: Record<string, boolean> = {};
  private layoutProfileKey: string;

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
    variantThreshold: number,
    allAnnotationSources: ApiAnnotationTrack[],
    allGeneLists: ApiGeneList[],
  ) {
    this.render = render;
    this.sideMenu = sideMenu;
    this.mainSample = mainSample;
    this.highlights = {};

    this.samples = samples;
    this.trackHeights = loadTrackHeights() || trackHeights;
    this.scoutBaseURL = scoutBaseURL;
    this.gensBaseURL = gensBaseURL;
    this.genomeBuild = genomeBuild;
    this.annotationSelections = loadAnnotationSelections() || [];
    this.geneListSelections = loadGeneListSelections() || [];
    this.colorAnnotationId = loadColorAnnotation();
    this.coverageRange = loadCoverageRange() || COV_Y_RANGE;
    this.variantThreshold = variantThreshold;
    // this.expandedTracks = loadExpandedTracks() || {};
    this.layoutProfileKey = this.computeProfileKey();

    this.idToAnnotSource = {};
    for (const annotSource of allAnnotationSources) {
      this.idToAnnotSource[annotSource.track_id] = annotSource;
    }

    this.idToGeneList = {};
    for (const geneList of allGeneLists) {
      this.idToGeneList[geneList.id] = geneList;
    }

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

  public getMainSample(): Sample {
    return this.mainSample;
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

  public getVariantURL(variantId: string): string {
    return `${this.scoutBaseURL}/document_id/${variantId}`;
  }

  public getChromViewActive(): boolean {
    return this.chromViewActive;
  }

  public toggleChromViewActive() {
    this.chromViewActive = !this.chromViewActive;
  }

  public setColorAnnotation(id: string | null) {
    this.colorAnnotationId = id;
    saveColorAnnotation(id);
  }

  public getColorAnnotation(): string | null {
    return this.colorAnnotationId;
  }

  public getAnnotationSelections(): string[] {
    return this.annotationSelections;
  }

  public setAnnotationSelections(ids: string[]): void {
    this.annotationSelections = ids;
    saveAnnotationSelections(ids);
  }

  public getGeneListSelections(): string[] {
    return this.geneListSelections;
  }

  public getGeneListSources(settings: {
    selectedOnly: boolean;
  }): { id: string; label: string }[] {
    if (settings.selectedOnly) {
      return this.geneListSelections.map((id) => {
        const geneList = this.idToGeneList[id];
        return {
          id,
          label: geneList.name,
        };
      });
    } else {
      Object.values(this.idToGeneList).map((obj) => {
        return {
          id: obj.id,
          label: obj.name,
        };
      });
    }

    // return this.settings.getGeneListSources(settings);
  }

  public setGeneListSelections(ids: string[]): void {
    this.geneListSelections = ids;
    saveGeneListSelections(ids);
  }

  public getTrackHeights(): TrackHeights {
    return this.trackHeights;
  }

  public setTrackHeights(heights: TrackHeights) {
    this.trackHeights = heights;
    saveTrackHeights(heights);
  }

  public getCoverageRange(): [number, number] {
    return this.coverageRange;
  }

  public setCoverageRange(range: [number, number]) {
    this.coverageRange = range;
    saveCoverageRange(range);
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
    this.layoutProfileKey = this.computeProfileKey();
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

  // FIXME: Why is this one here?
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

  private computeProfileKey(): string {
    const types = this.samples
      .map((s) => (s.sampleType ? s.sampleType : "unknown"))
      .sort();
    const signature = types.join("+");
    return `v1.${this.genomeBuild}.${signature}`;
  }

  public getLayoutProfileKey(): string {
    return this.layoutProfileKey;
  }

  public loadTrackLayout(): void {
    const layout = loadTrackLayout(this.layoutProfileKey);

    if (!layout) {
      return;
    }

    const tracks = this.tracks.getTracks();

    const byPortableId: Record<string, DataTrackSettings> = {};
    for (const info of tracks) {
      const pid = getPortableId(info);
      if (pid) {
        byPortableId[pid] = info;
      }
    }

    const picked = new Set<string>();
    const reorderedTracks: DataTrackSettings[] = [];
    for (const pid of layout.order) {
      const info = byPortableId[pid];
      if (info) {
        reorderedTracks.push(info);
        picked.add(info.trackId);
      }
    }

    // Reorder according to the used layout
    for (const info of tracks) {
      if (!picked.has(info.trackId)) {
        reorderedTracks.push(info);
      }
    }

    // Assign the tracks as hidden or expanded
    for (const info of reorderedTracks) {
      const pid = getPortableId(info);
      if (!pid) {
        continue;
      }

      info.isHidden = layout.hidden[pid];
      info.isExpanded = layout.expanded[pid];
    }

    this.tracks.setTracks(reorderedTracks);
  }

  public saveTrackLayout(): void {
    const order: string[] = [];
    const hidden: Record<string, boolean> = {};
    const expanded: Record<string, boolean> = {};
    for (const info of this.tracks.getTracks()) {
      const pid = getPortableId(info);
      order.push(pid);
      hidden[pid] = info.isHidden;
      expanded[pid] = info.isExpanded;
    }

    const layout = {
      order,
      hidden,
      expanded,
    };

    saveTrackLayout(this.layoutProfileKey, layout);
  }
}
