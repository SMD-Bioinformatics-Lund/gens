import {
  getAnnotationData,
  getChromToSVs,
  getTranscriptData,
  getIdeogramData as getChromosomeData,
  getOverviewData,
  getCoverage,
} from "./requests";
import { CHROMOSOME_NAMES } from "../util/constants";

export class GensAPI {
  sampleId: string;
  caseId: string;
  genomeBuild: number;
  apiURL: string;

  constructor(
    sampleId: string,
    caseId: string,
    genomeBuild: number,
    gensApiURL: string,
  ) {
    this.sampleId = sampleId;
    this.caseId = caseId;
    this.genomeBuild = genomeBuild;
    this.apiURL = gensApiURL;
  }

  private annotCache: Record<string, Record<string, APIAnnotation[]>> = {};
  async getAnnotations(chrom: string, source: string): Promise<APIAnnotation[]> {
    const isCached =
      this.annotCache[chrom] !== undefined &&
      this.annotCache[chrom][source] !== undefined;
    if (!isCached) {
      if (this.annotCache[chrom] === undefined) {
        this.annotCache[chrom] = {};
      }

      const annotations = await getAnnotationData(chrom, source, this.apiURL);
      this.annotCache[chrom][source] = annotations;
    }
    return this.annotCache[chrom][source];
  }

  private covCache: Record<string, APICoverageDot[]> = {};
  async getCov(chrom: string): Promise<APICoverageDot[]> {
    const isCached = this.covCache[chrom] !== undefined;
    if (!isCached) {
      this.covCache[chrom] = await getCoverage(
        this.sampleId,
        this.caseId,
        chrom,
        "cov",
        this.apiURL,
      );
    }
    return this.covCache[chrom];
  }

  private bafCache: Record<string, APICoverageDot[]> = {};
  async getBaf(chrom: string): Promise<APICoverageDot[]> {
    const isCached = this.bafCache[chrom] !== undefined;
    if (!isCached) {
      this.bafCache[chrom] = await getCoverage(
        this.sampleId,
        this.caseId,
        chrom,
        "baf",
        this.apiURL,
      );
    }
    return this.bafCache[chrom];
  }

  private transcriptCache: Record<string, APITranscript[]> = {};
  async getTranscripts(chrom: string): Promise<APITranscript[]> {
    const isCached = this.transcriptCache[chrom] !== undefined;
    if (!isCached) {
      this.transcriptCache[chrom] = await getTranscriptData(chrom, this.apiURL);
    }
    return this.transcriptCache[chrom];
  }

  private variantsCache: Record<string, APIVariant[]> = null;
  async getVariants(chrom: string): Promise<APIVariant[]> {
    const isCached = this.variantsCache !== null;
    if (!isCached) {
      this.variantsCache = await getChromToSVs(
        this.sampleId,
        this.caseId,
        this.genomeBuild,
        chrom,
        this.apiURL,
      );
    }
    return this.variantsCache[chrom];
  }

  private chromCache: Record<string, ChromosomeInfo> = {};
  async getChromData(chrom: string): Promise<ChromosomeInfo> {
    const isCached = this.chromCache[chrom] !== undefined;
    if (!isCached) {
      this.chromCache[chrom] = await getChromosomeData(
        chrom,
        this.genomeBuild,
        this.apiURL,
      );
    }
    return this.chromCache[chrom];
  }
  // FIXME: This would be better as a single request I think
  async getAllChromData(): Promise<Record<string, ChromosomeInfo>> {
    await Promise.all(
      CHROMOSOME_NAMES.map(async (chrom) => {
        if (this.chromCache[chrom] === undefined) {
          this.chromCache[chrom] = await getChromosomeData(
            chrom,
            this.genomeBuild,
            this.apiURL
          );
        }
      }),
    );
    return this.chromCache;
  }

  private overviewCovCache: Record<string, APICoverageDot[]> = null;
  async getOverviewCovData(): Promise<Record<string, APICoverageDot[]>> {
    if (this.overviewCovCache === null) {
      this.overviewCovCache = await getOverviewData(
        this.sampleId,
        this.caseId,
        "cov",
        this.apiURL
      );
    }
    return this.overviewCovCache;
  }

  private overviewBafCache: Record<string, APICoverageDot[]> = null;
  async getOverviewBafData(): Promise<Record<string, APICoverageDot[]>> {
    if (this.overviewBafCache === null) {
      this.overviewBafCache = await getOverviewData(
        this.sampleId,
        this.caseId,
        "baf",
        this.apiURL
      );
    }
    return this.overviewBafCache;
  }
}
