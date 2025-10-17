import { InputControls } from "./components/input_controls";
import { SideMenu } from "./components/side_menu/side_menu";
import { CHROMOSOMES } from "./constants";
import { GensSession } from "./state/gens_session";

export function setupShortcuts(
  session: GensSession,
  sideMenu: SideMenu,
  inputControls: InputControls,
  onChromClick: (chrom: string) => void,
  onChange: (settings: RenderSettings) => void,
) {
  // Rebuild the keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const active = document.activeElement as HTMLElement | null;
    const excludeFields = ["INPUT", "SELECT", "TEXTAREA", "SIDE-MENU"];
    let isEditing = false;
    if (active && excludeFields.includes(active.tagName)) {
      isEditing = true;
    }

    if (e.key === "Escape") {
      if (session.getMarkerModeOn()) {
        inputControls.toggleMarkerMode();
        return;
      }
      sideMenu.close();
    }
    if (e.key === "ArrowLeft") {
      if (isEditing) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currChrom = session.pos.getChromosome();
        const currIndex = CHROMOSOMES.indexOf(currChrom);
        if (currIndex > 0) {
          const newChrom = CHROMOSOMES[currIndex - 1];
          onChromClick(newChrom);
        }
      } else {
        inputControls.panLeft();
      }
    }
    if (e.key === "ArrowRight") {
      if (isEditing) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currChrom = session.pos.getChromosome();
        const currIndex = CHROMOSOMES.indexOf(currChrom);
        if (currIndex < CHROMOSOMES.length - 1) {
          const newChrom = CHROMOSOMES[currIndex + 1];
          onChromClick(newChrom);
        }
      } else {
        inputControls.panRight();
      }
    }
    if (e.key === "ArrowUp") {
      if (isEditing) return;
      e.preventDefault();
      session.pos.zoomIn();
      onChange({ positionOnly: true, reloadData: true });
    }
    if (e.key === "ArrowDown") {
      if (isEditing) return;
      e.preventDefault();
      session.pos.zoomOut();
      onChange({ positionOnly: true, reloadData: true });
    }
    if (e.key === "r") {
      if (isEditing) return;
      inputControls.resetZoom();
    }
    if (e.key === "m") {
      if (isEditing) return;
      inputControls.toggleMarkerMode();
    }
  });
}
