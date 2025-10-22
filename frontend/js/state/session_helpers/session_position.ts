import { zoomIn, zoomOut } from "../../util/navigation";

export class SessionPosition {
  private chromosome: Chromosome;
  private start: number;
  private end: number;
  private chromSizes: Record<Chromosome, number>;
  private chromInfo: Record<Chromosome, ChromosomeInfo>;

  constructor(
    chromosome: Chromosome,
    start: number,
    end: number,
    chromSizes: Record<Chromosome, number>,
    chromInfo: Record<Chromosome, ChromosomeInfo>,
  ) {
    this.chromosome = chromosome;
    this.start = start;
    this.end = end;
    this.chromSizes = chromSizes;
    this.chromInfo = chromInfo;
  }

  public zoomIn(): void {
    const currXRange = this.getXRange();
    const newXRange = zoomIn(currXRange);
    this.setViewRange(newXRange);
  }

  public zoomOut(): void {
    const newXRange = zoomOut(this.getXRange(), this.getCurrentChromSize());
    this.setViewRange(newXRange);
  }

  public getXRange(): Rng {
    return [this.start, this.end] as Rng;
  }

  public setViewRange(range: Rng): void {
    this.start = range[0];
    this.end = range[1];
  }

  public getRegion(): Region {
    return {
      chrom: this.chromosome,
      start: this.start,
      end: this.end,
    };
  }

  public setChromosome(chrom: Chromosome, range: Rng = null) {
    this.chromosome = chrom;

    const start = range != null ? range[0] : 1;
    const end = range != null ? range[1] : this.chromSizes[chrom];

    this.start = start;
    this.end = end;
  }

  public updatePosition(range: Rng): void {
    this.start = range[0];
    this.end = range[1];
  }

  public getChromosome(): Chromosome {
    return this.chromosome;
  }

  public getChrSegments(): [string, string] {
    const startPos = this.start;
    const endPos = this.end;

    const currChromInfo = this.chromInfo[this.chromosome];

    const startBand = currChromInfo.bands.find(
      (band) => band.start <= startPos && band.end >= startPos,
    );

    const endBand = currChromInfo.bands.find(
      (band) => band.start <= endPos && band.end >= endPos,
    );

    return [startBand.id, endBand.id];
  }

  // FIXME: Should be in data sources instead perhaps?
  public getChromSize(chrom: string): number {
    return this.chromSizes[chrom];
  }

  public getChromSizes(): Record<string, number> {
    return this.chromSizes;
  }

  public getCurrentChromSize(): number {
    return this.chromSizes[this.chromosome];
  }

  /**
   * Distance can be negative
   */
  public moveXRange(distance: number): void {
    const startRange = this.getXRange();
    const chromSize = this.getCurrentChromSize();
    const newRange: Rng = [
      Math.max(0, Math.floor(startRange[0] + distance)),
      Math.min(Math.floor(startRange[1] + distance), chromSize),
    ];
    this.setViewRange(newRange);
  }
}
