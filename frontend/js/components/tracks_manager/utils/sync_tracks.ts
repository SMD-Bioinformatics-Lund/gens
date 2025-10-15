import { COMBINED_SAMPLE_ID_DIVIDER, TRACK_HEIGHTS } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { removeOne, setDiff } from "../../../util/utils";
import {
  DataTrack,
  DataTrackSettings,
} from "../../tracks/base_tracks/data_track";

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
  const geneListSources = session.getGeneListSources({
    selectedOnly: true,
  });

  // FIXME: Let's start with assuming unique sample IDs
  const samples = session.getSamples();

  const { removedIds: removedAnnotIds, newAnnotationSettings } = annotationDiff(
    origTrackSettings,
    annotSources,
  );

  // GENE LIST DIFF
  const { newGeneListSettings, removedIds: removedGeneListIds } = geneListDiff(
    origTrackSettings,
    geneListSources,
  );

  const { removedIds: removedSamples, sampleSettings } = await sampleDiff(
    samples,
    lastRenderedSamples,
    (caseId: string, sampleId: string) => session.getSample(caseId, sampleId),
    (caseId, sampleId) => dataSources.getSampleAnnotSources(caseId, sampleId),
  );
  const removedSampleTrackIds = [];
  for (const combinedSampleId of removedSamples) {
    const [caseId, sampleId] = combinedSampleId.split(
      COMBINED_SAMPLE_ID_DIVIDER,
    );
    for (const track of origTrackSettings) {
      if (
        track.sample &&
        track.sample.caseId == caseId &&
        track.sample.sampleId == sampleId
      ) {
        removedSampleTrackIds.push(track.trackId);
      }
    }
  }

  const returnTrackSettings = [...origTrackSettings];
  const removeIds = [
    ...removedAnnotIds,
    ...removedGeneListIds,
    ...removedSampleTrackIds,
  ];

  for (const removeId of removeIds) {
    removeOne(returnTrackSettings, (setting) => setting.trackId == removeId);
  }

  returnTrackSettings.push(...sampleSettings);
  returnTrackSettings.push(...newAnnotationSettings);
  returnTrackSettings.push(...newGeneListSettings);

  // FIXME: Sync the ordering here as well

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
): Promise<{
  removedIds: Set<string>;
  sampleSettings: DataTrackSettings[];
}> {
  const currentCombinedIds = samples.map(
    (sample) =>
      `${sample.caseId}${COMBINED_SAMPLE_ID_DIVIDER}${sample.sampleId}`,
  );
  const lastRenderedCombinedIds = lastRenderedSamples.map(
    (sample) =>
      `${sample.caseId}${COMBINED_SAMPLE_ID_DIVIDER}${sample.sampleId}`,
  );

  const { removedIds: removedCombinedIds, newIds: newCombinedIds } = getIDDiff(
    lastRenderedCombinedIds,
    currentCombinedIds,
  );

  const sampleSettings = [];
  for (const combinedId of newCombinedIds) {
    const [caseId, sampleId] = combinedId.split(COMBINED_SAMPLE_ID_DIVIDER);
    const sample = getSample(caseId, sampleId);
    const sampleSources = await getSampleAnnotSources(
      sample.caseId,
      sample.sampleId,
    );

    // FIXME: Some logic here to distinguish if single or multiple samples opened
    // FIXME: Loading defaulting
    const cov: DataTrackSettings = {
      trackId: `${sample.sampleId}_log2_cov`,
      trackLabel: `${sample.sampleId} cov`,
      trackType: "dot-cov",
      sample,
      height: {
        collapsedHeight: TRACK_HEIGHTS.m,
        expandedHeight: TRACK_HEIGHTS.xl,
      },
      showLabelWhenCollapsed: true,
      yAxis: {
        range: [-2, 2],
        label: "Log2 Ratio",
        hideLabelOnCollapse: false,
        hideTicksOnCollapse: false,
      },
      isExpanded: true,
      isHidden: false,
    };

    const baf: DataTrackSettings = {
      trackId: `${sample.sampleId}_baf`,
      trackLabel: `${sample.sampleId} baf`,
      trackType: "dot-baf",
      sample,
      height: {
        collapsedHeight: TRACK_HEIGHTS.m,
        expandedHeight: TRACK_HEIGHTS.xl,
      },
      showLabelWhenCollapsed: true,
      yAxis: {
        range: [0, 1],
        label: "B Allele Freq",
        hideLabelOnCollapse: false,
        hideTicksOnCollapse: false,
      },
      isExpanded: true,
      isHidden: false,
    };

    const variants: DataTrackSettings = {
      trackId: `${sample.sampleId}_variants`,
      trackLabel: `${sample.sampleId} Variants`,
      trackType: "variant",
      sample,
      height: {
        collapsedHeight: TRACK_HEIGHTS.m,
        expandedHeight: TRACK_HEIGHTS.xl,
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
        height: { collapsedHeight: TRACK_HEIGHTS.m },
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
      height: { collapsedHeight: TRACK_HEIGHTS.m },
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

function geneListDiff(
  origTrackSettings: DataTrackSettings[],
  geneListSources: { id: string; label: string }[],
): {
  newGeneListSettings: DataTrackSettings[];
  removedIds: Set<string>;
} {
  const origGeneListTrackSettings = origTrackSettings.filter(
    (track) => track.trackType == "gene-list",
  );
  const currentlySelectedGeneListIds = geneListSources.map(
    (source) => source.id,
  );
  const previouslySelectedGeneListIds = origGeneListTrackSettings.map(
    (trackSetting) => trackSetting.trackId,
  );
  const { removedIds, newIds: newGeneListIds } = getIDDiff(
    previouslySelectedGeneListIds,
    currentlySelectedGeneListIds,
  );
  const newGeneListSettings = Array.from(newGeneListIds).map((id) => {
    const newSetting: DataTrackSettings = {
      trackId: id,
      trackLabel: "PLACEHOLDER",
      trackType: "annotation",
      height: { collapsedHeight: TRACK_HEIGHTS.m },
      showLabelWhenCollapsed: true,
      yAxis: null,
      isExpanded: true,
      isHidden: false,
    };
    return newSetting;
  });

  return {
    newGeneListSettings,
    removedIds,
  };
}
