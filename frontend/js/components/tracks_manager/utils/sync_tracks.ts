import { TRACK_IDS, USED_TRACK_HEIGHTS } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import {
  getSampleFromID as getSampleIdsFromID,
  getSampleID,
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
    (caseId: string, sampleId: string) => session.getSample(caseId, sampleId),
    (caseId, sampleId) => dataSources.getSampleAnnotSources(caseId, sampleId),
    () => session.getCoverageRange(),
  );
  const removedSampleTrackIds = [];
  for (const combinedSampleId of removedSamples) {
    const targetSample = getSampleIdsFromID(combinedSampleId);
    for (const track of origTrackSettings) {
      if (
        track.sample &&
        track.sample.caseId == targetSample.caseId &&
        track.sample.sampleId == targetSample.sampleId
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
    returnTrackSettings.push(geneTrackSettings);
  }

  return { settings: returnTrackSettings, samples: [...samples] };
}

async function sampleDiff(
  samples: Sample[],
  lastRenderedSamples: Sample[],
  getSample: (caseId: string, sampleId: string) => Sample,
  getSampleAnnotSources: (
    caseId: string,
    sampleId: string,
  ) => Promise<{ id: string; name: string }[]>,
  getCoverageRange: () => Rng,
): Promise<{
  removedIds: Set<string>;
  sampleSettings: DataTrackSettings[];
}> {
  const currentCombinedIds = samples.map((sample) => getSampleID(sample));
  const lastRenderedCombinedIds = lastRenderedSamples.map((sample) =>
    getSampleID(sample),
  );

  const { removedIds: removedCombinedIds, newIds: newCombinedIds } = getIDDiff(
    lastRenderedCombinedIds,
    currentCombinedIds,
  );

  const sampleSettings = [];
  for (const combinedId of newCombinedIds) {
    const sampleIds = getSampleIdsFromID(combinedId);
    const sample = getSample(sampleIds.caseId, sampleIds.sampleId);
    const sampleSources = await getSampleAnnotSources(
      sample.caseId,
      sample.sampleId,
    );

    // FIXME: Some logic here to distinguish if single or multiple samples opened
    // FIXME: Loading defaulting
    const cov: DataTrackSettings = {
      trackId: `${sample.sampleId}_${TRACK_IDS.cov}`,
      trackLabel: `${sample.sampleId} cov`,
      trackType: "dot-cov",
      sample,
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
      trackId: `${sample.sampleId}_${TRACK_IDS.baf}`,
      trackLabel: `${sample.sampleId} baf`,
      trackType: "dot-baf",
      sample,
      height: {
        collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedDot,
        expandedHeight: USED_TRACK_HEIGHTS.trackView.expandedDot,
      },
      showLabelWhenCollapsed: true,
      yAxis: {
        range: [0, 1],
        label: "B Allele Freq",
        hideLabelOnCollapse: true,
      },
      isExpanded: true,
      isHidden: false,
    };

    const variants: DataTrackSettings = {
      trackId: `${sample.sampleId}_${TRACK_IDS.variants}`,
      trackLabel: `${sample.sampleId} Variants`,
      trackType: "variant",
      sample,
      height: {
        collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedBand,
      },
      showLabelWhenCollapsed: true,
      yAxis: null,
      isExpanded: false,
      isHidden: false,
    };

    const sampleAnnots = [];
    for (const source of sampleSources) {
      const sampleAnnot: DataTrackSettings = {
        trackId: source.id,
        trackLabel: source.name,
        trackType: "sample-annotation",
        sample,
        height: { collapsedHeight: USED_TRACK_HEIGHTS.trackView.collapsedBand },
        showLabelWhenCollapsed: true,
        yAxis: null,
        isExpanded: false,
        isHidden: false,
      };
      sampleAnnots.push(sampleAnnot);
    }
    sampleSettings.push(baf, cov, variants, ...sampleAnnots);
  }

  return {
    removedIds: removedCombinedIds,
    sampleSettings,
  };
}

function annotationDiff(
  origTrackSettings: DataTrackSettings[],
  annotationSources: { id: string; label: string }[],
  // getLabel: (id: string) => string,
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
    // returnSettings.push(newSetting);
  });
  return {
    newAnnotationSettings,
    removedIds,
  };
}
