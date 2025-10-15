import { STYLE } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { TrackMenu } from "../../side_menu/track_menu";
import { DataTrack } from "../../tracks/base_tracks/data_track";
import { DotTrack } from "../../tracks/dot_track";

export function getOpenTrackContextMenu(
  session: GensSession,
  render: (settings: RenderSettings) => void,
) {
  return (track: DataTrack) => {

    const isDotTrack = track instanceof DotTrack;

    const trackPage = new TrackMenu();
    const trackSettings = {
      showYAxis: isDotTrack,
      showColor: false,
    };
    trackPage.configure(track.id, trackSettings);

    session.showContent(track.label, [trackPage], STYLE.menu.narrowWidth);

    trackPage.initialize(
      (settings: { selectedOnly: boolean }) =>
        session.getAnnotationSources(settings),
      (direction: "up" | "down") => {
        console.log("Move track clicked");
        session.moveTrack(track.id, direction);
        render({ layout: true });
      },
      () => {
        track.toggleHidden();
        render({ layout: true });
      },
      () => {
        track.toggleExpanded();
        render({ layout: true });
      },
      () => track.getIsHidden(),
      () => track.getIsExpanded(),
      isDotTrack ? () => track.getYAxis().range : null,
      (newY: Rng) => {
        track.setYAxis(newY);
        render({});
      },
      async (annotId: string | null) => {
        console.warn("What is the intent here");
        // let colorBands = [];
        // if (annotId != null) {
        //   colorBands = await dataSource.getAnnotationBands(
        //     annotId,
        //     session.getChromosome(),
        //   );
        // }
        // track.setColorBands(colorBands);
        // render({});
      },
    );
  };
}
