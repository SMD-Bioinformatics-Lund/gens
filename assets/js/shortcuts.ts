import { InputControls } from "./components/input_controls";
import { SideMenu } from "./components/side_menu/side_menu";
import { CHROMOSOMES } from "./constants";
import { GensSession } from "./state/gens_session";

export function setupShortcuts(
  session: GensSession,
  sideMenu: SideMenu,
  inputControls: InputControls,
  onChromClick: (chrom: string) => void,
) {
  // Rebuild the keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (session.getMarkerModeOn()) {
        inputControls.toggleMarkerMode();
        return;
      }
      sideMenu.close();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currChrom = session.getChromosome();
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
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currChrom = session.getChromosome();
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
      e.preventDefault();
      inputControls.zoomIn();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      inputControls.zoomOut();
    }
    if (e.key === "r") {
      inputControls.resetZoom();
    }
    if (e.key === "m") {
      inputControls.toggleMarkerMode();
    }
  });
}
