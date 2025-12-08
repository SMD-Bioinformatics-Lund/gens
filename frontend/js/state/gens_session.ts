import { SideMenu } from "../components/side_menu/side_menu";
import { annotationDiff } from "../components/tracks_manager/utils/sync_tracks";
import { getPortableId } from "../components/tracks_manager/utils/track_layout";
import { getTableWarnings } from "../util/meta_warnings";
import { parseTableFromMeta } from "../util/table";
import { COLORS, PROFILE_SETTINGS_VERSION } from "../constants";
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
  private chromViewActive: boolean;

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
    variantSoftwareBaseURL: string | null,
    gensBaseURL: string,
    genomeBuild: number,
    defaultProfiles: Record<string, ProfileSettings>,
    chromInfo: Record<Chromosome, ChromosomeInfo>,
    chromSizes: Record<Chromosome, number>,
    startRegion: { chrom: Chromosome; start?: number; end?: number } | null,
    allAnnotationSources: ApiAnnotationTrack[],
  ) {
    this.render = render;
    this.sideMenu = sideMenu;
    this.mainSample = mainSample;
    this.highlights = {};

    this.samples = samples;

    this.idToAnnotSource = {};
    for (const annotSource of allAnnotationSources) {
      this.idToAnnotSource[annotSource.track_id] = annotSource;
    }

    this.variantSoftwareBaseURL = variantSoftwareBaseURL;
    this.gensBaseURL = gensBaseURL;
    this.genomeBuild = genomeBuild;

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

  public getMeta(metaId: string): SampleMetaEntry | null {
    for (const sample of this.samples) {
      for (const meta of sample.meta) {
        if (meta.id === metaId) {
          return meta;
        }
      }
    }
    return null;
  }

  // FIXME: Thresholding action here
  // Start with something hardcoded
  // How is it currently done?
  public getMetaWarnings(metaId: string): { x: number; y: number }[] {
    const meta = this.getMeta(metaId);

    if (meta == null) {
      return [];
    }

    return [{ x: 0, y: 0 }];
  }

  public hasMetaWarnings(): boolean {
    const sample = this.getMainSample();

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

  public getSample(caseId: string, sampleId: string): Sample | null {
    const matchedSamples = this.samples.filter(
      (sample) => sample.caseId == caseId && sample.sampleId == sampleId,
    );
    if (matchedSamples.length == 1) {
      return matchedSamples[0];
    } else if (matchedSamples.length == 0) {
      return null;
    } else {
      throw new Error(`Found multiple samples: ${matchedSamples}`);
    }
  }

  public addSample(sample: Sample) {
    this.samples.push(sample);
    this.profile.updateProfileKey(this.samples);
  }

  public removeSample(sample: Sample): void {
    const pos = this.samples.findIndex(
      (currSample) =>
        currSample.caseId === sample.caseId &&
        currSample.sampleId === sample.sampleId,
    );

    if (pos === -1) {
      console.warn("Sample not found:", sample);
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
