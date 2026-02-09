import { TRACK_IDS, USED_TRACK_HEIGHTS } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import {
  getSampleIdentifierFromID,
  getSampleKey,
  removeOne,
  setDiff,
} from "../../../util/utils";

function getIDDiff(
  previousIds: string[],
  currentIds: string[],
): { newIds: Set<string>; removedIds: Set<string> } {
  const removedIds = setDiff(new Set(previousIds), new Set(currentIds));
  const newIds = setDiff(new Set(currentIds), new Set(previousIds));
  return {
    newIds,
    removedIds,
  };
}

export async function syncDataTrackSettings(
  origTrackSettings: DataTrackSettings[],
  session: GensSession,
  dataSources: RenderDataSource,
  lastRenderedSamples: Sample[],
): Promise<{ settings: DataTrackSettings[]; samples: Sample[] }> {
  const annotSources = session.getAnnotationSources({
    selectedOnly: true,
  });

  const samples = session.getSamples();

  const { removedIds: removedAnnotIds, newAnnotationSettings } = annotationDiff(
    origTrackSettings,
    annotSources,
  );

  const { removedIds: removedSamples, sampleSettings } = await sampleDiff(
    samples,
    lastRenderedSamples,
    (id: SampleIdentifier) => session.getSample(id),
    (id: SampleIdentifier) => dataSources.getSampleAnnotSources(id),
    () => session.profile.getCoverageRange(),
  );
  const removedSampleTrackIds = [];
  for (const combinedSampleId of removedSamples) {
    const targetSample = getSampleIdentifierFromID(combinedSampleId);
    for (const track of origTrackSettings) {
      if (
        track.sample &&
        track.sample.caseId == targetSample.caseId &&
        track.sample.sampleId == targetSample.sampleId &&
        track.sample.genomeBuild == targetSample.genomeBuild
      ) {
        removedSampleTrackIds.push(track.trackId);
      }
    }
  }

  const returnTrackSettings = [...origTrackSettings];
  const removeIds = [...removedAnnotIds, ...removedSampleTrackIds];

  for (const removeId of removeIds) {
    removeOne(returnTrackSettings, (setting) => setting.trackId == removeId);
  }

  returnTrackSettings.push(...sampleSettings);
  returnTrackSettings.push(...newAnnotationSettings);

  if (!returnTrackSettings.find((track) => track.trackId == "genes")) {
    const geneTrackSettings = getGeneTrackSettings();
    returnTrackSettings.push(geneTrackSettings);
  }

  return { settings: returnTrackSettings, samples: [...samples] };
}

export function getGeneTrackSettings() {
  const geneTrackSettings: DataTrackSettings = {
    trackId: TRACK_IDS.genes,
    trackLabel: "Genes",
    trackType: "gene",
    height: {
      collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedBand,
    },
    showLabelWhenCollapsed: true,
    isExpanded: true,
    isHidden: false,
  };
  return geneTrackSettings;
}

async function sampleDiff(
  samples: Sample[],
  lastRenderedSamples: Sample[],
  getSample: (id: SampleIdentifier) => Sample,
  getSampleAnnotSources: (
    id: SampleIdentifier,
  ) => Promise<{ id: string; name: string }[]>,
  getCoverageRange: () => Rng,
): Promise<{
  removedIds: Set<string>;
  sampleSettings: DataTrackSettings[];
}> {
  const currentCombinedIds = samples.map((sample) => getSampleKey(sample));
  const lastRenderedCombinedIds = lastRenderedSamples.map((sample) =>
    getSampleKey(sample),
  );

  const { removedIds: removedCombinedIds, newIds: newCombinedIds } = getIDDiff(
    lastRenderedCombinedIds,
    currentCombinedIds,
  );

  const sampleSettings = await getSampleTrackSettings(
    newCombinedIds,
    getSample,
    getCoverageRange,
    getSampleAnnotSources,
  );

  return {
    removedIds: removedCombinedIds,
    sampleSettings,
  };
}

export function annotationDiff(
  origTrackSettings: DataTrackSettings[],
  annotationSources: { id: string; label: string }[],
): { newAnnotationSettings: DataTrackSettings[]; removedIds: Set<string> } {
  const origAnnotTrackSettings = origTrackSettings.filter(
    (track) => track.trackType == "annotation",
  );
  const currentlySelectedAnnotIds = annotationSources.map(
    (source) => source.id,
  );
  const previousSettingsAnnotIds = origAnnotTrackSettings.map(
    (value) => value.trackId,
  );
  const { removedIds, newIds: newAnnotIds } = getIDDiff(
    previousSettingsAnnotIds,
    currentlySelectedAnnotIds,
  );
  const newAnnotationSettings = Array.from(newAnnotIds).map((id) => {
    // FIXME: Control for errors
    const targetSource = annotationSources.filter(
      (source) => source.id == id,
    )[0];
    const newSetting: DataTrackSettings = {
      trackId: id,
      trackLabel: targetSource.label,
      trackType: "annotation",
      height: { collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedBand },
      showLabelWhenCollapsed: true,
      yAxis: null,
      isExpanded: true,
      isHidden: false,
    };
    return newSetting;
  });
  return {
    newAnnotationSettings,
    removedIds,
  };
}

export async function getSampleTrackSettings(
  combinedSampleIds: Set<string>,
  getSample: (id: SampleIdentifier) => Sample,
  getCoverageRange: () => Rng,
  getSampleAnnotSources: (
    id: SampleIdentifier,
  ) => Promise<{ id: string; name: string }[]>,
): Promise<DataTrackSettings[]> {
  const sampleSettings = [];
  for (const combinedId of combinedSampleIds) {
    const sampleIds = getSampleIdentifierFromID(combinedId);
    const sample = getSample(sampleIds);

    const sampleTracks = await getSampleTracks(
      sample,
      getCoverageRange,
      getSampleAnnotSources,
    );
    sampleSettings.push(...sampleTracks);
  }
  return sampleSettings;
}

async function getSampleTracks(
  sampleIdentifier: Sample,
  getCoverageRange: () => Rng,
  getSampleAnnotSources: (
    id: SampleIdentifier,
  ) => Promise<{ id: string; name: string }[]>,
): Promise<DataTrackSettings[]> {
  // FIXME: Some logic here to distinguish if single or multiple samples opened
  // FIXME: Loading defaulting
  const cov: DataTrackSettings = {
    trackId: `${sampleIdentifier.sampleId}_${TRACK_IDS.cov}`,
    trackLabel: `${sampleIdentifier.sampleId} cov`,
    trackType: "dot-cov",
    sample: sampleIdentifier,
    height: {
      collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedDot,
      expandedHeight: USED_TRACK_HEIGHTS.trackView.expandedDot,
    },
    showLabelWhenCollapsed: true,
    yAxis: {
      range: getCoverageRange(),
      label: "Log2 Ratio",
      hideLabelOnCollapse: true,
      highlightedYs: [0],
    },
    isExpanded: true,
    isHidden: false,
  };

  const baf: DataTrackSettings = {
    trackId: `${sampleIdentifier.sampleId}_${TRACK_IDS.baf}`,
    trackLabel: `${sampleIdentifier.sampleId} baf`,
    trackType: "dot-baf",
    sample: sampleIdentifier,
    height: {
      collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedDot,
      expandedHeight: USED_TRACK_HEIGHTS.trackView.expandedDot,
    },
    showLabelWhenCollapsed: true,
    yAxis: {
      range: [0, 1],
      label: "B Allele Freq",
      hideLabelOnCollapse: true,
      highlightedYs: [0.5],
    },
    isExpanded: true,
    isHidden: false,
  };

  const variants: DataTrackSettings = {
    trackId: `${sampleIdentifier.sampleId}_${TRACK_IDS.variants}`,
    trackLabel: `${sampleIdentifier.sampleId} Variants`,
    trackType: "variant",
    sample: sampleIdentifier,
    height: {
      collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedBand,
    },
    showLabelWhenCollapsed: true,
    yAxis: null,
    isExpanded: false,
    isHidden: false,
  };

  const sampleSources = await getSampleAnnotSources(sampleIdentifier);

  const sampleAnnots = [];
  for (const source of sampleSources) {
    const sampleAnnot: DataTrackSettings = {
      trackId: source.id,
      trackLabel: source.name,
      trackType: "sample-annotation",
      sample: sampleIdentifier,
      height: { collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedBand },
      showLabelWhenCollapsed: true,
      yAxis: null,
      isExpanded: false,
      isHidden: false,
    };
    sampleAnnots.push(sampleAnnot);
  }

  return [cov, baf, variants, ...sampleAnnots];
}
