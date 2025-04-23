import { get } from "../util/fetch";
import { CHROMOSOMES } from "../constants";
import { zip } from "../util/utils";

export class API {
  sampleId: string;
  caseId: string;
  genomeBuild: number;
  apiURI: string;

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

  async getAnnotationSources(): Promise<ApiAnnotationTrack[]> {
    const annotSources = (await get(
      new URL("/tracks/annotations", this.apiURI).href,
      {
        genome_build: this.genomeBuild,
      },
    )) as ApiAnnotationTrack[];
    return annotSources;
  }

  private annotsPerChromCache: Record<string, Record<string, ApiSimplifiedAnnotation[]>> = {};
  async getAnnotations(trackId: string, chrom: string): Promise<ApiSimplifiedAnnotation[]> {
    const isCached = this.annotsPerChromCache[chrom] && this.annotsPerChromCache[trackId];
    if (!isCached) {
      if (this.annotsPerChromCache[trackId] === undefined) {
        this.annotsPerChromCache[trackId] = {};
      }

      const query = {};
      const annotations = await get(
        new URL(`tracks/annotations/${trackId}`, this.apiURI).href,
        query,
      ) as ApiSimplifiedAnnotation[];

      const annotsPerChrom: Record<string, ApiSimplifiedAnnotation[]> = {};
      annotations.forEach((annot) => {
        if (annotsPerChrom[annot.chrom] === undefined) {
          annotsPerChrom[annot.chrom] = [];
        }
        annotsPerChrom[annot.chrom].push(annot);
      })

      this.annotsPerChromCache[trackId] = annotsPerChrom;
    }
    return this.annotsPerChromCache[trackId][chrom];
  }

  private covCache: Record<string, ApiCoverageDot[]> = {};
  async getCov(chrom: string): Promise<ApiCoverageDot[]> {
    const isCached = this.covCache[chrom] !== undefined;
    if (!isCached) {
      const query = {
        sample_id: this.sampleId,
        case_id: this.caseId,
        chromosome: chrom,
        start: 1,
      };

      const regionResult: { position: number[]; value: number[] } = await get(
        new URL(`samples/sample/coverage`, this.apiURI).href,
        query,
      );

      const renderData: ApiCoverageDot[] = zip(
        regionResult.position,
        regionResult.value,
      ).map(([pos, val]) => {
        return {
          pos: pos,
          value: val,
        };
      });

      this.covCache[chrom] = renderData;
    }
    return this.covCache[chrom];
  }

  private bafCache: Record<string, ApiCoverageDot[]> = {};
  async getBaf(chrom: string): Promise<ApiCoverageDot[]> {
    const isCached = this.bafCache[chrom] !== undefined;
    if (!isCached) {
      const query = {
        sample_id: this.sampleId,
        case_id: this.caseId,
        chromosome: chrom,
        start: 1,
      };

      const regionResult: { position: number[]; value: number[] } = await get(
        new URL(`samples/sample/baf`, this.apiURI).href,
        query,
      );

      const renderData: ApiCoverageDot[] = zip(
        regionResult.position,
        regionResult.value,
      ).map(([pos, val]) => {
        return {
          pos: pos,
          value: val,
        };
      });

      this.bafCache[chrom] = renderData;
    }
    return this.bafCache[chrom];
  }

  private transcriptCache: Record<string, ApiSimplifiedTranscript[]> = {};
  async getTranscripts(
    chrom: string,
    maneOnly: boolean,
  ): Promise<ApiSimplifiedTranscript[]> {
    const isCached = this.transcriptCache[chrom] !== undefined;
    if (!isCached) {
      const query = {
        chromosome: chrom,
        genome_build: 38,
      };
      const transcripts = (await get(
        new URL("/tracks/transcripts", this.apiURI).href,
        query,
      )) as ApiSimplifiedTranscript[];

      if (maneOnly) {
        this.transcriptCache[chrom] = transcripts.filter(
          (tr) => tr.type == "MANE Select",
        );
      } else {
        this.transcriptCache[chrom] = transcripts;
      }
    }
    return this.transcriptCache[chrom];
  }

  private variantsCache: Record<string, ApiVariant[]> = {};
  async getVariants(chrom: string): Promise<ApiVariant[]> {
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
      const variants = await get(url, query);
      this.variantsCache[chrom] = variants;
    }
    return this.variantsCache[chrom];
  }

  private chromCache: Record<string, ChromosomeInfo> = {};
  async getChromData(chrom: string): Promise<ChromosomeInfo> {
    const isCached = this.chromCache[chrom] !== undefined;
    if (!isCached) {
      const chromosomeInfo = (await get(
        new URL(`tracks/chromosomes/${chrom}`, this.apiURI).href,
        {
          genome_build: this.genomeBuild,
        },
      )) as ChromosomeInfo;

      this.chromCache[chrom] = chromosomeInfo;
    }
    return this.chromCache[chrom];
  }

  // FIXME: This would be better as a single request I think
  async getAllChromData(): Promise<Record<string, ChromosomeInfo>> {
    await Promise.all(
      CHROMOSOMES.map(async (chrom) => {
        if (this.chromCache[chrom] === undefined) {
          const chromosomeInfo = (await get(
            new URL(`tracks/chromosomes/${chrom}`, this.apiURI).href,
            {
              genome_build: this.genomeBuild,
            },
          )) as ChromosomeInfo;

          this.chromCache[chrom] = chromosomeInfo;
        }
      }),
    );
    return this.chromCache;
  }

  private overviewCovCache: Record<string, ApiCoverageDot[]> = null;
  async getOverviewCovData(): Promise<Record<string, ApiCoverageDot[]>> {
    if (this.overviewCovCache === null) {
      this.overviewCovCache = await getOverviewData(
        this.sampleId,
        this.caseId,
        "cov",
        this.apiURI,
      );
    }
    return this.overviewCovCache;
  }

  private overviewBafCache: Record<string, ApiCoverageDot[]> = null;
  async getOverviewBafData(): Promise<Record<string, ApiCoverageDot[]>> {
    if (this.overviewBafCache === null) {
      this.overviewBafCache = await getOverviewData(
        this.sampleId,
        this.caseId,
        "baf",
        this.apiURI,
      );
    }
    return this.overviewBafCache;
  }
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
