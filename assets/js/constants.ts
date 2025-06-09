// Prefer using the raw constants
// Component specific info goes into the STYLE constant

export const ZINDICES = {
  trackMarkers: 1000,
  sideMenu: 2000,
}

export const FONT_SIZE = {
  small: 10,
  medium: 12,
  large: 16,
};

export const FONT_WEIGHT = {
  header: 600,
  bold: 300,
}

export const ANIM_TIME = {
  medium: 150,
}

export const ICONS = {
  chromosomes: "fa-chart-bar",
  collapse: "fa-minimize",
  down: "fa-arrow-down",
  expand: "fa-maximize",
  hide: "fa-eye-slash",
  plus: "fa-plus",
  left: "fa-arrow-left",
  marker: "fa-marker",
  minus: "fa-minus",
  reset: "fa-rotate-right",
  right: "fa-arrow-right",
  search: "fa-search",
  settings: "fa-cog",
  show: "fa-eye",
  trash: "fa-trash",
  up: "fa-arrow-up",
  xmark: "fa-xmark",
  zoomin: "fa-search-plus",
  zoomout: "fa-search-minus",
}

export const TRANSPARENCY = {
  s: "CC",
  m: "44",
  l: "22",
}

export const COLORS = {
  white: "#FFFFFF",
  black: "#222",
  green: "#71bd71",
  // darkGreen: "#315231",
  darkGray: "#555",
  lightGray: "#ccc",
  lighterGray: "#eee",
  extraLightGray: "#fafafa",
  yellow: "#dcd16f",
  red: "#f00",
  teal: "#008080",
  orange: "#954000",
  purple: "#5E4B8B",
  gold: "#D4AF37",
  transparentYellow: "#dcd16f44",
  transparentBlue: "#55667722",
};

export const SIZES = {
  xxs: 2,
  xs: 4,
  s: 6,
  m: 8,
  l: 12,
}

const font = "12px sans-serif";

export const TRACK_HEIGHTS = {
  xl: 200,
  l: 120,
  m: 45,
  s: 30,
  xs: 20,
  xxs: 10,
}

export const VARIANT_COLORS = {
    del: "rgb(102,0,0)",
    dup: "rgb(0,0,102)",
    tdup: "rgb(0,0,102)",
    default: "gray",
  }

// FIXME: First step is to gather all constants here
// FIXME: Then, the content below should be homogenized
export const STYLE = {
  menu: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.lightGray,
    textColor: COLORS.black,
    closeColor: COLORS.darkGray,
    borderWidth: 1,
    padding: SIZES.l,
    font,
    borderRadius: 6,
    margin: SIZES.s,
    headerSize: FONT_SIZE.large,
    headerFontWeight: FONT_WEIGHT.header,
    breadFontWeight: FONT_WEIGHT.bold,
    shadowSize: 2,
    transitionTime: "0.3s",
  },
  bandTrack: {
    trackPadding: SIZES.l,
    bandPadding: SIZES.xxs,
    edgeColor: COLORS.darkGray,
    minBandWidth: 2,
    dynamicPadThreshold: 40,
    dynamicPadFraction: 8,
    trackViewHeight: TRACK_HEIGHTS.s,
  },
  dotTrack: {
    dotSize: 2,
    dotColor: COLORS.black,
  },
  ideogramMarker: {
    leftMargin: SIZES.xs,
    borderWidth: 2,
  },
  bands: {
    edgeColor: COLORS.darkGray,
    edgeWidth: 1,
  },
  overviewTrack: {
    titleSpace: 20,
    labelPad: SIZES.s
  },
  tracks: {
    // edgeColor: colors.white,
    edgeColor: COLORS.extraLightGray,
    gridColor: COLORS.extraLightGray,
    textFrameColor: COLORS.lightGray,
    dashLength: 4,
    dashGap: 8,
    gridLineWidth: 1,
    // nts per pixel
    zoomLevel: {
      showDetails: 5000,
    },
    font,
    textColor: COLORS.darkGray,
    textPadding: SIZES.xs,
    textFramePadding: SIZES.xxs,
    textLaneSize: 20,
    backgroundColor: COLORS.white,
    frameLineWidth: 2,
    trackHeight: TRACK_HEIGHTS,
  },
  positionTrack: {
    sizePadFraction: 0.02,
    tickCount: 12,
    tickHeight: 4,
  },
  ideogramTrack: {
    endBevelProportion: 0.05,
    centromereIndentProportion: 0.3,
    xPad: SIZES.m,
    yPad: SIZES.xs,
    lineColor: COLORS.darkGray,
    lineWidth: 1,
    stainToColor: {
      acen: "#673888",
      gneg: "#FFFAF0",
      gvar: "#4C6D94",
      gpos25: "#333",
      gpos50: "#777",
      gpos75: "#AAA",
      gpos100: "#EEE",
    },
  },
  yAxis: {
    width: 40,
    textPad: SIZES.s,
    backgroundColor: COLORS.extraLightGray,
  },
  colors: COLORS,
};

export const CHROMOSOMES: Chromosome[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "X",
  "Y",
];

export const SAMPLE_TYPES = [
  "proband",
  "mother",
  "father",
  "tumor",
  "normal",
];
