import { TRACK_IDS } from "../../../constants";

export function getPortableId(settings: DataTrackSettings, label: string|null): string {
  const trackId = settings.trackId;

  let trackType = null;
  let specifier = null;
  if (settings.sample != null) {
    const sampleType = settings.sample.sampleType || "unknown";

    if (settings.trackType == "dot-cov") {
      trackType = TRACK_IDS.cov;
      specifier = sampleType;
    }
    if (settings.trackType == "dot-baf") {
      trackType = TRACK_IDS.baf;
      specifier = sampleType;
    }
    if (settings.trackType == "variant") {
      trackType = TRACK_IDS.variants;
      specifier = sampleType;
    }
    if (settings.trackType == "sample-annotation") {
      trackType = TRACK_IDS.sample_annot;
      specifier = sampleType;
    }

    if (trackType == null) {
      throw Error(
        "Sample found " +
          settings.sample +
          " but track type is not matching expected sample types " +
          settings.trackType,
      );
    }
  }
  else if (settings.trackType == "gene") {
    trackType = TRACK_IDS.genes;
    specifier = "";
  }
  else if (settings.trackType == "annotation") {
    trackType = TRACK_IDS.annot
    specifier = trackId;
  }

  if (trackType != null) {
    const outLabel = label || "";
    return `${trackType}|${specifier}|${outLabel}`
  }

  throw Error(
    "Sample not found and track type not matching any expected non-sample types: " +
      settings.trackType,
  );
}
