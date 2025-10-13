import {
  SettingsMenu,
  TrackHeights,
} from "../components/side_menu/settings_menu";
import { SideMenu } from "../components/side_menu/side_menu";
import { DataTrackSettings } from "../components/tracks/base_tracks/data_track";
import { COV_Y_RANGE } from "../components/tracks_manager/tracks_manager";
import { COLORS } from "../constants";
import {
  loadAnnotationSelections,
  loadColorAnnotation,
  loadCoverageRange,
  loadExpandedTracks,
  loadTrackHeights,
  saveAnnotationSelections,
  saveColorAnnotation,
  saveCoverageRange,
  saveExpandedTracks,
  saveTrackHeights,
  loadGeneListSelections,
  saveGeneListSelections,
  loadTrackLayout,
  saveTrackLayout,
  TrackLayout,
} from "../util/storage";
import { generateID } from "../util/utils";

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
  private chromosome: Chromosome;
  private start: number;
  private end: number;
  private render: (settings: RenderSettings) => void;
  private sideMenu: SideMenu;
  private markerModeOn: boolean = false;
  private highlights: Record<string, RangeHighlight>;
  private chromSizes: Record<Chromosome, number>;
  private chromInfo: Record<Chromosome, ChromosomeInfo>;
  private mainSample: Sample;
  private samples: Sample[];
  private trackHeights: TrackHeights;
  private chromViewActive: boolean;
  private scoutBaseURL: string;
  private gensBaseURL: string;
  private settings: SettingsMenu;
  private genomeBuild: number;

  private idToAnnotSource: Record<string, ApiAnnotationTrack>;
  private idToGeneList: Record<string, ApiGeneList>;

  private colorAnnotationId: string | null = null;
  private annotationSelections: string[] = [];
  private geneListSelections: string[] = [];
  private coverageRange: [number, number] = COV_Y_RANGE;
  private variantThreshold: number;
  private expandedTracks: Record<string, boolean> = {};
  private layoutProfileKey: string;

  // private dataTracks: DataTrackSettings[] = [];

  // public addTrack(settings: DataTrackSettings) {
  //   this.dataTracks.push(settings);

  //   const trackLayout = {
  //     order: [],
  //     hidden: {},
  //     expanded: {},
  //   }

  //   this.saveTrackLayout(this.dataTracks);
  // }

  // public getTrack(key: string): DataTrackSettings {
  //   return this.dataTracks.filter((track) => track.trackId == key)[0];
  // }

  constructor(
    render: (settings: RenderSettings) => void,
    sideMenu: SideMenu,
    mainSample: Sample,
    samples: Sample[],
    trackHeights: TrackHeights,
    scoutBaseURL: string,
    gensBaseURL: string,
    settings: SettingsMenu,
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
    this.chromosome = startRegion ? startRegion.chrom : "1";
    this.start = startRegion?.start ? startRegion.start : 1;
    this.end = startRegion?.end ? startRegion.end : chromSizes["1"];
    this.samples = samples;
    this.trackHeights = loadTrackHeights() || trackHeights;
    this.scoutBaseURL = scoutBaseURL;
    this.gensBaseURL = gensBaseURL;
    this.settings = settings;
    this.genomeBuild = genomeBuild;
    this.chromInfo = chromInfo;
    this.chromSizes = chromSizes;
    this.annotationSelections = loadAnnotationSelections() || [];
    this.geneListSelections = loadGeneListSelections() || [];
    this.colorAnnotationId = loadColorAnnotation();
    this.coverageRange = loadCoverageRange() || COV_Y_RANGE;
    this.variantThreshold = variantThreshold;
    this.expandedTracks = loadExpandedTracks() || {};
    this.layoutProfileKey = this.computeProfileKey();

    this.idToAnnotSource = {};
    for (const annotSource of allAnnotationSources) {
      this.idToAnnotSource[annotSource.track_id] = annotSource;
    }

    this.idToGeneList = {};
    for (const geneList of allGeneLists) {
      this.idToGeneList[geneList.id] = geneList;
    }
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

  public getTrackExpanded(id: string, defaultValue: boolean): boolean {
    const expanded = this.expandedTracks[id];
    const returnVal = expanded != null ? expanded : defaultValue;
    return returnVal;
  }

  public setTrackExpanded(id: string, value: boolean): void {
    this.expandedTracks[id] = value;
    saveExpandedTracks(this.expandedTracks);
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
    const pos = this.samples.indexOf(sample);
    this.samples.splice(pos, 1);
    this.layoutProfileKey = this.computeProfileKey();
  }

  public setViewRange(range: Rng): void {
    this.start = range[0];
    this.end = range[1];
  }

  public getRegion(): Region {
    return {
      chrom: this.chromosome,
      start: this.start,
      end: this.end,
    };
  }

  public setChromosome(chrom: Chromosome, range: Rng = null) {
    this.chromosome = chrom;

    const start = range != null ? range[0] : 1;
    const end = range != null ? range[1] : this.chromSizes[chrom];

    this.start = start;
    this.end = end;
  }

  public updatePosition(range: Rng): void {
    this.start = range[0];
    this.end = range[1];
  }

  public getChromosome(): Chromosome {
    return this.chromosome;
  }

  public getXRange(): Rng {
    return [this.start, this.end] as Rng;
  }

  public getChrSegments(): [string, string] {
    const startPos = this.start;
    const endPos = this.end;

    const currChromInfo = this.chromInfo[this.chromosome];

    const startBand = currChromInfo.bands.find(
      (band) => band.start <= startPos && band.end >= startPos,
    );

    const endBand = currChromInfo.bands.find(
      (band) => band.start <= endPos && band.end >= endPos,
    );

    return [startBand.id, endBand.id];
  }

  // FIXME: Should be in data sources instead perhaps?
  public getChromSize(chrom: string): number {
    return this.chromSizes[chrom];
  }

  public getChromSizes(): Record<string, number> {
    return this.chromSizes;
  }

  public getCurrentChromSize(): number {
    return this.chromSizes[this.chromosome];
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

  /**
   * Distance can be negative
   */
  public moveXRange(distance: number): void {
    const startRange = this.getXRange();
    const chromSize = this.getCurrentChromSize();
    const newRange: Rng = [
      Math.max(0, Math.floor(startRange[0] + distance)),
      Math.min(Math.floor(startRange[1] + distance), chromSize),
    ];
    this.setViewRange(newRange);
  }

  public toggleMarkerMode() {
    this.markerModeOn = !this.markerModeOn;
    this.render({});
  }

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
    return this.getHighlights(this.chromosome);
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
      chromosome: this.chromosome,
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

  public loadTrackLayout(): TrackLayout | null {
    return loadTrackLayout(this.layoutProfileKey);
  }

  public saveTrackLayout(layout: TrackLayout): void {
    saveTrackLayout(this.layoutProfileKey, layout);
  }
}
