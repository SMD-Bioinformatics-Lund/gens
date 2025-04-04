import { get } from "../fetch";

// FIXME: Move to utils
function rgbArrayToString(rgbArray: number[]): string {
  return `rgb(${rgbArray[0]},${rgbArray[1]},${rgbArray[2]})`;
}

export async function getAnnotationData(
  chrom: string,
  source: string,
  apiURI: string,
): Promise<RenderBand[]> {
  const query = {
    sample_id: undefined,
    region: `${chrom}:1-None`,
    genome_build: 38,
    collapsed: true,
    source: source,
  };
  const annotsResult = await get(new URL("get-annotation-data", apiURI).href, query);
  const annotations = annotsResult.annotations as AnnotationEntry[];
  return annotations.map((annot) => {
    const rankScore = annot.score ? `, Rankscore: ${annot.score}` : "";
    const label = `${annot.name}, ${annot.start}-${annot.end}${rankScore}`;
    return {
      start: annot.start,
      end: annot.end,
      color: rgbArrayToString(annot.color),
      label,
    };
  });
}

export async function getTranscriptData(
  chrom: string,
  apiURI: string,
): Promise<RenderBand[]> {
  const query = {
    sample_id: undefined,
    region: `${chrom}:1-None`,
    genome_build: 38,
    collapsed: true,
  };
  const results = await get(new URL("get-transcript-data", apiURI).href, query);
  const transcripts = results.transcripts;

  const transcriptsToRender = transcripts.map((transcript) => {
    return {
      start: transcript.start,
      end: transcript.end,
      color: "blue",
      label: `${transcript.gene_name} (${transcript.transcript_id})`,
    };
  });

  return transcriptsToRender;
}

export async function getSVVariantData(
  sample_id: string,
  case_id: string,
  genome_build: number,
  chrom: string,
  apiURI: string,
) {
  // FIXME: Specify sample
  const query = {
    sample_id,
    case_id,
    region: `${chrom}:1-None`,
    genome_build,
    collapsed: true,
    variant_category: "sv",
  };
  const results = await get(new URL("get-variant-data", apiURI).href, query);
  const variants = results.variants;
  const toRender = variants.map((variant) => {
    return {
      start: variant.start,
      end: variant.end,
      color: "red",
    };
  });
  return toRender;
}

export async function getDotData(
  sampleId: string,
  caseId: string,
  chrom: string,
  covOrBaf: "cov" | "baf",
  apiURI: string,
): Promise<RenderDot[]> {
  // const regionString = `${region.chrom}:${region.start}-${region.end}`;

  const query = {
    sample_id: sampleId,
    case_id: caseId,
    region_str: `${chrom}:1-None`,
    cov_or_baf: covOrBaf,
  };

  const results = await get(new URL("dev-get-data", apiURI).href, query);

  const renderData = results.data.map((d) => {
    return {
      x: (d.start + d.end) / 2,
      y: d.value,
      color: "black", // Should this be assigned later actually?
    };
  });

  return renderData;
}

// export async function getCovData(
//     sampleId: string,
//     caseId: string,
//     chrom: string,
// ): Promise<RenderDot[]> {
//     return getDotData(sampleId, caseId, chrom, "cov");
// }

// export async function getBafData(
//     sampleId: string,
//     caseId: string,
//     chrom: string,
// ): Promise<RenderDot[]> {
//     return getDotData(sampleId, caseId, chrom, "baf");
// }

export async function getOverviewData(
  sampleId: string,
  caseId: string,
  covOrBaf: "cov" | "baf",
  apiURI: string,
): Promise<Record<string, RenderDot[]>> {
  const query = {
    sample_id: sampleId,
    case_id: caseId,
    cov_or_baf: covOrBaf,
  };

  const overviewData: { chrom: string; pos: number; value: number }[] =
    await get(new URL("dev-get-multiple-coverages", apiURI).href, query);

  const dataPerChrom: Record<string, RenderDot[]> = {};

  overviewData.forEach((element) => {
    if (dataPerChrom[element.chrom] === undefined) {
      dataPerChrom[element.chrom] = [];
    }
    const point: RenderDot = {
      x: element.pos,
      y: element.value,
      color: "black",
    };
    dataPerChrom[element.chrom].push(point);
  });

  return dataPerChrom;
}

export async function getIdeogramData(
  chrom: string,
  genomeBuild: number,
  apiURL: string,
): Promise<ChromosomeInfo> {
  const chromosomeInfo = (await get(
    new URL("get-chromosome-info", apiURL).href,
    {
      chromosome: chrom,
      genome_build: genomeBuild,
    },
  )) as ChromosomeInfo;

  return chromosomeInfo;
}
