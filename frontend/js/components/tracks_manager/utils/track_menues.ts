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
        session.tracks.shiftTrack(track.id, direction);
        render({ saveLayoutChange: true, tracksReorderedOnly: true });
      },
      () => {
        session.tracks.toggleTrackHidden(track.id);
        render({ saveLayoutChange: true, targetTrackId: track.id });
      },
      () => {
        session.tracks.toggleTrackExpanded(track.id);
        render({ saveLayoutChange: true });
      },
      () => track.getIsHidden(),
      () => track.getIsExpanded(),
      isDotTrack ? () => track.getYAxis().range : null,
      (newY: Rng) => {
        track.setYAxis(newY);
        render({});
      },
      // FIXME: Leftovers from rendering dots in colors
      async (_annotId: string | null) => {
        console.warn("Currently not implemented");
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
