import { TRACK_IDS } from "../../../constants";

export function getPortableId(settings: DataTrackSettings): string {
  const trackId = settings.trackId;
  if (settings.sample != null) {
    const sampleType = settings.sample.sampleType || "unknown";

    if (settings.trackType == "dot-cov") {
      return `${sampleType}|${TRACK_IDS.cov}`;
    }
    if (settings.trackType == "dot-baf") {
      return `${sampleType}|${TRACK_IDS.baf}`;
    }
    if (settings.trackType == "variant") {
      return `${sampleType}|${TRACK_IDS.variants}`;
    }
    if (settings.trackType == "sample-annotation") {
      return `${sampleType}|${TRACK_IDS.sample_annot}`;
    }

    throw Error(
      "Sample found " +
        settings.sample +
        " but track type is not matching expected sample types " +
        settings.trackType,
    );
  }
  if (settings.trackType == "gene") {
    return "genes";
  }
  if (settings.trackType == "annotation") {
    return `annot|${trackId}`;
  }
  throw Error(
    "Sample not found and track type not matching any expected non-sample types: " +
      settings.trackType,
  );
}
