// FIXME: How to deal with multiple "relative" samples?
// OK, if multiple relatives, then they will have to randomly be slotted in
export function getPortableId(settings: DataTrackSettings): string {
  const trackId = settings.trackId;
  if (settings.sample != null) {
    const sampleType = settings.sample.sampleType || "unknown";
    if (trackId.endsWith("_log2_cov")) {
      return `${sampleType}|log2_cov`;
    }
    if (trackId.endsWith("_log2_baf")) {
      return `${sampleType}|log2_baf`;
    }
    if (trackId.endsWith("_variants")) {
      return `${sampleType}|variants`;
    }
    // FIXME: Currently label contains the name. This does not work.
    // Can a single sample annot slot be used and then multiple tracks added together there?

    // Sample-annotation tracks (per-sample band tracks)
    // Use label to get a portable identity across cases
    return `sample-annot|${sampleType}|${settings.trackLabel}`;
  }
  if (trackId.startsWith("gene-list_")) {
    return `gene-list|${trackId.substring("gene-list_".length)}`;
  }
  if (trackId === "genes") {
    return "genes";
  }
  return `annot|${trackId}`;
}
