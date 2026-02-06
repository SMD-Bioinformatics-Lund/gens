import { SideMenu } from "../components/side_menu/side_menu";
import {
  annotationDiff,
  getGeneTrackSettings,
} from "../components/tracks_manager/utils/sync_tracks";
import { getPortableId } from "../components/tracks_manager/utils/track_layout";
import { COLORS, PROFILE_SETTINGS_VERSION, TRACK_IDS } from "../constants";
import { getMetaWarnings } from "../util/meta_warnings";
import { generateID } from "../util/utils";
import { SessionProfiles } from "./session_helpers/session_layouts";
import { SessionPosition } from "./session_helpers/session_position";
import { getArrangedTracks, Tracks } from "./session_helpers/session_tracks";

/**
 * The purpose of this class is to keep track of the web session,
 * i.e. state of Gens unrelated to the data.
 * Examples might be what region is watched, highlights, whether
 * in marker mode.
 *
 * What annotations are currently selected.
 *
 * It might also be whether tracks are hidden / collapsed / toggled actually.
 * Currently that is maintained by the tracks themselves though. But
 * it should probably be kept here as well.
 */

export class GensSession {
  private render: (settings: RenderSettings) => void;
  private sideMenu: SideMenu;
  private markerModeOn: boolean = false;
  private highlights: Record<string, RangeHighlight>;
  private mainSample: Sample;
  private samples: Sample[];
  private allSamples: Sample[];
  private chromViewActive: boolean;
  private warningThresholds: WarningThreshold[];

  // Constants
  private variantSoftwareBaseURL: string | null;
  private gensBaseURL: string;
  private genomeBuild: number;
  private idToAnnotSource: Record<string, ApiAnnotationTrack>;

  public tracks: Tracks;
  public chromTracks: Tracks;
  public pos: SessionPosition;
  public profile: SessionProfiles;

  constructor(
    render: (settings: RenderSettings) => void,
    sideMenu: SideMenu,
    mainSample: Sample,
    samples: Sample[],
    allSamples: Sample[],
    variantSoftwareBaseURL: string | null,
    gensBaseURL: string,
    genomeBuild: number,
    defaultProfiles: Record<string, ProfileSettings>,
    chromInfo: Record<Chromosome, ChromosomeInfo>,
    chromSizes: Record<Chromosome, number>,
    startRegion: { chrom: Chromosome; start?: number; end?: number } | null,
    allAnnotationSources: ApiAnnotationTrack[],
    warningThresholds: WarningThreshold[],
  ) {
    // FIXME: Could this one be removed? Seems strange to have the render as a dependency for the session
    // Should be replaced by callbacks minimally, and ideally reworked such that none of the render calling
    // is dealt with from session itself
    this.render = render;
    this.sideMenu = sideMenu;
    this.mainSample = mainSample;
    this.highlights = {};

    this.samples = samples;
    this.allSamples = allSamples;

    this.idToAnnotSource = {};
    for (const annotSource of allAnnotationSources) {
      this.idToAnnotSource[annotSource.track_id] = annotSource;
    }

    this.variantSoftwareBaseURL = variantSoftwareBaseURL;
    this.gensBaseURL = gensBaseURL;
    this.genomeBuild = genomeBuild;
    this.warningThresholds = warningThresholds;

    this.profile = new SessionProfiles(defaultProfiles, samples);
    this.tracks = new Tracks([]);
    this.chromTracks = new Tracks([]);

    const chromosome = startRegion ? startRegion.chrom : "1";
    const start = startRegion?.start ? startRegion.start : 1;
    const end = startRegion?.end ? startRegion.end : chromSizes[chromosome];
    this.pos = new SessionPosition(
      chromosome,
      start,
      end,
      chromSizes,
      chromInfo,
    );
  }

  public getMainSample(): Sample {
    return this.mainSample;
  }

  public getMeta(
    metaId: string,
  ): { meta: SampleMetaEntry; sample: Sample } | null {
    for (const sample of this.samples) {
      for (const meta of sample.meta) {
        if (meta.id === metaId) {
          return { meta, sample };
        }
      }
    }
    return null;
  }

  public getMetaWarnings(metaId: string): { row: string; col: string }[] {
    const { meta, sample } = this.getMeta(metaId);

    if (meta == null) {
      return [];
    }

    const thresholds = this.warningThresholds;
    const warningCoords = [];

    for (const val of meta.data) {
      if (!val.row_name) {
        continue;
      }

      const matchedThreshold = thresholds.find(
        (thres) => thres.column == val.type,
      );

      if (matchedThreshold) {
        const warning = getMetaWarnings(
          matchedThreshold,
          val.row_name,
          val.value,
          sample.sex,
        );

        if (warning) {
          const coord = {
            row: val.row_name,
            col: val.type,
          };
          warningCoords.push(coord);
        }
      }
    }

    return warningCoords;
  }

  public hasMetaWarnings(): boolean {
    for (const sample of this.samples) {
      for (const meta of sample.meta) {
        const warnings = this.getMetaWarnings(meta.id);
        if (warnings.length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  public setMainSample(sample: Sample) {
    this.mainSample = sample;
  }

  public getGenomeBuild(): number {
    return this.genomeBuild;
  }

  public getGensBaseURL(): string {
    return this.gensBaseURL;
  }

  public loadProfile(profile: ProfileSettings): void {
    this.profile.loadProfile(profile);
  }

  public getAnnotationSources(settings: {
    selectedOnly: boolean;
  }): { id: string; label: string }[] {
    const selectedAnnots = this.profile.getAnnotationSelections();
    const presentAnnots = selectedAnnots.filter(
      (annotId) => this.idToAnnotSource[annotId] != null,
    );

    if (selectedAnnots.length != presentAnnots.length) {
      console.warn(
        `Not all annotations were present. Selected: ${selectedAnnots.length} present: ${presentAnnots.length}`,
      );
    }

    if (settings.selectedOnly) {
      return presentAnnots.map((id) => {
        const track = this.idToAnnotSource[id];
        return {
          id,
          label: track.name,
        };
      });
    } else {
      Object.values(this.idToAnnotSource).map((obj) => {
        return {
          id: obj.track_id,
          label: obj.name,
        };
      });
    }

    // FIXME: Should this be owned by the session?
    // return this.settings.getAnnotSources(settings);
  }

  public getVariantURL(variantId: string): string | null {
    return this.variantSoftwareBaseURL
      ? `${this.variantSoftwareBaseURL}/document_id/${variantId}`
      : null;
  }

  public getChromViewActive(): boolean {
    return this.chromViewActive;
  }

  public toggleChromViewActive() {
    this.chromViewActive = !this.chromViewActive;
  }

  public getSamples(): Sample[] {
    return this.samples;
  }

  public getSample(sampleIdf: SampleIdentifier): Sample | null {
    const matchedSamples = this.allSamples.filter(
      (sample) =>
        sample.caseId == sampleIdf.caseId &&
        sample.sampleId == sampleIdf.sampleId &&
        sample.genomeBuild == sampleIdf.genomeBuild,
    );
    if (matchedSamples.length == 1) {
      return matchedSamples[0];
    } else if (matchedSamples.length == 0) {
      return null;
    } else {
      throw new Error(`Found multiple samples: ${matchedSamples}`);
    }
  }

  public addSample(id: SampleIdentifier) {
    this.samples.push(id);
    this.profile.updateProfileKey(this.samples);
  }

  public removeSample(id: SampleIdentifier): void {
    const pos = this.samples.findIndex(
      (currSample) =>
        currSample.caseId === id.caseId &&
        currSample.sampleId === id.sampleId &&
        currSample.genomeBuild === id.genomeBuild,
    );

    if (pos === -1) {
      console.warn("Sample not found:", id);
      return;
    }

    this.samples.splice(pos, 1);
    this.profile.updateProfileKey(this.samples);
  }

  public getMarkerModeOn(): boolean {
    return this.markerModeOn;
  }

  public toggleMarkerMode() {
    this.markerModeOn = !this.markerModeOn;
    this.render({});
  }

  // FIXME: It is convenient for the session to know about the side menu
  // But not clean. I think this should be worked away, passing a reference to the side menu instead
  // to other parts of the code
  public showContent(header: string, content: HTMLElement[], width: number) {
    this.sideMenu.showContent(header, content, width);
  }

  public getAllHighlights(): RangeHighlight[] {
    return Object.values(this.highlights);
  }

  public getHighlights(chrom: string): RangeHighlight[] {
    return Object.values(this.highlights).filter((h) => h.chromosome === chrom);
  }

  /**
   * Return highlights for the currently viewed chromosome
   */
  public getCurrentHighlights(): RangeHighlight[] {
    return this.getHighlights(this.pos.getChromosome());
  }

  public removeHighlights() {
    this.highlights = {};
    this.render({});
  }

  public addHighlight(range: Rng): string {
    const id = generateID();

    const intRange: Rng = [Math.round(range[0]), Math.round(range[1])];

    const highlight = {
      id,
      chromosome: this.pos.getChromosome(),
      range: intRange,
      color: COLORS.transparentBlue,
    };

    this.highlights[highlight.id] = highlight;
    this.render({});
    return id;
  }

  public removeHighlight(id: string) {
    delete this.highlights[id];
    this.render({});
  }

  public resetTrackLayout(): void {
    this.profile.resetTrackLayout();
    this.loadTrackLayout();
  }

  public loadTrackLayout(): void {
    this.profile.setBaseTrackLayout(
      buildTrackLayoutFromTracks(this.tracks.getTracks()),
    );
    const layout = this.profile.getTrackLayout();

    if (!layout) {
      // If no layout saved, save the initial one
      this.saveTrackLayout();
      return;
    }

    const selectedAnnotIds = this.profile.getAnnotationSelections();
    const existingAnnotIds = selectedAnnotIds.filter(
      (id) => this.idToAnnotSource[id] != null,
    );

    // Make sure annotation selections are reflected in track settings
    // prior to attempting reordering
    const annotSelections = existingAnnotIds.map((id) => {
      return {
        id,
        label: this.idToAnnotSource[id].name,
      };
    });

    const diff = annotationDiff(this.tracks.getTracks(), annotSelections);
    for (const track of diff.newAnnotationSettings) {
      this.tracks.addTrack(track);
    }
    for (const removedId of diff.removedIds) {
      this.tracks.removeTrack(removedId);
    }

    const hasGenesTrack = this.tracks.hasTrack(TRACK_IDS.genes);
    if (!hasGenesTrack) {
      this.tracks.addTrack(getGeneTrackSettings());
    }

    const arrangedTracks = getArrangedTracks(layout, this.tracks.getTracks());

    this.tracks.setTracks(arrangedTracks);
  }

  public saveTrackLayout(): void {
    const layout = buildTrackLayoutFromTracks(this.tracks.getTracks());
    this.profile.setTrackLayout(layout);
  }
}

function buildTrackLayoutFromTracks(tracks: DataTrackSettings[]) {
  const order: Set<string> = new Set();
  const hidden: Record<string, boolean> = {};
  const expanded: Record<string, boolean> = {};
  for (const info of tracks) {
    const pid = getPortableId(info);
    order.add(pid);
    hidden[pid] = info.isHidden;
    expanded[pid] = info.isExpanded;
  }

  const layout = {
    version: PROFILE_SETTINGS_VERSION,
    order: Array.from(order),
    hidden,
    expanded,
  };
  return layout;
}
