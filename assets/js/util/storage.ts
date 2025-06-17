export const ANNOT_SELECTIONS_KEY = "gens.annotationSelections";

export function saveAnnotationSelections(ids: string[]): void {
    try {
        localStorage.setItem(ANNOT_SELECTIONS_KEY, JSON.stringify(ids));
    } catch (e) {
        console.warn("Failed to save annotation selections", e);
    }
}

export function loadAnnotationSelections(): string[] | null {
    try {
        const stored = localStorage.getItem(ANNOT_SELECTIONS_KEY);
        if (stored == null) {
            return null;
        }
        return JSON.parse(stored);
    } catch (e) {
        console.warn("Failed to load annotation selections", e);
        return null;
    }
}