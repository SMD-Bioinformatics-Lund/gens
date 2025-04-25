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

const colors = {
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
    backgroundColor: colors.white,
    borderColor: colors.lightGray,
    textColor: colors.black,
    closeColor: colors.darkGray,
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
    del: colors.orange,
    dup: colors.teal,
    inv: colors.purple,
    ins: colors.gold,
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
    edgeColor: colors.darkGray,
    minBandWidth: 2,
  },
  ideogramMarker: {
    leftMargin: PAD.xs,
    borderWidth: 2,
  },
  bands: {
    edgeColor: colors.darkGray,
    edgeWidth: 1,
  },
  tracks: {
    // edgeColor: colors.white,
    edgeColor: colors.extraLightGray,
    gridColor: colors.extraLightGray,
    textFrameColor: colors.lightGray,
    dashLength: 4,
    dashGap: 8,
    gridLineWidth: 1,
    // nts per pixel
    zoomLevel: {
      showDetails: 5000,
    },
    font,
    textColor: colors.darkGray,
    textPadding: PAD.xs,
    textFramePadding: PAD.xxs,
    textLaneSize: 20,
    backgroundColor: colors.white,
    frameLineWidth: 2,
  },
  ideogramTrack: {
    endBevelProportion: 0.05,
    centromereIndentProportion: 0.3,
    xPad: PAD.m,
    yPad: PAD.xs,
    lineColor: colors.darkGray,
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
    backgroundColor: colors.white,
  },
  colors,
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
