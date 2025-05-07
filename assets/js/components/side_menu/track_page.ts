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
    /* FIXME: How to refactor here */
    .row {
      display: flex;
      flex-direction: row;
    }
    #button-row {
      flex-wrap: nowrap;
      gap: ${SIZES.s}px;
    }
    #y-axis-row {

    }
    #y-axis-row input {
      flex: 1 1 0px;
      min-width: 0;
    }
    #color-row {

    }
    .button {
      cursor: pointer;
      /* FIXME: Style constants */
      border: 1px solid #ccc;
      padding: 4px 8px;
      borderRadius: 4px;
    }
  </style>
  <div id="button-row" class="row">
    <div label="Move up" class="button fas ${ICONS.up}"></div>
    <div label="Move down" class="button fas ${ICONS.down}"></div>
    <div label="Show / hide" class="button fas ${ICONS.show}"></div>
    <div label="Collapse / expand" class="button fas ${ICONS.maximize}"></div>
  </div>
  <div id="y-axis-row" class="row">
    <input type="number" step="0.1">
    <input type="number" step="0.1">
  </div>
  <div id="color-row" class="row"></div>
`;

export class TrackPage extends ShadowBaseElement {
  isInitialized: boolean = false;
  onChange: () => void;

  constructor() {
    super(template);
  }

  connectedCallback(): void {}

  initialize() {
    this.isInitialized = true;

    this.onChange();
  }

  setSources(onChange: () => void) {
    this.onChange = onChange;
  }
}

// FIXME: Where should this util go?
// Into its own web component
function getTrackContextMenuContent(
  render: (settings: RenderSettings) => void,
  track: DataTrack,
  isDotTrack: boolean,
  getAnnotationSources: GetAnnotSources,
  getBands: (id: string) => Promise<RenderBand[]>,
  moveTrack: (id: string, direction: "up" | "down") => void,
): HTMLDivElement[] {
  const buttonsDiv = document.createElement("div");
  buttonsDiv.style.display = "flex";
  buttonsDiv.style.flexDirection = "row";
  buttonsDiv.style.flexWrap = "nowrap";
  buttonsDiv.style.gap = `${SIZES.s}px`;

  buttonsDiv.appendChild(
    getIconButton(ICONS.up, "Up", () => moveTrack(track.id, "up")),
  );
  buttonsDiv.appendChild(
    getIconButton(ICONS.down, "Down", () => moveTrack(track.id, "down")),
  );
  buttonsDiv.appendChild(
    getIconButton(
      track.getIsHidden() ? ICONS.hide : ICONS.show,
      "Show / hide",
      () => {
        track.toggleHidden();
        render({});
      },
    ),
  );
  buttonsDiv.appendChild(
    getIconButton(
      track.getIsCollapsed() ? ICONS.maximize : ICONS.minimize,
      "Collapse / expand",
      () => {
        track.toggleCollapsed();
        render({});
      },
    ),
  );

  const returnElements = [buttonsDiv];

  if (isDotTrack) {
    const axisRow = getYAxisRow(render, track);
    returnElements.push(axisRow);

    const colorSelectRow = getColorSelectRow(
      track as DotTrack,
      getAnnotationSources,
      getBands,
    );
    returnElements.push(colorSelectRow);
  }
  return returnElements;
}

function getYAxisRow(
  render: (settings: RenderSettings) => void,
  track: DataTrack,
): HTMLDivElement {
  const axis = track.getYAxis();

  const axisRow = getContainer("row");
  axisRow.style.gap = "8px";
  const yAxisLabel = document.createTextNode(`Y-axis range:`);
  axisRow.appendChild(yAxisLabel);

  const startNode = document.createElement("input");
  startNode.type = "number";
  startNode.value = axis.range[0].toString();
  startNode.step = "0.1";
  startNode.style.flex = "1 1 0px";
  startNode.style.minWidth = "0";
  axisRow.appendChild(startNode);

  const endNode = document.createElement("input");
  endNode.type = "number";
  endNode.value = axis.range[1].toString();
  endNode.step = "0.1";
  endNode.style.flex = "1 1 0px";
  endNode.style.minWidth = "0";

  const onRangeChange = () => {
    const parsedRange: Rng = [
      parseFloat(startNode.value),
      parseFloat(endNode.value),
    ];
    track.updateYAxis(parsedRange);
    render({});
  };

  startNode.addEventListener("change", onRangeChange);
  endNode.addEventListener("change", onRangeChange);
  axisRow.appendChild(endNode);
  return axisRow;
}

function getColorSelectRow(
  track: DotTrack,
  getAnnotationSources: GetAnnotSources,
  getBands: (id: string) => Promise<RenderBand[]>,
): HTMLDivElement {
  const colorRow = getContainer("row");

  const label = document.createTextNode("Color:");

  const select = document.createElement("select") as HTMLSelectElement;
  select.style.backgroundColor = COLORS.white;
  const sources = getAnnotationSources();

  populateSelect(select, sources, true);

  select.addEventListener("change", async (_e) => {
    const currentId = select.value;
    if (currentId != "") {
      const bands = await getBands(currentId);
      track.updateColors(bands);
    } else {
      track.updateColors(null);
    }
  });

  colorRow.appendChild(label);
  colorRow.appendChild(select);

  return colorRow;
}

customElements.define("track-page", TrackPage);
