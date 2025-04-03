import {
    getAnnotationDataForChrom,
    getBafData,
    getCovData,
    getSVVariantData,
    getTranscriptData,
    getIdeogramData,
} from "./tmp";

export class GensDb {
    sampleId: string;
    caseId: string;
    genomeBuild: number;
    apiURL: string;

    constructor(sampleId: string, caseId: string, genomeBuild: number, apiURL: string) {
        this.sampleId = sampleId;
        this.caseId = caseId;
        this.genomeBuild = genomeBuild;
        this.apiURL = apiURL;
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

            const annotations = await getAnnotationDataForChrom(chrom, source, this.apiURL);
            this.annotCache[chrom][source] = annotations;
        }
        return this.annotCache[chrom][source];
    }

    private covCache: Record<string, RenderDot[]> = {};
    async getCov(chrom: string): Promise<RenderDot[]> {
        const isCached = this.covCache[chrom] !== undefined;
        if (!isCached) {
            this.covCache[chrom] = await getCovData(
                this.sampleId,
                this.caseId,
                this.apiURL,
                chrom,
            );
        }
        return this.covCache[chrom];
    }

    private bafCache: Record<string, RenderDot[]> = {};
    async getBaf(chrom: string): Promise<RenderDot[]> {
        const isCached = this.bafCache[chrom] !== undefined;
        if (!isCached) {
            this.bafCache[chrom] = await getBafData(
                this.sampleId,
                this.caseId,
                this.apiURL,
                chrom,
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

    private variantsCache: Record<string, RenderBand[]> = {};
    async getVariants(chrom: string): Promise<RenderBand[]> {
        const isCached = this.variantsCache[chrom] !== undefined;
        if (!isCached) {
            this.variantsCache[chrom] = await getSVVariantData(
                this.sampleId,
                this.caseId,
                this.genomeBuild,
                chrom,
            );
        }
        return this.variantsCache[chrom];
    }

    private ideogramCache: Record<string, ChromosomeInfo> = {};
    async getIdeogramData(chrom: string): Promise<ChromosomeInfo> {
        const isCached = this.ideogramCache[chrom] !== undefined;
        if (!isCached) {
            this.ideogramCache[chrom] = await getIdeogramData(chrom, this.genomeBuild, this.apiURL);
        }
        return this.ideogramCache[chrom];
    }
}
