// Prefer using the raw constants
// Component specific info goes into the STYLE constant

export const ZINDICES = {
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

export const COLORS = {
  white: "#FFF",
  black: "#222",
  darkGray: "#555",
  lightGray: "#ccc",
  extraLightGray: "#eee",
  yellow: "#dcd16f",
  red: "#f00",
  teal: "#008080",
  orange: "#954000",
  purple: "#5E4B8B",
  gold: "#D4AF37",
  transparentYellow: "#dcd16f44",
};

export const PAD = {
  xxs: 2,
  xs: 4,
  s: 6,
  m: 9,
  l: 12,
}

const font = "12px sans-serif";

// FIXME: First step is to gather all constants here
// FIXME: Then, the content below should be homogenized
export const STYLE = {
  menu: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.lightGray,
    textColor: COLORS.black,
    closeColor: COLORS.darkGray,
    borderWidth: 1,
    padding: PAD.l,
    font,
    borderRadius: 6,
    margin: PAD.s,
    headerSize: FONT_SIZE.large,
    headerFontWeight: FONT_WEIGHT.header,
    breadFontWeight: FONT_WEIGHT.bold,
    shadowSize: 2,
    transitionTime: "0.3s",
  },
  variantColors: {
    del: COLORS.orange,
    dup: COLORS.teal,
    inv: COLORS.purple,
    ins: COLORS.gold,
    default: "gray",
  },
  bandTrack: {
    trackPadding: PAD.l,
    bandPadding: PAD.xxs,
    trackHeight: {
      extraThin: 20,
      thin: 45,
      thick: 80,
    },
    edgeColor: COLORS.darkGray,
    minBandWidth: 2,
  },
  ideogramMarker: {
    leftMargin: PAD.xs,
    borderWidth: 2,
  },
  bands: {
    edgeColor: COLORS.darkGray,
    edgeWidth: 1,
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
    textPadding: PAD.xs,
    textFramePadding: PAD.xxs,
    textLaneSize: 20,
    backgroundColor: COLORS.white,
    frameLineWidth: 2,
  },
  ideogramTrack: {
    endBevelProportion: 0.05,
    centromereIndentProportion: 0.3,
    xPad: PAD.m,
    yPad: PAD.xs,
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
    width: 25,
    labelPos: 20,
    backgroundColor: COLORS.white,
  },
  colors: COLORS,
};

export const CHROMOSOMES = [
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
