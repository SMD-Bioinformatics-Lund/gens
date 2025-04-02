export class GensCache {
    private annot_chr_source: Record<
        string,
        Record<string, RenderBand[]>
    > = {};
    isAnnotCached(chr: string, source: string): boolean {
        return (
            this.annot_chr_source[chr] !== undefined &&
            this.annot_chr_source[chr][source] !== undefined
        );
    }
    getAnnotations(chrom: string, source: string): RenderBand[] {
        return this.annot_chr_source[chrom][source];
    }
    setAnnotations(chrom: string, source: string, data: RenderBand[]) {
        if (this.annot_chr_source[chrom] === undefined) {
            this.annot_chr_source[chrom] = {};
        }
        this.annot_chr_source[chrom][source] = data;
    }

    // FIXME: Generalize the caches that are simply chromosome dependent
    private cov_chr: Record<string, RenderDot[]> = {};
    isCovCached(chrom: string): boolean {
        return this.cov_chr[chrom] !== undefined;
    }
    getCov(chrom: string): RenderDot[] {
        return this.cov_chr[chrom];
    }
    setCov(chrom: string, data: RenderDot[]) {
        this.cov_chr[chrom] = data;
    }

    private baf_chr: Record<string, RenderDot[]> = {};
    isBafCached(chrom: string): boolean {
        return this.baf_chr[chrom] !== undefined;
    }
    getBaf(chrom: string): RenderDot[] {
        return this.baf_chr[chrom];
    }
    setBaf(chrom: string, data: RenderDot[]) {
        this.baf_chr[chrom] = data;
    }

    private transcript_chr: Record<string, RenderBand[]> = {};
    isTranscriptsCached(chrom: string): boolean {
        return this.transcript_chr[chrom] !== undefined;
    }
    getTranscripts(chrom: string): RenderBand[] {
        return this.transcript_chr[chrom];
    }
    setTranscripts(chrom: string, data: RenderBand[]) {
        this.transcript_chr[chrom] = data;
    }

    private variants_chr: Record<string, RenderBand[]> = {};
    isVariantsCached(chrom: string): boolean {
        return this.variants_chr[chrom] !== undefined;
    }
    getVariants(chrom: string): RenderBand[] {
        return this.variants_chr[chrom];
    }
    setVariants(chrom: string, data: RenderBand[]) {
        this.variants_chr[chrom] = data;
    }
}
