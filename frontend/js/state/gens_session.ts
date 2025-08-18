import {
  SettingsMenu,
  TrackHeights,
} from "../components/side_menu/settings_menu";
import { SideMenu } from "../components/side_menu/side_menu";
import { COV_Y_RANGE } from "../components/tracks_manager/tracks_manager";
import { COLORS } from "../constants";
import { loadAnnotationSelections, loadColorAnnotation, loadCoverageRange, loadTrackHeights, saveAnnotationSelections, saveColorAnnotation, saveCoverageRange, saveTrackHeights } from "../util/storage";
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
  private colorAnnotationId: string | null = null;
  private annotationSelections: string[] = [];
  private coverageRange: [number, number] = COV_Y_RANGE;

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
    this.colorAnnotationId = loadColorAnnotation();
    this.coverageRange = loadCoverageRange() || COV_Y_RANGE;
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
    // FIXME: Should this be owned by the session?
    return this.settings.getAnnotSources(settings);
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

  public addSample(sample: Sample) {
    this.samples.push(sample);
  }

  public removeSample(sample: Sample): void {
    const pos = this.samples.indexOf(sample);
    this.samples.splice(pos, 1);
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

  public getRankScoreThres(): number {
    return this.settings.getRankScoreThres();
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

    const highlight = {
      id,
      chromosome: this.chromosome,
      range,
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
}
