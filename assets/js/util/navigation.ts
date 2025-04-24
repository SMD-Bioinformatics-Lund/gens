import { CHROMOSOMES } from "../constants";

export function getPan(
    viewRange: [number, number],
    direction = "left",
    speed = 0.1,
): [number, number] {
    const distance = Math.abs(Math.floor(speed * (viewRange[1] - viewRange[0])));
    let newStartX;
    let newEndX;
    if (direction === "left") {
        newStartX = viewRange[0] - distance;
        newEndX = viewRange[1] - distance;
    } else {
        newStartX = viewRange[0] + distance;
        newEndX = viewRange[1] + distance;
    }
    // drawTrack will correct the window eventually, but let us not go negative at least
    if (newStartX < 1) {
        newStartX = newEndX - newStartX;
        newStartX = 1;
    }
    return [newStartX, newEndX];
}

// parse chromosomal region designation string
// return chromosome, start and end position
// eg 1:12-220 --> 1, 12 220
// 1: --> 1, null, null
// 1 --> 1, null, null
export function parseRegionDesignation(regionString) {
    if (regionString.includes(":")) {
        const [chromosome, position] = regionString.split(":");
        // verify chromosome
        if (!CHROMOSOMES.includes(chromosome)) {
            throw new Error(`${chromosome} is not a valid chromosome`);
        }
        let [start, end] = position.split("-");
        start = parseInt(start);
        end = parseInt(end);
        return { chrom: chromosome, start: start, end: end };
    }
}

export function zoomIn(
    xCurrView: [number, number],
    zoomFactor: number = 0.2,
): [number, number] {
    const factor = Math.floor((xCurrView[1] - xCurrView[0]) * zoomFactor);
    const newStart = xCurrView[0] + factor;
    const newEnd = xCurrView[1] - factor;
    return [newStart, newEnd];
}

export function zoomOut(
    xCurrView: [number, number],
    zoomFactor: number = 3,
): [number, number] {
    const factor = Math.floor((xCurrView[1] - xCurrView[0]) / zoomFactor);
    const newStart = xCurrView[0] - factor < 1 ? 1 : xCurrView[0] - factor;
    const newEnd = xCurrView[1] + factor;
    return [newStart, newEnd];
    // pos.end += factor;
}