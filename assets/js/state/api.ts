import { CHROMOSOMES } from "../constants";
import { get } from "../util/fetch";
import { zip } from "../util/utils";

const CACHED_ZOOM_LEVELS = ["o", "a", "b"];

export class API {
  genomeBuild: number;
  apiURI: string;
  // Data for these are loaded up front for the full chromosome
  // Remaining zoom levels (up to "d") are loaded dynamically and
  // only for the points currently in view

  private allChromData: Record<string, ChromosomeInfo> = {};

  getChromSizes(): Record<string, number> {
    if (this.allChromData == null) {
      throw Error("Must initialize before accessing the chromosome sizes");
    }

    const allChromSizes = {};
    for (const chrom of CHROMOSOMES) {
      const chromLength = this.allChromData[chrom].size;
      allChromSizes[chrom] = chromLength;
    }
    return allChromSizes;
  }

  getChromInfo(): Record<string, ChromosomeInfo> {
    return this.allChromData;
  }

  constructor(genomeBuild: number, gensApiURL: string) {
    this.genomeBuild = genomeBuild;
    this.apiURI = gensApiURL;
  }

  async initialize() {
    for (const chrom of CHROMOSOMES) {
      const chromInfo = await this.getChromData(chrom);
      this.allChromData[chrom] = chromInfo;
    }
  }

  getSearchResult(query: string): Promise<ApiSearchResult | null> {
    console.log(this.apiURI);
    const params = {
      q: query,
      genome_build: this.genomeBuild,
    };

    const details = get(new URL(`search/result`, this.apiURI), params).then(
      (result) => {
        if (result["chromosome"] != null) {
          return result;
        } else {
          return null;
        }
      },
    );
    return details;
  }

  getAnnotationDetails(id: string): Promise<ApiAnnotationDetails> {
    const details = get(
      new URL(`tracks/annotations/annotation/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiAnnotationDetails>;
    return details;
  }

  getTranscriptDetails(id: string): Promise<ApiGeneDetails> {
    const details = get(
      new URL(`tracks/transcripts/transcript/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiGeneDetails>;
    return details;
  }

  // FIXME: This is a temporary solution. Should really be a detail endpoint in the
  // backend similarly to the transcripts and the annotations
  async getVariantDetails(
    caseId: string,
    sampleId: string,
    variantId: string,
    currChrom: string,
  ): Promise<ApiVariantDetails> {
    const variants = await this.getVariants(caseId, sampleId, currChrom);
    const targets = variants.filter((v) => v.variant_id === variantId);
    if (targets.length != 1) {
      console.error("Expected a single variant, found: ", targets);
      if (targets.length === 0) {
        throw Error("No variant found");
      }
    }
    return targets[0];
  }

  getAnnotationSources(): Promise<ApiAnnotationTrack[]> {
    const annotSources = get(new URL("tracks/annotations", this.apiURI).href, {
      genome_build: this.genomeBuild,
    }) as Promise<ApiAnnotationTrack[]>;
    return annotSources;
  }

  private annotsCache: Record<string, Promise<ApiSimplifiedAnnotation[]>> = {};
  getAnnotations(trackId: string): Promise<ApiSimplifiedAnnotation[]> {
    if (this.annotsCache[trackId] === undefined) {
      const query = {};
      const annotations = get(
        new URL(`tracks/annotations/${trackId}`, this.apiURI).href,
        query,
      ) as Promise<ApiSimplifiedAnnotation[]>;

      this.annotsCache[trackId] = annotations;
    }

    return this.annotsCache[trackId];
  }

  /**
   * Calculate base zoom levels up front
   * Return detailed zoom levels only on demand
   */
  private covSampleChrZoomCache: Record<
    string,
    Record<string, Record<string, Promise<ApiCoverageDot[]>>>
  > = {};
  getCov(
    caseId: string,
    sampleId: string,
    chrom: string,
    zoom: string,
    xRange: Rng,
  ): Promise<ApiCoverageDot[]> {
    const endpoint = "samples/sample/coverage";

    if (this.covSampleChrZoomCache[sampleId] == null) {
      this.covSampleChrZoomCache[sampleId] = {};
    }

    if (CACHED_ZOOM_LEVELS.includes(zoom)) {
      const chrIsCached =
        this.covSampleChrZoomCache[sampleId][chrom] !== undefined;
      if (!chrIsCached) {
        this.covSampleChrZoomCache[sampleId][chrom] = getDataPerZoom(
          chrom,
          CACHED_ZOOM_LEVELS,
          endpoint,
          sampleId,
          caseId,
          this.apiURI,
          this.getChromSizes(),
        );
      }
      return this.covSampleChrZoomCache[sampleId][chrom][zoom];
    } else {
      return getCovData(
        this.apiURI,
        endpoint,
        sampleId,
        caseId,
        chrom,
        zoom,
        xRange,
      );
    }
  }

  private bafSampleZoomChrCache: Record<
    string,
    Record<string, Record<string, Promise<ApiCoverageDot[]>>>
  > = {};
  getBaf(
    caseId: string,
    sampleId: string,
    chrom: string,
    zoom: string,
    xRange: Rng,
  ): Promise<ApiCoverageDot[]> {
    const endpoint = "samples/sample/baf";

    if (this.bafSampleZoomChrCache[sampleId] == null) {
      this.bafSampleZoomChrCache[sampleId] = {};
    }

    if (CACHED_ZOOM_LEVELS.includes(zoom)) {
      const chrIsCached =
        this.bafSampleZoomChrCache[sampleId][chrom] !== undefined;
      if (!chrIsCached) {
        this.bafSampleZoomChrCache[sampleId][chrom] = getDataPerZoom(
          chrom,
          CACHED_ZOOM_LEVELS,
          endpoint,
          sampleId,
          caseId,
          this.apiURI,
          this.getChromSizes(),
        );
      }
      return this.bafSampleZoomChrCache[sampleId][chrom][zoom];
    } else {
      return getCovData(
        this.apiURI,
        endpoint,
        sampleId,
        caseId,
        chrom,
        zoom,
        xRange,
      );
    }
  }

  private transcriptCache: Record<string, Promise<ApiSimplifiedTranscript[]>> =
    {};
  getTranscripts(
    chrom: string,
    onlyMane: boolean,
  ): Promise<ApiSimplifiedTranscript[]> {
    const isCached = this.transcriptCache[chrom] !== undefined;
    if (!isCached) {
      const query = {
        chromosome: chrom,
        genome_build: this.genomeBuild,
        only_mane: onlyMane,
      };
      const transcripts = get(
        new URL("tracks/transcripts", this.apiURI).href,
        query,
      ) as Promise<ApiSimplifiedTranscript[]>;

      this.transcriptCache[chrom] = transcripts;
    }
    return this.transcriptCache[chrom];
  }

  private variantsSampleChromCache: Record<
    string,
    Record<string, Promise<ApiVariantDetails[]>>
  > = {};
  getVariants(
    caseId: string,
    sampleId: string,
    chrom: string,
  ): Promise<ApiVariantDetails[]> {
    if (this.variantsSampleChromCache[sampleId] == null) {
      this.variantsSampleChromCache[sampleId] = {};
    }

    const isCached =
      this.variantsSampleChromCache[sampleId][chrom] !== undefined;
    if (!isCached) {
      const query = {
        sample_id: sampleId,
        case_id: caseId,
        chromosome: chrom,
        category: "sv",
        start: 1,
      };
      const url = new URL("tracks/variants", this.apiURI).href;
      const variants = get(url, query).then((variants) => {
        const typedVariants = variants as ApiVariantDetails[];
        const filteredVariants = typedVariants
          .map((variant) => {
            const sampleCallInfo = variant.samples.find(
              (sample) => sample.sample_id == sampleId,
            );
            variant.sample = sampleCallInfo;
            return variant;
          })
          .filter((variant) => {
            const sample = variant.sample;

            return (
              sample != null &&
              sample.genotype_call != "0/0" &&
              sample.genotype_call != "./."
            );
          });
        return filteredVariants;
      });
      // FIXME: Temporary fix until backend is in place
      this.variantsSampleChromCache[sampleId][chrom] = variants;
    }
    return this.variantsSampleChromCache[sampleId][chrom];
  }

  private chromCache: Record<string, Promise<ChromosomeInfo>> = {};
  getChromData(chrom: string): Promise<ChromosomeInfo> {
    const isCached = this.chromCache[chrom] !== undefined;
    if (!isCached) {
      const chromosomeInfo = get(
        new URL(`tracks/chromosomes/${chrom}`, this.apiURI).href,
        {
          genome_build: this.genomeBuild,
        },
      ) as Promise<ChromosomeInfo>;

      this.chromCache[chrom] = chromosomeInfo;
    }
    return this.chromCache[chrom];
  }

  private overviewSampleCovCache: Record<
    string,
    Promise<Record<string, ApiCoverageDot[]>>
  > = {};
  getOverviewCovData(
    caseId: string,
    sampleId: string,
  ): Promise<Record<string, ApiCoverageDot[]>> {
    if (this.overviewSampleCovCache[sampleId] == null) {
      this.overviewSampleCovCache[sampleId] = getOverviewData(
        sampleId,
        caseId,
        "cov",
        this.apiURI,
      );
    }

    return this.overviewSampleCovCache[sampleId];
  }

  private overviewBafCache: Record<
    string,
    Promise<Record<string, ApiCoverageDot[]>>
  > = {};
  getOverviewBafData(
    caseId: string,
    sampleId: string,
  ): Promise<Record<string, ApiCoverageDot[]>> {
    if (this.overviewBafCache[sampleId] == null) {
      this.overviewBafCache[sampleId] = getOverviewData(
        sampleId,
        caseId,
        "baf",
        this.apiURI,
      );
    }
    return this.overviewBafCache[sampleId];
  }
}

async function getCovData(
  apiURI: string,
  endpoint: string,
  sampleId: string,
  caseId: string,
  chrom: string,
  zoom: string,
  range: Rng,
): Promise<ApiCoverageDot[]> {
  const query = {
    sample_id: sampleId,
    case_id: caseId,
    chromosome: chrom,
    zoom_level: zoom,
    start: range[0],
    end: range[1],
  };

  const regionResult = (await get(new URL(endpoint, apiURI).href, query)) as {
    position: number[];
    value: number[];
  };
  const parsedResult: ApiCoverageDot[] = zip(
    regionResult.position,
    regionResult.value,
  ).map(([pos, val]) => {
    return {
      pos: pos,
      value: val,
    };
  });

  return parsedResult;
}

function getDataPerZoom(
  chrom: string,
  zoomLevels: string[],
  endpoint: string,
  sampleId: string,
  caseId: string,
  apiURI: string,
  chromSizes: Record<string, number>,
): Record<string, Promise<ApiCoverageDot[]>> {
  const dataPerZoom: Record<string, Promise<ApiCoverageDot[]>> = {};

  for (const zoom of zoomLevels) {
    const parsedResult = getCovData(
      apiURI,
      endpoint,
      sampleId,
      caseId,
      chrom,
      zoom,
      [1, chromSizes[chrom]],
    );
    dataPerZoom[zoom] = parsedResult;
  }

  return dataPerZoom;
}

async function getOverviewData(
  sampleId: string,
  caseId: string,
  covOrBaf: "cov" | "baf",
  apiURI: string,
): Promise<Record<string, ApiCoverageDot[]>> {
  const query = {
    sample_id: sampleId,
    case_id: caseId,
    cov_or_baf: covOrBaf,
  };

  const dataType = covOrBaf == "cov" ? "coverage" : "baf";
  const overviewData: {
    region: string;
    position: number[];
    value: number[];
    zoom: string | null;
  }[] = await get(
    new URL(`samples/sample/${dataType}/overview`, apiURI).href,
    query,
  );

  const dataPerChrom: Record<string, ApiCoverageDot[]> = {};

  overviewData.forEach((element) => {
    if (dataPerChrom[element.region] === undefined) {
      dataPerChrom[element.region] = [];
    }
    const points: ApiCoverageDot[] = zip(element.position, element.value).map(
      (xy) => {
        return {
          pos: xy[0],
          value: xy[1],
        };
      },
    );
    dataPerChrom[element.region] = points;
  });

  return dataPerChrom;
}
