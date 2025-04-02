export class GensCache {
    private annot_chr_source: Record<
        string,
        Record<string, AnnotationEntry[]>
    > = {};
    isAnnotCached(chr: string, source: string): boolean {
        return (
            this.annot_chr_source[chr] !== undefined &&
            this.annot_chr_source[chr][source] !== undefined
        );
    }
    getAnnotations(chrom: string, source: string): AnnotationEntry[] {
        return this.annot_chr_source[chrom][source];
    }
    setAnnotations(chrom: string, source: string, data: AnnotationEntry[]) {
        if (this.annot_chr_source[chrom] === undefined) {
            this.annot_chr_source[chrom] = {};
        }
        this.annot_chr_source[chrom][source] = data;
    }

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
    getBaf(chrom): RenderDot[] {
        return this.baf_chr[chrom];
    }
    setBaf(chrom: string, data: RenderDot[]) {
        this.baf_chr[chrom] = data;
    }
}
