import { TrackHeights } from "../components/side_menu/settings_page";
import { SideMenu } from "../components/side_menu/side_menu";
import { COLORS } from "../constants";
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
  chromosome: string
  start: number;
  end: number;

  private render: (settings: RenderSettings) => void;
  private sideMenu: SideMenu;
  private markerModeOn: boolean = false;
  private highlights: Record<string, RangeHighlight>;
  private chromSizes: Record<string, number>;

  private samples: string[];

  private trackHeights: TrackHeights;

  constructor(
    render: (settings: RenderSettings) => void,
    sideMenu: SideMenu,
    region: Region,
    chromSizes: Record<string, number>,
    samples: string[],
    trackHeights: TrackHeights,
  ) {

    this.render = render;
    this.sideMenu = sideMenu;
    this.highlights = {};
    this.chromosome = region.chrom;
    this.start = region.start;
    this.end = region.end;
    this.chromSizes = chromSizes;
    this.samples = samples;
    this.trackHeights = trackHeights;
  }

  getTrackHeights(): TrackHeights {
    return this.trackHeights;
  }

  setTrackHeights(heights: TrackHeights) {
    this.trackHeights = heights;
  }

  getSamples(): string[] {
    return this.samples;
  }

  addSample(sampleId: string) {
    this.samples.push(sampleId);
  }

  removeSample(sampleId: string): void {
    const pos = this.samples.indexOf(sampleId);
    this.samples.splice(pos, 1);
  }

  setViewRange(range: Rng): void {
    this.start = range[0];
    this.end = range[1];
  }

  getRegion(): Region {
    return {
      chrom: this.chromosome,
      start: this.start,
      end: this.end,
    }
  }

  updateChromosome(chrom: string, range: Rng = null) {
    this.chromosome = chrom;

    const start = range != null ? range[0] : 1;
    const end = range != null ? range[1] : this.chromSizes[chrom];

    this.start = start;
    this.end = end;
  }

  updatePosition(range: Rng): void {
    this.start = range[0];
    this.end = range[1];
  }

  getChromosome(): string {
    return this.chromosome;
  }

  getXRange(): Rng {
    return [this.start, this.end] as Rng;
  }

  getCurrentChromSize(): number {
    return this.chromSizes[this.chromosome];
  }

  getMarkerModeOn(): boolean {
    return this.markerModeOn;
  }

  /**
   * Distance can be negative
   */
  moveXRange(distance: number): void {
    const startRange = this.getXRange();
    const chromSize = this.getCurrentChromSize();
    const newRange: Rng = [
      Math.max(0, Math.floor(startRange[0] + distance)),
      Math.min(Math.floor(startRange[1] + distance), chromSize),
    ];
    this.setViewRange(newRange);
  }

  toggleMarkerMode() {
    this.markerModeOn = !this.markerModeOn;
    this.render({});
  }

  showContent(header: string, content: HTMLElement[]) {
    this.sideMenu.showContent(header, content);
  }

  getAllHighlights(): RangeHighlight[] {
    return Object.values(this.highlights);
  }

  getHighlights(chrom: string): RangeHighlight[] {
    return Object.values(this.highlights).filter((h) => h.chromosome === chrom);
  }

  /**
   * Return highlights for the currently viewed chromosome
   */
  getCurrentHighlights(): RangeHighlight[] {
    return this.getHighlights(this.chromosome);
  }

  removeHighlights() {
    this.highlights = {};
    this.render({});
  }
  addHighlight(range: Rng): string {
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
  removeHighlight(id: string) {
    delete this.highlights[id];
    this.render({});
  }
}
