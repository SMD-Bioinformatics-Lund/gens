import {
    getAnnotationDataForChrom,
    getBafData,
    getCovData,
    getSVVariantData,
    getTranscriptData,
} from "./tmp";

export class GensDb {
    sampleId: string;
    caseId: string;
    genomeBuild: number;

    constructor(sampleId: string, caseId: string, genomeBuild: number) {
        this.sampleId = sampleId;
        this.caseId = caseId;
        this.genomeBuild = genomeBuild;
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

            const annotations = await getAnnotationDataForChrom(chrom, source);
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
                chrom,
            );
        }
        return this.bafCache[chrom];
    }

    private transcriptCache: Record<string, RenderBand[]> = {};
    async getTranscripts(chrom: string): Promise<RenderBand[]> {
        const isCached = this.transcriptCache[chrom] !== undefined;
        if (!isCached) {
            this.transcriptCache[chrom] = await getTranscriptData(chrom);
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
}
