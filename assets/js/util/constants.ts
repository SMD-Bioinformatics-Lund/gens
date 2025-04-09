// FIXME: Move all UI style variables here
export const COLORS = {
    "lightgray": "#e5e5e5"
}

export const FONTSIZES = {
    "small": 10,
    "medium": 18
}

const colors = {
    white: "#FFF",
    black: "#000",
    darkGray: "#555",
    lightGray: "#ccc",
    extraLightGray: "#eee",
    yellow: "#dcd16f",
    red: "#f00",
    teal: "teal",
    orange: "#954000",
    transparentYellow: "#dcd16f44",
    variantColors: {
        del: "red",
        dup: "blue",
        inv: "green",
        default: "gray",
    },
    stainToColor: {
        acen: "#673888",
        gneg: "#FFFAF0",
        gvar: "#4C6D94",
        gpos25: "#333",
        gpos50: "#777",
        gpos75: "#AAA",
        gpos100: "#EEE",
    }
}

export const STYLE = {
    bandTrack: {
        trackPadding: 15,
        bandPadding: 2,
        trackHeight: {
            extraThin: 20,
            thin: 50,
            thick: 80,
        },
        edgeColor: colors.darkGray,
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
            showDetails: 5000
        },
        font: "12px sans-serif",
        textColor: colors.darkGray,
        textPadding: 4,
        textFramePadding: 2,
        textLaneSize: 20,
        backgroundColor: colors.white,
    },
    yAxis: {
        width: 25,
    },
    colors,
}

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
  