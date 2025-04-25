import { get } from "../util/fetch";
import { CHROMOSOMES } from "../constants";
import { zip } from "../util/utils";

export class API {
  sampleId: string;
  caseId: string;
  genomeBuild: number;
  apiURI: string;
  // Data for these are loaded up front for the full chromosome
  // Remaining zoom levels (up to "d") are loaded dynamically and
  // only for the points currently in view
  cachedZoomLevels = ["o", "a", "b"];

  constructor(
    sampleId: string,
    caseId: string,
    genomeBuild: number,
    gensApiURL: string,
  ) {
    this.sampleId = sampleId;
    this.caseId = caseId;
    this.genomeBuild = genomeBuild;
    this.apiURI = gensApiURL;
  }

  getAnnotationDetails(id: string): Promise<ApiAnnotationDetails> {
    const details = get(
      new URL(`tracks/annotations/annotation/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiAnnotationDetails>;
    return details;
  }

  getTranscriptDetails(id: string): Promise<ApiTranscriptDetails> {
    const details = get(
      new URL(`tracks/transcripts/transcript/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiTranscriptDetails>;
    return details;
  }

  // FIXME: This is a temporary solution. Should really be a detail endpoint in the
  // backend similarly to the transcripts and the annotations
  async getVariantDetails(id: string, currChrom: string): Promise<ApiVariantDetails> {
    const variants = await this.getVariants(currChrom);
    const targets = variants.filter((v) => v.variant_id === id);
    // const targets = variants.filter((var) => var.id === id);
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

    console.log("Returning from cache", this.annotsCache);
    return this.annotsCache[trackId];
  }

  /**
   * Calculate base zoom levels up front
   * Return detailed zoom levels only on demand
   */
  private covChrZoomCache: Record<
    string,
    Record<string, Promise<ApiCoverageDot[]>>
  > = {};
  getCov(chrom: string, zoom: string, xRange: Rng): Promise<ApiCoverageDot[]> {
    const endpoint = "samples/sample/coverage";

    if (this.cachedZoomLevels.includes(zoom)) {
      const chrIsCached = this.covChrZoomCache[chrom] !== undefined;
      if (!chrIsCached) {
        this.covChrZoomCache[chrom] = getDataPerZoom(
          chrom,
          this.cachedZoomLevels,
          endpoint,
          this.sampleId,
          this.caseId,
          this.apiURI,
        );
      }
      return this.covChrZoomCache[chrom][zoom];
    } else {
      return getCovData(
        this.apiURI,
        endpoint,
        this.sampleId,
        this.caseId,
        chrom,
        zoom,
        xRange,
      );
    }
  }

  private bafCache: Record<string, Record<string, Promise<ApiCoverageDot[]>>> =
    {};
  getBaf(chrom: string, zoom: string, xRange: Rng): Promise<ApiCoverageDot[]> {
    const endpoint = "samples/sample/baf";

    if (this.cachedZoomLevels.includes(zoom)) {
      const chrIsCached = this.bafCache[chrom] !== undefined;
      if (!chrIsCached) {
        this.bafCache[chrom] = getDataPerZoom(
          chrom,
          this.cachedZoomLevels,
          endpoint,
          this.sampleId,
          this.caseId,
          this.apiURI,
        );
      }
      return this.bafCache[chrom][zoom];
    } else {
      return getCovData(
        this.apiURI,
        endpoint,
        this.sampleId,
        this.caseId,
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
        genome_build: 38,
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

  private variantsCache: Record<string, Promise<ApiVariantDetails[]>> = {};
  getVariants(chrom: string): Promise<ApiVariantDetails[]> {
    const isCached = this.variantsCache[chrom] !== undefined;
    if (!isCached) {
      const query = {
        sample_id: this.sampleId,
        case_id: this.caseId,
        chromosome: chrom,
        category: "sv",
        start: 1,
      };
      const url = new URL("tracks/variants", this.apiURI).href;
      const variants = get(url, query);
      this.variantsCache[chrom] = variants;
    }
    return this.variantsCache[chrom];
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

  private overviewCovCache: Promise<Record<string, ApiCoverageDot[]>> = null;
  getOverviewCovData(): Promise<Record<string, ApiCoverageDot[]>> {
    if (this.overviewCovCache === null) {
      this.overviewCovCache = getOverviewData(
        this.sampleId,
        this.caseId,
        "cov",
        this.apiURI,
      );
    }
    return this.overviewCovCache;
  }

  private overviewBafCache: Promise<Record<string, ApiCoverageDot[]>> = null;
  getOverviewBafData(): Promise<Record<string, ApiCoverageDot[]>> {
    if (this.overviewBafCache === null) {
      this.overviewBafCache = getOverviewData(
        this.sampleId,
        this.caseId,
        "baf",
        this.apiURI,
      );
    }
    return this.overviewBafCache;
  }
}

async function getCovData(
  apiURI: string,
  endpoint: string,
  sampleId: string,
  caseId: string,
  chrom: string,
  zoom: string,
  range?: Rng,
): Promise<ApiCoverageDot[]> {
  let query;
  if (range != null) {
    query = {
      sample_id: sampleId,
      case_id: caseId,
      chromosome: chrom,
      zoom_level: zoom,
      start: range[0],
      end: range[1],
    };
  } else {
    query = {
      sample_id: sampleId,
      case_id: caseId,
      chromosome: chrom,
      zoom_level: zoom,
      start: 1,
    };
  }

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
