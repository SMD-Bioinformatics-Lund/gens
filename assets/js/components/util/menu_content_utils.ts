import { prefixNts, prettyRange } from "../../util/utils";
import { getContainer, getEntry, getSection, getURLRow } from "./menu_utils";

export function getVariantContextMenuContent(
  trackId: string,
  sampleId: string,
  details: ApiVariantDetails,
  variantUrl: string,
): HTMLDivElement[] {
  details.sample = details.samples.filter(s => s.sample_id === sampleId)[0]
  const info: { key: string; value: string; url?: string }[] = [
    { key: "Range", value: `${details.start} - ${details.end}` },
    {
      key: "Length",
      value: prefixNts(details.length),
    },
    {
      key: "Genotype call",
      value: details.sample.genotype_call,
    },
    {
      key: "Allele depths",
      value: details.sample.allele_depths.join(", ")
    },
    {
      key: "Read depth",
      value: details.sample.read_depth.toString()
    },
    {
      key: "Genotype quality",
      value: details.sample.genotype_quality.toString()
    },
    {
      key: "Split read",
      value: details.sample.split_read.toString(),
    },
    { key: "Variant URL", value: variantUrl, url: variantUrl },
    { key: "CADD score", value: details.cadd_score },
    {
      key: "Category",
      value: `${details.category} (${details.sub_category})`,
    },
    {
      key: "Cytoband",
      value: `${details.cytoband_start} - ${details.cytoband_end}`,
    },
    { key: "Rank score", value: details.rank_score.toString() },
    { key: "BNF ID", value: trackId },
  ];

  const entries: HTMLDivElement[] = info.map((i) => getEntry(i));
  const rankScoreParts = getSection(
    "Rank score parts",
    details.rank_score_results.map((part) => {
      return getContainer("row", `${part.category}: ${part.score}`);
    }),
  );

  entries.push(rankScoreParts);
  return entries;
}

export function getGenesContextMenuContent(
  id: string,
  details: ApiGeneDetails,
): HTMLDivElement[] {
  const info: { key: string; value: string }[] = [
    { key: "Range", value: `${details.start} - ${details.end}` },
    {
      key: "Length",
      value: prefixNts(details.end - details.start + 1),
    },
    { key: "Transcript ID", value: details.transcript_id },
    { key: "Biotype", value: details.transcript_biotype },
    { key: "Gene name", value: details.gene_name },
    { key: "MANE", value: details.mane },
    { key: "HGNC ID", value: details.hgnc_id },
    { key: "Refseq ID", value: details.refseq_id },
    { key: "Strand", value: details.strand },
    { key: "BNF ID", value: id },
  ];

  const entries = info.map((i) => getEntry(i));
  return entries;
}

export function getAnnotationContextMenuContent(
  id: string,
  details: ApiAnnotationDetails,
): HTMLDivElement[] {
  const info: { key: string; value: string }[] = [
    {
      key: "Range",
      value: prettyRange(details.start, details.end),
    },
    {
      key: "Length",
      value: prefixNts(details.end - details.start + 1),
    },
    { key: "Name", value: details.name },
    { key: "Description", value: details.description || "-" },
    { key: "BNF ID", value: id },
  ];

  const infoDivs = info.map((i) => getEntry(i));

  const commentSection = getSection(
    "Comments",
    details.comments.flatMap((c) =>
      c.comment
        .replace('"', "")
        .split("; ")
        .map((s) => getURLRow(s)),
    ),
  );
  infoDivs.push(commentSection);

  const metaSection = getSection(
    "Metadata",
    details.metadata.map((meta) => {
      let url = null;
      if (meta.field_name === "reference") {
        const value = meta.value as { url: string; title: string };
        url = value.url;
      }

      const entry = getEntry({
        key: meta.field_name,
        url,
        value: url != null ? url : (meta.value as string),
      });
      return entry;
    }),
  );
  infoDivs.push(metaSection);
  return infoDivs;
}
