export class GensSession {

    chromosome: string;
    start: number;
    end: number;

    constructor(chromosome: string, start: number, end: number) {
        this.chromosome = chromosome;
        this.start = start;
        this.end = end;
    }

    setChromosome(chrom: string) {
        this.chromosome = chrom;
    }
}