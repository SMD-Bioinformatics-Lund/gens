// FIXME: How to deal with multiple "relative" samples?

import { TRACK_ID_SUFFIXES } from "../../../constants";

// OK, if multiple relatives, then they will have to randomly be slotted in
export function getPortableId(settings: DataTrackSettings): string {
  const trackId = settings.trackId;
  if (settings.sample != null) {
    const sampleType = settings.sample.sampleType || "unknown";

    // FIXME: Constants for the track IDs, instead of hard-coded here
    if (settings.trackType == "dot-cov") {
      return `${sampleType}|${TRACK_ID_SUFFIXES.cov}`;
    }
    if (settings.trackType == "dot-baf") {
      return `${sampleType}|${TRACK_ID_SUFFIXES.baf}`;
    }
    if (settings.trackType == "variant") {
      return `${sampleType}|${TRACK_ID_SUFFIXES.variants}`;
    }
    if (settings.trackType == "sample-annotation") {
      return `${sampleType}|${TRACK_ID_SUFFIXES.sample_annot}`;
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
