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
  // FIXME: Could / should the region be in there? Yes.
  chromosome: string;
  start: number;
  end: number;

  private render: (settings: RenderSettings) => void;
  private sideMenu: SideMenu;
  private markerModeOn: boolean = false;
  private highlights: Record<string, RangeHighlight>;

  constructor(
    render: (settings: RenderSettings) => void,
    sideMenu: SideMenu,
    region: Region,
  ) {
    this.render = render;
    this.sideMenu = sideMenu;
    this.highlights = {};
    this.chromosome = region.chrom;
    this.start = region.start;
    this.end = region.end;
  }

  setViewRange(range: Rng): void {
    console.log("on zoom in");
  }

  zoomOut(): void {
    console.log("on zoom out");
  }

  onPan(panX: number): void {
    console.log("on pan");
  }

  getChromosome(): string {
    return this.chromosome;
  }

  getXRange(): Rng {
    return [this.start, this.end] as Rng;
  }

  getMarkerModeOn(): boolean {
    return this.markerModeOn;
  }

  toggleMarkerMode() {
    this.markerModeOn = !this.markerModeOn;
    this.render({});
  }

  showContent(header: string, content: HTMLElement[]) {
    this.sideMenu.showContent(header, content);
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
