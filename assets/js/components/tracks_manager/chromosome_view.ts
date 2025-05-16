import { CHROMOSOMES } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { COV_Y_RANGE, TracksManagerDataSources } from "./tracks_manager";
import { createDataTrackWrapper, createDotTrack } from "./utils";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div id="chromosome-tracks-container"></div>
`;

export class ChromosomeView extends ShadowBaseElement {
  private chromosomeTracksContainer: HTMLDivElement;
  private isInitialized: boolean;
  private sampleIds: string[];
  private session: GensSession;
  private dataSources: TracksManagerDataSources;
  private openTrackContextMenu: (track: DataTrack) => void;

  private tracks: DataTrack[] = [];

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.chromosomeTracksContainer = this.root.querySelector(
      "#chromosome-tracks-container",
    );
  }

  initialize(
    session: GensSession,
    sampleIds: string[],
    dataSources: TracksManagerDataSources,
  ) {
    console.log("Inside initialize");

    this.session = session;
    this.sampleIds = sampleIds;
    this.dataSources = dataSources;

    const chromosomes = CHROMOSOMES;
    for (const chrom of chromosomes) {
      for (const sampleId of sampleIds) {
        const trackId = `${sampleId}_${chrom}_cov`;
        const trackLabel = `${sampleId} ${chrom}`;
        // Only load overview here or?
        const track = createDotTrack(
          trackId,
          trackLabel,
          sampleId,
          () => this.dataSources.getCovData(sampleId, { chrom }),
          {
            startExpanded: false,
            yAxis: {
              range: COV_Y_RANGE,
              reverse: true,
              label: "Log2 Ratio",
              hideLabelOnCollapse: true,
              hideTicksOnCollapse: true,
            },
          },
          this.session,
          this.openTrackContextMenu,
        );

        const trackWrapper = createDataTrackWrapper(track);

        this.tracks.push(track);

        this.chromosomeTracksContainer.appendChild(trackWrapper);
        track.initialize();

        // Add to chrom tracks
        // Add to sample tracks
      }
    }
  }

  render(settings: RenderSettings) {

    for (const track of this.tracks) {
      track.render(settings);
    }
  }
}

customElements.define("chromosome-view", ChromosomeView);
