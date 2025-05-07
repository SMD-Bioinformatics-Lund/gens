import { SideMenu } from "../components/side_menu";

export class GensSession {
  // FIXME: Could / should the region be in there? Yes.
  // chromosome: string;
  // start: number;
  // end: number;
  public markerModeOn: boolean = false;
  private highlights: Record<string, Rng>;

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
    // this.highlights = {};
    // this.render({});
  }
  addHighlight(id: string, range: Rng) {
    // this.highlights[id] = range;
    // this.render({});
  }
  removeHighlight(id: string) {
    // delete this.highlights[id];
    // this.render({});
  }
}
