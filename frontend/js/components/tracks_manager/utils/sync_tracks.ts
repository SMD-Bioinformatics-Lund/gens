import { TRACK_HEIGHTS } from "../../../constants";
import { GensSession } from "../../../state/gens_session";
import { removeOne, setDiff } from "../../../util/utils";
import {
  DataTrack,
  DataTrackSettingsNew,
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
  origTrackSettings: DataTrackSettingsNew[],
  session: GensSession,
  dataSources: RenderDataSource,
  lastRenderedSamples: Sample[],
): Promise<{ settings: DataTrackSettingsNew[]; samples: Sample[] }> {
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
    (id) => `Dummy label for ${id}`,
  );

  // GENE LIST DIFF
  const { newGeneListSettings, removedIds: removedGeneListIds } = geneListDiff(
    origTrackSettings,
    geneListSources,
  );

  const { removedIds: sampleAnnotRemovedIds, sampleSettings } =
    await sampleDiff(
      samples,
      lastRenderedSamples,
      (id) => session.getSample(id),
      (caseId, sampleId) => dataSources.getSampleAnnotSources(caseId, sampleId),
    );

  const returnTrackSettings = [...origTrackSettings];
  const removeIds = [
    ...removedAnnotIds,
    ...removedGeneListIds,
    ...sampleAnnotRemovedIds,
  ];
  for (const removeId of removeIds) {
    removeOne(returnTrackSettings, (setting) => setting.trackId == removeId);
  }

  returnTrackSettings.push(...sampleSettings);
  returnTrackSettings.push(...newAnnotationSettings);
  returnTrackSettings.push(...newGeneListSettings);

  console.log("Return track settings", returnTrackSettings);

  return { settings: returnTrackSettings, samples };
}

async function sampleDiff(
  samples: Sample[],
  lastRenderedSamples: Sample[],
  getSample: (id: string) => Sample,
  getSampleAnnotSources: (
    caseId: string,
    sampleId: string,
  ) => Promise<{ id: string; name: string }[]>,
): Promise<{
  removedIds: Set<string>;
  sampleSettings: DataTrackSettingsNew[];
}> {
  const sampleIds = samples.map(
    (sample) => `${sample.caseId}___${sample.sampleId}`,
  );
  const lastRenderedSampleIds = lastRenderedSamples.map(
    (sample) => sample.sampleId,
  );

  const { removedIds, newIds: newSampleIds } = getIDDiff(
    lastRenderedSampleIds,
    sampleIds,
  );

  const sampleSettings = [];
  for (const sampleId of newSampleIds) {
    const sample = getSample(sampleId);
    const sampleSources = await getSampleAnnotSources(
      sample.caseId,
      sample.sampleId,
    );

    // FIXME: Some logic here to distinguish if single or multiple samples opened
    // FIXME: Loading defaulting
    const cov: DataTrackSettingsNew = {
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

    const baf: DataTrackSettingsNew = {
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

    const variants: DataTrackSettingsNew = {
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
      const sampleAnnot: DataTrackSettingsNew = {
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
    removedIds,
    sampleSettings,
  };
}

function annotationDiff(
  origTrackSettings: DataTrackSettingsNew[],
  annotationSources: { id: string; label: string }[],
  getLabel: (id: string) => string,
): { newAnnotationSettings: DataTrackSettingsNew[]; removedIds: Set<string> } {
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
    const trackLabel = getLabel(id);
    const newSetting: DataTrackSettingsNew = {
      trackId: id,
      trackLabel: trackLabel,
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
  origTrackSettings: DataTrackSettingsNew[],
  geneListSources: { id: string; label: string }[],
): {
  newGeneListSettings: DataTrackSettingsNew[];
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
    const newSetting: DataTrackSettingsNew = {
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
