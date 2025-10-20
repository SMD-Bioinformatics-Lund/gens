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

