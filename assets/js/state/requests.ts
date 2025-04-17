import { get } from "../util/fetch";
import { zip } from "../util/utils";


export async function getAnnotationData(
  track_id: string,
  apiURI: string,
): Promise<APIAnnotation[]> {
  const query = {
  };
  const annotsResult = await get(
    new URL(`tracks/annotations/${track_id}`, apiURI).href,
    query,
  );
  const annotations = annotsResult.annotations as APIAnnotation[];
  return annotations;
}

export async function getTranscriptData(
  chrom: string,
  apiURI: string,
): Promise<APITranscript[]> {
  const query = {
    sample_id: undefined,
    region: `${chrom}:1-None`,
    genome_build: 38,
    collapsed: true,
  };
  const results = await get(new URL("get-transcript-data", apiURI).href, query);
  const transcripts = results.transcripts as APITranscript[];

  return transcripts;
}


// Seems the API call does not consider chromosome at the moment
// Returning all sorted on chromosome for now
export async function getChromToSVs(
  sample_id: string,
  case_id: string,
  genome_build: number,
  chrom: string,
  apiURI: string,
): Promise<Record<string, APIVariant[]>> {
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
  // FIXME: Move this color logic to after the call to the API class

  const chromToVariants: Record<string, APIVariant[]> = {};
  variants.forEach((variant) => {
    const chrom = variant.chromosome;
    if (chromToVariants[chrom] === undefined) {
      chromToVariants[chrom] = [];
    }
    chromToVariants[chrom].push(variant);
  });

  return chromToVariants;


}

export async function getCoverage(
  sampleId: string,
  caseId: string,
  chrom: string,
  covOrBaf: "cov" | "baf",
  apiURI: string,
): Promise<APICoverageDot[]> {

  const query = {
    sample_id: sampleId,
    case_id: caseId,
    chromosome: chrom,
    start: 1,
  };

  const regionResult: {position: number[], value: number[]} = await get(new URL(`samples/sample/${covOrBaf == "cov" ? "coverage" : "baf"}`, apiURI).href, query);

  const renderData: APICoverageDot[] = zip(regionResult.position, regionResult.value).map(([pos, val]) => {
    return {
      pos: pos,
      value: val,
    }
  })

  return renderData;
}

export async function getOverviewData(
  sampleId: string,
  caseId: string,
  covOrBaf: "cov" | "baf",
  apiURI: string,
): Promise<Record<string, APICoverageDot[]>> {
  const query = {
    sample_id: sampleId,
    case_id: caseId,
    cov_or_baf: covOrBaf,
  };

  const dataType = covOrBaf == "cov" ? "coverage" : "baf"
  const overviewData: { region: string; position: number[]; value: number[]; zoom: string | null }[] =
    await get(new URL(`samples/sample/${dataType}/overview`, apiURI).href, query);

  const dataPerChrom: Record<string, APICoverageDot[]> = {};

  overviewData.forEach((element) => {
    if (dataPerChrom[element.region] === undefined) {
      dataPerChrom[element.region] = [];
    }
    const points: APICoverageDot[] = zip(element.position, element.value).map((xy) => {
      return {
        pos: xy[0],
        value: xy[1],
      }
    })
    dataPerChrom[element.region] = points;

  });

  return dataPerChrom;
}

export async function getIdeogramData(
  chrom: string,
  genomeBuild: number,
  apiURL: string,
): Promise<ChromosomeInfo> {
  const chromosomeInfo = (await get(
    new URL(`tracks/chromosomes/${chrom}`, apiURL).href,
    {
      genome_build: genomeBuild,
    },
  )) as ChromosomeInfo;

  return chromosomeInfo;
}
