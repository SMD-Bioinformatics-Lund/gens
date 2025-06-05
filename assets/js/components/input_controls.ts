import { CHROMOSOMES, COLORS, ICONS, SIZES } from "../constants";
import { GensSession } from "../state/gens_session";
import { getPan, zoomIn, zoomOut } from "../util/navigation";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    /* Make the light-dom component expand horizontally */
    input-controls {
      flex: 1;
    }
    #input-controls-container {
      display: flex;
      flex: 1;
      flex-direction: row;
      justify-content: space-between;
    }
    #input-controls-center {
      display: flex;
      align-items: center;
      gap: ${SIZES.m}px;
    }
    #input-controls-right {
      display: flex;
      align-items: center;
      gap: ${SIZES.m}px;
    }
    #logo-part {
      display: flex;
      flex-direction: row;
    }
  </style>
  <div id="input-controls-container">
    <div id="logo-part">
      <a id="gens-home-link" href="">
        <div id="logo-container">
          <span class='logo'></span>
        </div>
      </a>
      <header-info id="header-info" style="padding-left: 4px"></header-info>
    </div>

    <div id="input-controls-center">
      <button title="Pan left" id="pan-left" class='button pan'>
        <span class="fas ${ICONS.left}"></span>
      </button>
      <button title="Zoom in" id="zoom-in" class='button zoom'>
        <span class="fas ${ICONS.zoomin}"></span>
      </button>
      <button title="Zoom out" id="zoom-out" class='button zoom'>
        <span class="fas ${ICONS.zoomout}"></span>
      </button>
      <button title="Pan right" id="pan-right" class='button pan'>
        <span class="fas ${ICONS.right}"></span>
      </button>
      <button title="Reset zoom" id="zoom-reset" class='button zoom'>
        <span class="fas ${ICONS.reset}"></span>
      </button>
      <input onFocus='this.select();' id='region-field' type='text' class="text-input">
      <button title="Run search" id="search" class='button pan'>
        <span class="fas ${ICONS.search}"></span>
      </button>
      <button title="Toggle marker mode" id="toggle-marker" class='button pan'>
        <span class="fas ${ICONS.marker}"></span>
      </button>
      <button title="Remove highlights" id="remove-highlights" class='button pan'>
        <span class="fas ${ICONS.xmark}"></span>
      </button>
    </div>

    <div id="input-controls-right">
      <button title="Toggle chromosome view" id="chromosome-view-button" class='button'>
        <span class="fas ${ICONS.chromosomes}"></span>
      </button>
      <button title="Open settings menu" id="settings-button" class='button'>
        <span class="fas ${ICONS.settings}"></span>
      </button>
    </div>
  </div>
`;

export class InputControls extends HTMLElement {
  private panLeftButton: HTMLButtonElement;
  private panRightButton: HTMLButtonElement;
  private zoomInButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private zoomResetButton: HTMLButtonElement;
  private regionField: HTMLInputElement;
  private removeHighlights: HTMLButtonElement;
  private toggleMarkerButton: HTMLButtonElement;
  private chromosomeViewButton: HTMLButtonElement;
  private settingsButton: HTMLButtonElement;

  private searchButton: HTMLButtonElement;

  private gensHomeLink: HTMLAnchorElement;

  private onPositionChange: (newXRange: [number, number]) => void;
  private getMarkerOn: () => boolean;
  private onToggleMarker: () => void;
  private onOpenSettings: () => void;
  private onToggleChromView: () => void;
  private onSearch: (query: string) => Promise<ApiSearchResult | null>;
  private onChange: (settings: RenderSettings) => void;

  private session: GensSession;

  initialize(
    session: GensSession,
    onPositionChange: (newXRange: [number, number]) => void,
    onOpenSettings: () => void,
    onToggleChromView: () => void,
    onSearch: (query: string) => Promise<ApiSearchResult | null>,
    onChange: (settings: RenderSettings) => void,
  ) {
    this.session = session;
    this.onOpenSettings = onOpenSettings;
    this.onToggleChromView = onToggleChromView;
    this.getMarkerOn = () => this.session.getMarkerModeOn();
    this.onToggleMarker = () => this.session.toggleMarkerMode();
    this.onPositionChange = onPositionChange;
    this.onSearch = onSearch;
    this.onChange = onChange;

    this.panLeftButton.onclick = () => {
      this.panLeft();
    };

    this.panRightButton.onclick = () => {
      this.panRight();
    };

    this.zoomInButton.onclick = () => {
      this.zoomIn();
    };

    this.zoomOutButton.onclick = () => {
      this.zoomOut();
    };

    this.zoomResetButton.onclick = () => {
      this.resetZoom();
    };

    this.removeHighlights.onclick = () => this.session.removeHighlights();
    this.toggleMarkerButton.onclick = () => this.session.toggleMarkerMode();

    this.gensHomeLink.href = session.getGensBaseURL();
  }

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.panLeftButton = this.querySelector("#pan-left");
    this.panRightButton = this.querySelector("#pan-right");
    this.zoomInButton = this.querySelector("#zoom-in");
    this.zoomOutButton = this.querySelector("#zoom-out");
    this.zoomResetButton = this.querySelector("#zoom-reset");
    this.regionField = this.querySelector("#region-field");
    this.removeHighlights = this.querySelector("#remove-highlights");
    this.toggleMarkerButton = this.querySelector("#toggle-marker");
    this.gensHomeLink = this.querySelector("#gens-home-link");

    this.chromosomeViewButton = this.querySelector("#chromosome-view-button");
    this.settingsButton = this.querySelector("#settings-button");

    this.searchButton = this.querySelector("#search");

    this.chromosomeViewButton.addEventListener("click", () => {
      this.onToggleChromView();
    });

    this.settingsButton.addEventListener("click", () => {
      this.onOpenSettings();
    });

    // FIXME: Also enter when inside the input?
    this.searchButton.addEventListener("click", () => {
      const currentValue = this.regionField.value;
      // console.log("Search", currentValue);
      queryRegionOrGene(
        currentValue,
        (chrom: Chromosome, range?: Rng) => {
          this.session.setChromosome(chrom, range);
          this.onChange({ dataUpdated: true, positionOnly: true });
        },
        this.onSearch,
      );
    });

    this.regionField.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.searchButton.click();
      }
    });
  }

  render(_settings: RenderSettings) {
    this.toggleMarkerButton.style.backgroundColor = this.getMarkerOn()
      ? COLORS.lightGray
      : "";

    const region = this.session.getRegion();
    this.regionField.value = `${region.chrom}:${region.start}-${region.end}`;

    this.chromosomeViewButton.style.backgroundColor =
      this.session.getChromViewActive() ? COLORS.lightGray : "";
  }

  panLeft() {
    const currRange = this.session.getXRange();
    const newXRange = getPan(currRange, "left", 1);
    this.onPositionChange(newXRange);
  }

  panRight() {
    const currXRange = this.session.getXRange();
    const newXRange = getPan(
      currXRange,
      "right",
      this.session.getCurrentChromSize(),
    );
    this.onPositionChange(newXRange);
  }

  zoomIn() {
    const currXRange = this.session.getXRange();
    const newXRange = zoomIn(currXRange);
    this.onPositionChange(newXRange);
  }

  zoomOut() {
    const newXRange = zoomOut(
      this.session.getXRange(),
      this.session.getCurrentChromSize(),
    );
    this.onPositionChange(newXRange);
  }

  resetZoom() {
    const xRange = [1, this.session.getCurrentChromSize()] as Rng;
    this.onPositionChange(xRange);
  }

  toggleMarkerMode() {
    this.onToggleMarker();
  }
}

async function queryRegionOrGene(
  query: string,
  onChangePosition: (chrom: string, range?: Rng) => void,
  getSearchResult: (string) => Promise<ApiSearchResult | null>,
) {
  let chrom: Chromosome;
  let range: Rng | undefined = undefined;
  if (query.includes(":")) {
    const parts = query.split(":");
    chrom = parts[0] as Chromosome;
    range = parts[1].split("-").map((val) => parseInt(val)) as Rng;
  } else if (CHROMOSOMES.includes(query as Chromosome)) {
    chrom = query as Chromosome;
  } else {
    const searchResult = await getSearchResult(query);
    chrom = searchResult.chromosome as Chromosome;
    range = [searchResult.start, searchResult.end];
  }
  onChangePosition(chrom, range);
}

customElements.define("input-controls", InputControls);
