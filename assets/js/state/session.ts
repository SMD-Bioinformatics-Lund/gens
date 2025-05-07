import { SideMenu } from "../components/side_menu";

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
  // chromosome: string;
  // start: number;
  // end: number;
  private markerModeOn: boolean = false;
  private highlights: Record<string, Rng>;

  getMarkerMode(): boolean {
    return this.markerModeOn;
  }

  toggleMarkerMode() {
    this.markerModeOn = !this.markerModeOn;
    this.render({});
  }

  private render: (settings: RenderSettings) => void;
  private sideMenu: SideMenu;

  constructor(render: (settings: RenderSettings) => void, sideMenu: SideMenu) {
    this.render = render;
    this.sideMenu = sideMenu;
    this.highlights = {};

    console.log("Constructed with highlights", this.highlights);
  }

  openContextMenu(header: string, content: HTMLDivElement[]) {
    this.sideMenu.showContent(header, content);
  }

  getHighlights(): {id: string, range: Rng}[] {
    return Object.entries(this.highlights).map(([id, range]) => {
      return {
        id,
        range,
      };
    });
  }
  removeHighlights() {
    this.highlights = {};
    this.render({});
  }
  addHighlight(id: string, range: Rng) {
    this.highlights[id] = range;
    this.render({});
  }
  removeHighlight(id: string) {
    delete this.highlights[id];
    this.render({});
  }
}
