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

    private annot_chr_source: Record<string, Record<string, RenderBand[]>> = {};
    async getAnnotations(chrom: string, source: string): Promise<RenderBand[]> {
        const isCached =
            this.annot_chr_source[chrom] !== undefined &&
            this.annot_chr_source[chrom][source] !== undefined;
        if (!isCached) {
            const annotations = await getAnnotationDataForChrom(chrom, source);
            this.annot_chr_source[chrom][source] = annotations;
        }
        return this.annot_chr_source[chrom][source];
    }

    private cov_chr: Record<string, RenderDot[]> = {};
    async getCov(chrom: string): Promise<RenderDot[]> {
        const isCached = this.cov_chr[chrom] !== undefined;
        if (!isCached) {
            this.cov_chr[chrom] = await getCovData(
                this.sampleId,
                this.caseId,
                chrom,
            );
        }
        return this.cov_chr[chrom];
    }

    private baf_chr: Record<string, RenderDot[]> = {};
    async getBaf(chrom: string): Promise<RenderDot[]> {
        const isCached = this.baf_chr[chrom] !== undefined;
        if (!isCached) {
            this.baf_chr[chrom] = await getBafData(
                this.sampleId,
                this.caseId,
                chrom,
            );
        }
        return this.baf_chr[chrom];
    }

    private transcript_chr: Record<string, RenderBand[]> = {};
    async getTranscripts(chrom: string): Promise<RenderBand[]> {
        const isCached = this.transcript_chr[chrom] !== undefined;
        if (!isCached) {
            this.transcript_chr[chrom] = await getTranscriptData(chrom);
        }
        return this.transcript_chr[chrom];
    }

    private variants_chr: Record<string, RenderBand[]> = {};
    async getVariants(chrom: string): Promise<RenderBand[]> {
        const isCached = this.variants_chr[chrom] !== undefined;
        if (!isCached) {
            this.variants_chr[chrom] = await getSVVariantData(
                this.sampleId,
                this.caseId,
                this.genomeBuild,
                chrom,
            );
        }
        return this.variants_chr[chrom];
    }
}
