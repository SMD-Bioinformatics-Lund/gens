import {
  getAnnotationData,
  getSVVariantData,
  getTranscriptData,
  getIdeogramData as getChromosomeData,
  getOverviewData,
  getDotData,
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

  private annotCache: Record<string, Record<string, RenderBand[]>> = {};
  async getAnnotations(chrom: string, source: string): Promise<RenderBand[]> {
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

  private covCache: Record<string, RenderDot[]> = {};
  async getCov(chrom: string): Promise<RenderDot[]> {
    const isCached = this.covCache[chrom] !== undefined;
    if (!isCached) {
      this.covCache[chrom] = await getDotData(
        this.sampleId,
        this.caseId,
        chrom,
        "cov",
        this.apiURL,
      );
    }
    return this.covCache[chrom];
  }

  private bafCache: Record<string, RenderDot[]> = {};
  async getBaf(chrom: string): Promise<RenderDot[]> {
    const isCached = this.bafCache[chrom] !== undefined;
    if (!isCached) {
      this.bafCache[chrom] = await getDotData(
        this.sampleId,
        this.caseId,
        chrom,
        "baf",
        this.apiURL,
      );
    }
    return this.bafCache[chrom];
  }

  private transcriptCache: Record<string, RenderBand[]> = {};
  async getTranscripts(chrom: string): Promise<RenderBand[]> {
    const isCached = this.transcriptCache[chrom] !== undefined;
    if (!isCached) {
      this.transcriptCache[chrom] = await getTranscriptData(chrom, this.apiURL);
    }
    return this.transcriptCache[chrom];
  }

  private variantsCache: Record<string, RenderBand[]> = null;
  async getVariants(chrom: string): Promise<RenderBand[]> {
    const isCached = this.variantsCache !== null;
    if (!isCached) {
      this.variantsCache = await getSVVariantData(
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

  private overviewCovCache: Record<string, RenderDot[]> = null;
  async getOverviewCovData(): Promise<Record<string, RenderDot[]>> {
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

  private overviewBafCache: Record<string, RenderDot[]> = null;
  async getOverviewBafData(): Promise<Record<string, RenderDot[]>> {
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
