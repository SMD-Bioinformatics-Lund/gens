import { CHROMOSOMES, STYLE } from "../../constants";
import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { ShadowBaseElement } from "../util/shadowbaseelement";
import { createAnnotTrack, createDataTrackWrapper, createDotTrack } from "./utils";

const COV_Y_RANGE: [number, number] = [-2, 2];

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
  private dataSource: RenderDataSource;
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
    dataSource: RenderDataSource,
  ) {
    this.session = session;
    this.sampleIds = sampleIds;
    this.dataSource = dataSource;

    const chromosomes = CHROMOSOMES;
    for (const chrom of chromosomes) {

      // FIXME: Per chromosome group created
      // Guess this will be needed for interactively adding / removing annot tracks

      for (const sampleId of sampleIds) {
        const trackId = `${sampleId}_${chrom}_cov`;
        const trackLabel = `${sampleId} ${chrom}`;
        const dotTrack = createDotTrack(
          trackId,
          trackLabel,
          sampleId,
          // FIXME: Control zoom levels for getCovData
          () => this.dataSource.getCovData(sampleId, chrom),
          {
            startExpanded: false,
            yAxis: {
              range: COV_Y_RANGE,
              reverse: true,
              label: chrom,
              hideLabelOnCollapse: false,
              hideTicksOnCollapse: true,
            },
            hasLabel: false,
          },
          this.session,
          this.openTrackContextMenu,
        );
        const trackWrapper = createDataTrackWrapper(dotTrack);
        this.tracks.push(dotTrack);
        this.chromosomeTracksContainer.appendChild(trackWrapper);
        dotTrack.initialize();
      }

      for (const {id: annotId, label: annotLabel} of session.getAnnotationSources({
        selectedOnly: true,
      })) {
        const trackId = `${annotLabel}_${chrom}_annot`;
        const trackLabel = `${annotLabel} ${chrom}`;

        const hasLabel = false;
        const annotTrack = createAnnotTrack(
          trackId,
          trackLabel,
          () => dataSource.getAnnotation(annotId, chrom),
          (bandId: string) => dataSource.getAnnotationDetails(bandId),
          session,
          (_track) => {},
          STYLE.tracks.trackHeight.extraThin,
          hasLabel,
        )
        const annotTrackWrapper = createDataTrackWrapper(annotTrack);
        this.tracks.push(annotTrack);
        this.chromosomeTracksContainer.appendChild(annotTrackWrapper);
        annotTrack.initialize();
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
