import { CHROMOSOMES, IDB_CACHE } from "../constants";
import { get } from "../util/fetch";
import { idbGet, idbSet } from "../util/indexeddb";
import { getSampleKey, zip } from "../util/utils";

// Data for these are loaded up front for the full chromosome
// Remaining zoom levels (up to "d") are loaded dynamically and
// only for the points currently in view
const CACHED_ZOOM_LEVELS = ["o", "a", "b", "c"];

// FIXME: This will need to be made configurable eventually
const DEFAULT_VARIANT_CATEGORY = "sv";
const DEFAULT_VARIANT_SUB_CATEGORIES = [
  "del",
  "dup",
  "tdup",
  "ins",
  "inv",
  "cnv",
  "bnd",
];
const ZOOM_WINDOW_CACHE_MULTIPLIER = 5;

export class API {
  genomeBuild: number;
  apiURI: string;

  private allChromData: Record<Chromosome, ChromosomeInfo> = {} as Record<
    Chromosome,
    ChromosomeInfo
  >;

  getChromSizes(): Record<Chromosome, number> {
    if (this.allChromData == null) {
      throw Error(
        "API.initialize must be called and awaited before accessing the chromosome sizes",
      );
    }

    const allChromSizes = {} as Record<Chromosome, number>;
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
    const urlWithTrailingSlash = gensApiURL.endsWith("/")
      ? gensApiURL
      : `${gensApiURL}/`;
    this.apiURI = urlWithTrailingSlash;
  }

  async initialize() {
    for (const chrom of CHROMOSOMES) {
      const chromInfo = await this.getChromData(chrom);
      this.allChromData[chrom] = chromInfo;
    }
  }

  getSearchResult(
    query: string,
    annotationTrackIds: string[],
  ): Promise<ApiSearchResult | null> {
    console.log(this.apiURI);
    const params = {
      q: query,
      genome_build: this.genomeBuild,
      annotation_track_ids: annotationTrackIds.join(","),
    };

    const details = get(
      new URL(`search/result`, this.apiURI).href,
      params,
    ).then((result) => {
      if (result === null) {
        return null;
      }
      if (result["chromosome"] != null) {
        return result;
      }
      return null;
    });
    return details;
  }

  getAnnotationDetails(id: string): Promise<ApiAnnotationDetails> {
    const details = get(
      new URL(`tracks/annotations/record/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiAnnotationDetails>;
    return details;
  }

  getTranscriptDetails(id: string): Promise<ApiGeneDetails> {
    const details = get(
      new URL(`tracks/transcripts/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiGeneDetails>;
    return details;
  }

  async getVariantDetails(id: string): Promise<ApiVariantDetails> {
    const details = get(
      new URL(`tracks/variants/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiVariantDetails>;
    return details;
  }

  getAnnotationSources(): Promise<ApiAnnotationTrack[]> {
    const annotSources = get(new URL("tracks/annotations", this.apiURI).href, {
      genome_build: this.genomeBuild,
    }) as Promise<ApiAnnotationTrack[]>;
    return annotSources;
  }

  getGeneLists(): Promise<ApiGeneList[]> {
    const geneLists = get(
      new URL("gene_lists", this.apiURI).href,
      {},
    ) as Promise<ApiGeneList[]>;
    return geneLists;
  }

  getGeneListGenes(panelId: string, chromosome: string): Promise<string[]> {
    const geneSymbols = get(
      new URL(`gene_lists/track/${panelId}`, this.apiURI).href,
      { chromosome, genome_build: this.genomeBuild },
    ) as Promise<string[]>;
    return geneSymbols;
  }

  getSampleAnnotationSources(
    id: SampleIdentifier,
  ): Promise<ApiSampleAnnotationTrack[]> {
    const query = {
      case_id: id.caseId,
      sample_id: id.sampleId,
      genome_build: id.genomeBuild,
    };
    const sources = get(
      new URL("sample-tracks/annotations", this.apiURI).href,
      query,
    ).then((result) => {
      if (result == null) {
        return [];
      }
      // FIXME: Temporary solution. Fix this backend.
      return result.map((source) => {
        source.track_id = source._id;
        return source;
      });
    });
    return sources;
  }

  private sampleAnnotsCache: Record<
    string,
    Record<string, Promise<ApiSimplifiedAnnotation[]>>
  > = {};
  getSampleAnnotations(
    trackId: string,
    chromosome: string,
  ): Promise<ApiSimplifiedAnnotation[]> {
    if (this.sampleAnnotsCache[trackId] === undefined) {
      this.sampleAnnotsCache[trackId] = {};
    }

    if (this.sampleAnnotsCache[trackId][chromosome] === undefined) {
      const annotations = get(
        new URL(`sample-tracks/annotations/track/${trackId}`, this.apiURI).href,
        { chromosome },
      ) as Promise<ApiSimplifiedAnnotation[]>;
      this.sampleAnnotsCache[trackId][chromosome] = annotations;
    }
    return this.sampleAnnotsCache[trackId][chromosome];
  }

  getSampleAnnotationDetails(id: string): Promise<ApiSampleAnnotationDetails> {
    const details = get(
      new URL(`sample-tracks/annotations/record/${id}`, this.apiURI).href,
      {},
    ) as Promise<ApiSampleAnnotationDetails>;
    return details;
  }

  private annotsCache: Record<string, Promise<ApiSimplifiedAnnotation[]>> = {};
  getAnnotations(trackId: string): Promise<ApiSimplifiedAnnotation[]> {
    if (this.annotsCache[trackId] === undefined) {
      const query = {};
      const annotations = get(
        new URL(`tracks/annotations/track/${trackId}`, this.apiURI).href,
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
  private covSampleDWindowCache: Record<
    string,
    Record<string, { range: Rng; promise: Promise<ApiCoverageDot[]> }>
  > = {};
  getCov(
    id: SampleIdentifier,
    chrom: string,
    zoom: string,
    xRange: Rng,
  ): Promise<ApiCoverageDot[]> {
    const endpoint = "samples/sample/coverage";
    const sampleKey = getSampleKey(id);

    if (this.covSampleChrZoomCache[sampleKey] == null) {
      this.covSampleChrZoomCache[sampleKey] = {};
    }

    if (CACHED_ZOOM_LEVELS.includes(zoom)) {
      const chromIsCached =
        this.covSampleChrZoomCache[sampleKey][chrom] !== undefined;

      if (!chromIsCached) {
        this.covSampleChrZoomCache[sampleKey][chrom] = {};
      }

      const zoomIsCached =
        this.covSampleChrZoomCache[sampleKey][chrom][zoom] !== undefined;

      if (!zoomIsCached) {
        this.covSampleChrZoomCache[sampleKey][chrom][zoom] = getCovData(
          this.apiURI,
          endpoint,
          id.sampleId,
          id.caseId,
          id.genomeBuild,
          chrom,
          zoom,
          [1, this.getChromSizes()[chrom]],
        );
      }
      return this.covSampleChrZoomCache[sampleKey][chrom][zoom];
    } else {
      // Zoom D level
      // FIXME: This should be generalized to be configurable

      if (this.covSampleDWindowCache[sampleKey] == null) {
        this.covSampleDWindowCache[sampleKey] = {};
      }

      const cached = this.covSampleDWindowCache[sampleKey][chrom];
      const withinCache =
        cached !== undefined &&
        xRange[0] >= cached.range[0] &&
        xRange[1] <= cached.range[1];

      if (withinCache) {
        return cached.promise.then((data) => filterRange(data, xRange));
      }

      const extended = expandRange(
        xRange,
        ZOOM_WINDOW_CACHE_MULTIPLIER,
        this.getChromSizes()[chrom],
      );

      const promise = getCovData(
        this.apiURI,
        endpoint,
        id.sampleId,
        id.caseId,
        id.genomeBuild,
        chrom,
        zoom,
        extended,
      );

      this.covSampleDWindowCache[sampleKey][chrom] = {
        range: extended,
        promise,
      };

      return promise.then((data) => filterRange(data, xRange));
    }
  }

  private bafSampleZoomChrCache: Record<
    string,
    Record<string, Record<string, Promise<ApiCoverageDot[]>>>
  > = {};
  private bafSampleDWindowCache: Record<
    string,
    Record<string, { range: Rng; promise: Promise<ApiCoverageDot[]> }>
  > = {};
  getBaf(
    id: SampleIdentifier,
    chrom: string,
    zoom: string,
    xRange: Rng,
  ): Promise<ApiCoverageDot[]> {
    const endpoint = "samples/sample/baf";
    const sampleKey = getSampleKey(id);

    if (this.bafSampleZoomChrCache[sampleKey] == null) {
      this.bafSampleZoomChrCache[sampleKey] = {};
    }

    if (CACHED_ZOOM_LEVELS.includes(zoom)) {
      const chrIsCached =
        this.bafSampleZoomChrCache[sampleKey][chrom] !== undefined;
      if (!chrIsCached) {
        this.bafSampleZoomChrCache[sampleKey][chrom] = {};
      }

      const zoomIsCached =
        this.bafSampleZoomChrCache[sampleKey][chrom][zoom] !== undefined;

      if (!zoomIsCached) {
        this.bafSampleZoomChrCache[sampleKey][chrom][zoom] = getCovData(
          this.apiURI,
          endpoint,
          id.sampleId,
          id.caseId,
          id.genomeBuild,
          chrom,
          zoom,
          [1, this.getChromSizes()[chrom]],
        );
      }
      return this.bafSampleZoomChrCache[sampleKey][chrom][zoom];
    } else {
      if (this.bafSampleDWindowCache[sampleKey] == null) {
        this.bafSampleDWindowCache[sampleKey] = {};
      }

      const cached = this.bafSampleDWindowCache[sampleKey][chrom];
      const withinCache =
        cached !== undefined &&
        xRange[0] >= cached.range[0] &&
        xRange[1] <= cached.range[1];

      if (withinCache) {
        return cached.promise.then((data) => filterRange(data, xRange));
      }

      const extended = expandRange(
        xRange,
        ZOOM_WINDOW_CACHE_MULTIPLIER,
        this.getChromSizes()[chrom],
      );

      const promise = getCovData(
        this.apiURI,
        endpoint,
        id.sampleId,
        id.caseId,
        id.genomeBuild,
        chrom,
        zoom,
        extended,
      );

      this.bafSampleDWindowCache[sampleKey][chrom] = {
        range: extended,
        promise,
      };
      return promise.then((data) => filterRange(data, xRange));
    }
  }

  private transcriptUpdateTimestamp: string | null = null;
  private async getTranscriptUpdateTimestamp(): Promise<string | null> {
    if (this.transcriptUpdateTimestamp != null) {
      return this.transcriptUpdateTimestamp;
    }
    const resp = (await get(new URL("tracks/updates", this.apiURI).href, {
      track: "transcripts",
    })) as { track: string; timestamp: string | null };
    this.transcriptUpdateTimestamp = resp ? resp.timestamp : null;
    return this.transcriptUpdateTimestamp;
  }

  private transcriptCache: Record<string, Promise<ApiSimplifiedTranscript[]>> =
    {};
  getTranscripts(
    chrom: string,
    onlyCanonical: boolean,
  ): Promise<ApiSimplifiedTranscript[]> {
    const cacheKey = `${this.genomeBuild}|${chrom}|${onlyCanonical ? 1 : 0}`;

    if (this.transcriptCache[cacheKey] !== undefined) {
      return this.transcriptCache[cacheKey];
    }

    const promise = (async () => {
      const serverTs = await this.getTranscriptUpdateTimestamp();
      const cached = await idbGet<IDBTranscripts>(
        IDB_CACHE.dbName,
        IDB_CACHE.transcriptsStore,
        cacheKey,
      );
      if (cached != null && Array.isArray(cached.transcripts)) {
        if (serverTs == null) {
          return cached.transcripts as ApiSimplifiedTranscript[];
        }
        if (cached.serverTimestamp === serverTs) {
          return cached.transcripts as ApiSimplifiedTranscript[];
        }
      }

      const query = {
        chromosome: chrom,
        genome_build: this.genomeBuild,
        only_canonical: onlyCanonical,
      };
      const transcripts = (await get(
        new URL("tracks/transcripts", this.apiURI).href,
        query,
      )) as ApiSimplifiedTranscript[];

      await idbSet(IDB_CACHE.dbName, IDB_CACHE.transcriptsStore, cacheKey, {
        transcripts,
        serverTimestamp: serverTs,
        cachedAt: new Date().toISOString(),
      });

      return transcripts;
    })();

    this.transcriptCache[cacheKey] = promise;
    return promise;
  }
  
  private cachedThreshold: number;
  private variantsSampleChromCache: Record<
    string,
    Record<string, Promise<ApiSimplifiedVariant[]>>
  > = {};
  getVariants(
    // Sample instead of SampleIdf to retrieve sample type
    // Later likely an analysis type should be used (i.e. constitutional vs somatic)
    sample: Sample,
    chrom: string,
    rank_score_threshold: number,
  ): Promise<ApiSimplifiedVariant[]> {
    const sampleKey = getSampleKey(sample);
    const selectedCategory = getScoutVariantCategory(sample.sampleType);
    const categoryChromCacheKey = `${selectedCategory}:${chrom}`;

    // Invalidate cache if changing the rank score threshold
    if (this.cachedThreshold != rank_score_threshold) {
      this.cachedThreshold = rank_score_threshold;
      this.variantsSampleChromCache = {};
    }

    if (this.variantsSampleChromCache[sampleKey] == null) {
      this.variantsSampleChromCache[sampleKey] = {};
    }

    const isCached =
      this.variantsSampleChromCache[sampleKey][categoryChromCacheKey] !==
      undefined;
    if (!isCached) {
      // Note: The genome build is ignored when running this
      // with a Scout backend
      const query = {
        sample_id: sample.sampleId,
        case_id: sample.caseId,
        genome_build: sample.genomeBuild,
        chromosome: chrom,
        category: selectedCategory,
        start: 1,
        rank_score_threshold,
        sub_categories: DEFAULT_VARIANT_SUB_CATEGORIES,
      };
      const url = new URL("tracks/variants", this.apiURI).href;
      const variants = get(url, query) as Promise<ApiSimplifiedVariant[]>;
      this.variantsSampleChromCache[sampleKey][categoryChromCacheKey] = variants;
    }
    return this.variantsSampleChromCache[sampleKey][categoryChromCacheKey];
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
    id: SampleIdentifier,
  ): Promise<Record<string, ApiCoverageDot[]>> {
    const sampleKey = getSampleKey(id);

    if (this.overviewSampleCovCache[sampleKey] == null) {
      this.overviewSampleCovCache[sampleKey] = getOverviewData(
        id.sampleId,
        id.caseId,
        id.genomeBuild,
        "cov",
        this.apiURI,
      );
    }

    return this.overviewSampleCovCache[sampleKey];
  }

  private overviewBafCache: Record<
    string,
    Promise<Record<string, ApiCoverageDot[]>>
  > = {};
  getOverviewBafData(
    id: SampleIdentifier,
  ): Promise<Record<string, ApiCoverageDot[]>> {
    const sampleKey = getSampleKey(id);

    if (this.overviewBafCache[sampleKey] == null) {
      this.overviewBafCache[sampleKey] = getOverviewData(
        id.sampleId,
        id.caseId,
        id.genomeBuild,
        "baf",
        this.apiURI,
      );
    }
    return this.overviewBafCache[sampleKey];
  }

  getSample(id: SampleIdentifier): Promise<ApiSample> {
    const query = {
      sample_id: id.sampleId,
      case_id: id.caseId,
      genome_build: id.genomeBuild,
    };
    return get(
      new URL("samples/sample", this.apiURI).href,
      query,
    ) as Promise<ApiSample>;
  }
}

function expandRange(range: Rng, factor: number, chromSize: number): Rng {
  const width = range[1] - range[0];
  const halfExtra = Math.floor((width * factor - width) / 2);
  const start = Math.max(1, range[0] - halfExtra);
  const end = Math.min(chromSize, range[1] + halfExtra);
  return [start, end];
}

function filterRange(data: ApiCoverageDot[], range: Rng): ApiCoverageDot[] {
  return data.filter((d) => d.pos >= range[0] && d.pos <= range[1]);
}

async function getCovData(
  apiURI: string,
  endpoint: string,
  sampleId: string,
  caseId: string,
  genomeBuild: number,
  chrom: string,
  zoom: string,
  range: Rng,
): Promise<ApiCoverageDot[]> {
  const query = {
    sample_id: sampleId,
    case_id: caseId,
    genome_build: genomeBuild,
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

async function getOverviewData(
  sampleId: string,
  caseId: string,
  genomeBuild: number,
  covOrBaf: "cov" | "baf",
  apiURI: string,
): Promise<Record<string, ApiCoverageDot[]>> {
  const query = {
    sample_id: sampleId,
    case_id: caseId,
    genome_build: genomeBuild,
    cov_or_baf: covOrBaf,
  };

  const dataType = covOrBaf == "cov" ? "coverage" : "baf";

  type OverviewData = {
    region: string;
    position: number[];
    value: number[];
    zoom: string | null;
  };

  const overviewData: OverviewData[] = await get(
    new URL(`samples/sample/${dataType}/overview`, apiURI).href,
    query,
  );

  const chromToDataObject: Record<string, OverviewData> = {};
  overviewData.forEach((chromData) => {
    chromToDataObject[chromData.region] = chromData;
  });

  const chromDatapoints: Record<string, ApiCoverageDot[]> = {};
  for (const chrom of CHROMOSOMES) {
    if (chromToDataObject[chrom] == null) {
      chromDatapoints[chrom] = [];
      continue;
    }
    const element = chromToDataObject[chrom];
    const points: ApiCoverageDot[] = zip(element.position, element.value).map(
      (xy) => {
        return {
          pos: xy[0],
          value: xy[1],
        };
      },
    );
    chromDatapoints[element.region] = points;
  }

  return chromDatapoints;
}

function getScoutVariantCategory(sampleType?: string): string {
  const normalizedType = sampleType?.toLowerCase();
  if (normalizedType === "normal" || normalizedType === "tumor") {
    return "cancer_sv";
  }
  return DEFAULT_VARIANT_CATEGORY;
}
