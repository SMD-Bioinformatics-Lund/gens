import { GensSession } from "../../../state/gens_session";
import { DataTrackSettings } from "../../tracks/base_tracks/data_track";

function getPortableId(settings: DataTrackSettings): string {
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

// export function saveTrackLayout(
//   session: GensSession,
//   dataTracks: DataTrackSettings[],
// ) {
//   // console.log("Saving track layout");

//   // const order: string[] = [];
//   // const hidden: Record<string, boolean> = {};
//   // const expanded: Record<string, boolean> = {};
//   // for (const info of dataTracks) {
//   //   const pid = getPortableId(info);
//   //   order.push(pid);
//   //   hidden[pid] = info.isHidden;
//   //   expanded[pid] = info.isExpanded;
//   // }
//   session.saveTrackLayout(dataTracks);
// }

// export function loadTrackLayout(
//   session: GensSession,
//   tracks: DataTrackSettings[],
// ): DataTrackSettings[] {
//   console.log("Loading track layout");

//   const layout = session.loadTrackLayout();
//   return layout;
//   // const byPid: Record<string, DataTrackWrapper> = {};
//   // for (const info of tracks) {
//   //   const pid = getPortableId(info);
//   //   if (pid) byPid[pid] = info;
//   // }
//   // const picked = new Set<string>();
//   // const reordered: DataTrackWrapper[] = [];
//   // for (const pid of layout.order) {
//   //   const info = byPid[pid];
//   //   if (info) {
//   //     reordered.push(info);
//   //     picked.add(info.track.id);
//   //   }
//   // }
//   // for (const info of tracks) {
//   //   if (!picked.has(info.track.id)) reordered.push(info);
//   // }
//   // for (const info of reordered) {
//   //   const pid = getPortableId(info);
//   //   if (!pid) continue;
//   //   const desiredHidden = layout.hidden[pid];
//   //   if (
//   //     typeof desiredHidden === "boolean" &&
//   //     info.track.getIsHidden() !== desiredHidden
//   //   ) {
//   //     info.track.toggleHidden();
//   //   }
//   //   const desiredExpanded = layout.expanded[pid];
//   //   if (
//   //     typeof desiredExpanded === "boolean" &&
//   //     info.track.getIsExpanded() !== desiredExpanded
//   //   ) {
//   //     info.track.toggleExpanded();
//   //   }
//   // }
//   // return reordered;
// }
