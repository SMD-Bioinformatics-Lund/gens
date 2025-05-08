import { COLORS, ICONS, SIZES } from "../../constants";
import { populateSelect } from "../../util/utils";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { DotTrack } from "../tracks/dot_track";
import { getContainer, getIconButton } from "../util/menu_utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    /* Insist to hide even if display: flex if "hidden" is set */
    :host [hidden] {
      display: none !important;
    }
    .row {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: nowrap;
      white-space: nowrap;
      padding-top: ${SIZES.s}px;
      gap: 2px;
    }
    #buttons {
      flex-wrap: nowrap;
      gap: ${SIZES.s}px;
    }
    #y-axis {

    }
    #y-axis input {
      flex: 1 1 0px;
      min-width: 0;
    }
    #colors {
      justify-content: space-between;
    }
    #color-select {
      background-color: ${COLORS.white};
    }
    .button {
      cursor: pointer;
      /* FIXME: Style constants */
      border: 1px solid #ccc;
      padding: 4px 8px;
      borderRadius: 4px;
    }
  </style>
  <div id="actions" class="row">
    <div id="move-up" label="Move up" class="button fas ${ICONS.up}"></div>
    <div id="move-down" label="Move down" class="button fas ${ICONS.down}"></div>
    <div id="toggle-hide" label="Show / hide" class="button fas ${ICONS.show}"></div>
    <div id="toggle-collapse" label="Collapse / expand" class="button fas ${ICONS.expand}"></div>
  </div>
  <div id="y-axis" class="row">
    <div>Y-axis: </div>
    <input id="y-axis-start" type="number" step="0.1">
    <input id="y-axis-end" type="number" step="0.1">
  </div>
  <div id="colors" class="row">
    <div>Color by:</div>
    <select id="color-select">
  </div>
`;

interface TrackPageSettings {
  showYAxis: boolean;
  showColor: boolean;
}

export class TrackPage extends ShadowBaseElement {
  isInitialized: boolean = false;

  private trackId: string;
  private settings: TrackPageSettings;
  private getAnnotationSources: GetAnnotSources;

  private getIsHidden: () => boolean;
  private getIsCollapsed: () => boolean;

  private yAxis: HTMLDivElement;
  private colors: HTMLDivElement;
  private yAxisStart: HTMLSelectElement;
  private yAxisEnd: HTMLSelectElement;
  private colorSelect: HTMLSelectElement;

  private moveUp: HTMLDivElement;
  private moveDown: HTMLDivElement;
  private toggleHide: HTMLDivElement;
  private toggleCollapse: HTMLDivElement;

  constructor() {
    super(template);
  }

  // Before being connected to the DOM
  configure(trackId: string, settings: TrackPageSettings) {
    this.trackId = trackId;
    this.settings = settings;
  }

  connectedCallback(): void {
    this.yAxis = this.root.querySelector("#y-axis");
    this.colors = this.root.querySelector("#colors");

    this.yAxisStart = this.root.querySelector("#y-axis-start");
    this.yAxisEnd = this.root.querySelector("#y-axis-end");
    this.colorSelect = this.root.querySelector("#color-select");

    this.moveUp = this.root.querySelector("#move-up");
    this.moveDown = this.root.querySelector("#move-down");
    this.toggleHide = this.root.querySelector("#toggle-hide");
    this.toggleCollapse = this.root.querySelector("#toggle-collapse");

    this.yAxis.hidden = !this.settings.showYAxis;
    this.colors.hidden = !this.settings.showColor;
  }

  // After being connected to the DOM
  initialize(
    getAnnotationSources: GetAnnotSources,
    moveTrack: (direction: "up" | "down") => void,
    toggleHidden: () => void,
    toggleCollapsed: () => void,
    getIsHidden: () => boolean,
    getIsCollapsed: () => boolean,
    getYAxis: () => Rng,
    setYAxis: (newAxis: Rng) => void,
    onColorSelected: (annotId: string) => void
  ) {
    this.isInitialized = true;
    this.getIsHidden = getIsHidden;
    this.getIsCollapsed = getIsCollapsed;
    // this.onChange();

    if (this.settings.showColor) {
      const annotSources = getAnnotationSources({ selectedOnly: false });
      populateSelect(this.colorSelect, annotSources, true);
    }

    const currY = getYAxis();
    this.yAxisStart.value = currY[0].toString();
    this.yAxisEnd.value = currY[1].toString();

    this.moveUp.addEventListener("click", () => {
      moveTrack("up");
    });
    this.moveDown.addEventListener("click", () => {
      moveTrack("down");
    });
    this.toggleHide.addEventListener("click", () => {
      toggleHidden();
    });
    this.toggleCollapse.addEventListener("click", () => {
      toggleCollapsed();
    });

    const getCurrRange = (): Rng => {
      return [
        parseFloat(this.yAxisStart.value),
        parseFloat(this.yAxisEnd.value)
      ]
    }

    this.yAxisStart.addEventListener("change", () => {
      setYAxis(getCurrRange());
    })
    this.yAxisEnd.addEventListener("change", () => {
      setYAxis(getCurrRange());
    })

    this.colorSelect.addEventListener("change", () => {
      const id = this.colorSelect.value || null;
      onColorSelected(id);
    })
  }

  render(_settings: RenderSettings) {

    const hideIcon = this.getIsHidden() ? ICONS.hide : ICONS.show
    this.toggleHide.classList = `button fas ${hideIcon}`

    const collapseIcon = this.getIsCollapsed() ? ICONS.collapse : ICONS.expand
    this.toggleCollapse.classList = `button fas ${collapseIcon}`
  }
}

// // FIXME: Where should this util go?
// // Into its own web component
// function getTrackContextMenuContent(
//   render: (settings: RenderSettings) => void,
//   track: DataTrack,
//   isDotTrack: boolean,
//   getAnnotationSources: GetAnnotSources,
//   getBands: (id: string) => Promise<RenderBand[]>,
//   moveTrack: (id: string, direction: "up" | "down") => void,
// ): HTMLDivElement[] {
//   const buttonsDiv = document.createElement("div");
//   buttonsDiv.style.display = "flex";
//   buttonsDiv.style.flexDirection = "row";
//   buttonsDiv.style.flexWrap = "nowrap";
//   buttonsDiv.style.gap = `${SIZES.s}px`;

//   buttonsDiv.appendChild(
//     getIconButton(ICONS.up, "Up", () => moveTrack(track.id, "up")),
//   );
//   buttonsDiv.appendChild(
//     getIconButton(ICONS.down, "Down", () => moveTrack(track.id, "down")),
//   );
//   buttonsDiv.appendChild(
//     getIconButton(
//       track.getIsHidden() ? ICONS.hide : ICONS.show,
//       "Show / hide",
//       () => {
//         track.toggleHidden();
//         render({});
//       },
//     ),
//   );
//   buttonsDiv.appendChild(
//     getIconButton(
//       track.getIsCollapsed() ? ICONS.expand : ICONS.collapse,
//       "Collapse / expand",
//       () => {
//         track.toggleCollapsed();
//         render({});
//       },
//     ),
//   );

//   const returnElements = [buttonsDiv];

//   if (isDotTrack) {
//     const axisRow = getYAxisRow(render, track);
//     returnElements.push(axisRow);

//     const colorSelectRow = getColorSelectRow(
//       track as DotTrack,
//       getAnnotationSources,
//       getBands,
//     );
//     returnElements.push(colorSelectRow);
//   }
//   return returnElements;
// }

// function getYAxisRow(
//   render: (settings: RenderSettings) => void,
//   track: DataTrack,
// ): HTMLDivElement {
//   const axis = track.getYAxis();

//   const axisRow = getContainer("row");
//   axisRow.style.gap = "8px";
//   const yAxisLabel = document.createTextNode(`Y-axis range:`);
//   axisRow.appendChild(yAxisLabel);

//   const startNode = document.createElement("input");
//   startNode.type = "number";
//   startNode.value = axis.range[0].toString();
//   startNode.step = "0.1";
//   startNode.style.flex = "1 1 0px";
//   startNode.style.minWidth = "0";
//   axisRow.appendChild(startNode);

//   const endNode = document.createElement("input");
//   endNode.type = "number";
//   endNode.value = axis.range[1].toString();
//   endNode.step = "0.1";
//   endNode.style.flex = "1 1 0px";
//   endNode.style.minWidth = "0";

//   const onRangeChange = () => {
//     const parsedRange: Rng = [
//       parseFloat(startNode.value),
//       parseFloat(endNode.value),
//     ];
//     track.updateYAxis(parsedRange);
//     render({});
//   };

//   startNode.addEventListener("change", onRangeChange);
//   endNode.addEventListener("change", onRangeChange);
//   axisRow.appendChild(endNode);
//   return axisRow;
// }

// function getColorSelectRow(
//   track: DotTrack,
//   getAnnotationSources: GetAnnotSources,
//   getBands: (id: string) => Promise<RenderBand[]>,
// ): HTMLDivElement {
//   const colorRow = getContainer("row");

//   const label = document.createTextNode("Color:");

//   const select = document.createElement("select") as HTMLSelectElement;
//   select.style.backgroundColor = COLORS.white;
//   const sources = getAnnotationSources({ selectedOnly: false });

//   populateSelect(select, sources, true);

//   select.addEventListener("change", async (_e) => {
//     const currentId = select.value;
//     if (currentId != "") {
//       const bands = await getBands(currentId);
//       track.updateColors(bands);
//     } else {
//       track.updateColors(null);
//     }
//   });

//   colorRow.appendChild(label);
//   colorRow.appendChild(select);

//   return colorRow;
// }

customElements.define("track-page", TrackPage);
