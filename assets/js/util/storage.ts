export interface TrackHeights {
  bandCollapsed: number;
  dotCollapsed: number;
  dotExpanded: number;
}
export const ANNOT_SELECTIONS_KEY = "gens.annotationSelections";
export const COLOR_ANNOTATIONS_KEY = "gens.colorAnnotation";
export const TRACK_HEIGHTS_KEY = "gens.trackHeights";
export const COVERAGE_RANGE_KEY = "gens.coverageRange";

type StorageValue = string | string[] | TrackHeights | Rng;

export function saveAnnotationSelections(ids: string[]): void {
    saveToBrowserSession(ids, ANNOT_SELECTIONS_KEY);
}

export function loadAnnotationSelections(): string[] {
    return loadFromBrowserSession(ANNOT_SELECTIONS_KEY) as string[];
}

export function saveColorAnnotation(id: string | null): void {
    saveToBrowserSession(id, COLOR_ANNOTATIONS_KEY);
}

export function loadColorAnnotation(): string | null {
    return loadFromBrowserSession(COLOR_ANNOTATIONS_KEY) as string | null;
}

export function saveTrackHeights(heights: TrackHeights): void {
    saveToBrowserSession(heights, TRACK_HEIGHTS_KEY)
}

export function loadTrackHeights(): TrackHeights {
    return loadFromBrowserSession(TRACK_HEIGHTS_KEY) as TrackHeights;
}

export function saveCoverageRange(range: Rng): void {
    saveToBrowserSession(range, COVERAGE_RANGE_KEY);
}

export function loadCoverageRange(): Rng {
    return loadFromBrowserSession(COVERAGE_RANGE_KEY) as Rng;
}

function saveToBrowserSession(value: StorageValue, key: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save key ${key} values ${value}`, e);
  }
}

function loadFromBrowserSession(key: string): null | StorageValue {
    try {
        const stored = localStorage.getItem(key);
        if (stored == null) {
            return null;
        }
        return JSON.parse(stored);
    } catch (e) {
        console.warn(`Failed to load key ${key}`, e);
    }
}