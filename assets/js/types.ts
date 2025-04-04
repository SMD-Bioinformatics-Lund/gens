interface AnnotationEntry {
  chrom: string,
  color: number[],
  start: number,
  end: number,
  genome_build: number,
  name: string,
  source: string,
  score?: number
}



interface RenderBand {
  start: number,
  end: number,
  color: string,
  label?: string,
  y1?: number,
  y2?: number,
}

interface RenderDot {
    x: number,
    y: number,
    color: string,
}

type Scale = (value: number) => number

type ColorScale = (level: string) => string

interface RenderData {
  chromInfo: ChromosomeInfo,
  annotations: Record<string, RenderBand[]>,
  covData: RenderDot[],
  bafData: RenderDot[],
  transcriptData: RenderBand[],
  // FIXME: Will need a dedicated type for exons
  variantData: RenderBand[],
  overviewCovData: Record<string, RenderDot[]>,
  overviewBafData: Record<string, RenderDot[]>,
}

type Rng = [number, number];

interface ColorPoint {
  x: number,
  y: number,
  color: string,
}

interface UIColors {
  variants: Record<string, string>,
  transcripts: Record<string, string>
}

interface CanvasDetail {
  bands: { id: string }[];
  chrom: string;
}

type OverviewData = Record<string, RenderDot[]>

interface Region {
  chrom: string,
  start: number,
  end: number,
}

interface RegionDetail {
  region: Region;
  exclude?: string[];
}

interface DrawPaths {
  chromosome: DrawChromosome;
  bands: BandPath[];
}

interface Transcript {
  id: string;
  name: string;
  chrom: string;
  start: number;
  end: number;
  mane: string;
  scale: number;
  color: string;
  features: any[];

  x1?: number;
  x2?: number;
  y1?: number;
  y2?: number;

  visibleX1?: number;
  visibleX2?: number;
  visibleY1?: number;
  visibleY2?: number;

  isDisplayed?: boolean;
  tooltip?: Tooltip;
}

interface Tooltip {
  instance: any; // Popper.js instance
  virtualElement: any;
  tooltip: HTMLDivElement;
  isDisplayed: boolean;
}

interface VirtualDOMElement {
  x: number; // Placeholder for Popper.js
  y: number; // Placeholder for Popper.js
  toJSON: () => any; // Placeholder for Popper.js
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface ChromosomeBand {
  start: number,
  end: number,
  stain: string,
  id: string,
  strand: string
}

interface ChromosomeInfo {
  chrom: string,
  centromere: {start: number, end: number},
  size: number,
  bands: ChromosomeBand[]
}

interface DrawChromosome {
  path: Path2D;
  chromInfo?: {
    chrom: string;
    scale: number;
    x: number;
    width: number;
    size: number;
  };
}

interface Dimensions {
  width: number,
  height: number
}

interface BandPath {
  id: string;
  path: Path2D;
  start: number;
  end: number;
  stain: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChromosomeDims {
  [key: string]: ChromosomeDim;
}

interface ChromosomeDim {
  x_pos: number;
  y_pos: number;
  width: number;
  size: number;
}

interface ChromosomePos {
  region: string;
  x_pos: number;
  y_pos: number;
  x_ampl: number; // What is this?
}

interface ColorSchema {
  default?: string;
  [key: string]: string;
}

type Point = {
  x: number;
  y: number;
};

type ElementCoords = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

interface VariantLabel {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
  fontProp: string;
}

type DisplayElement = {
  id: string|number;
  name: string;
  x1?: number;
  x2?: number;
  y1?: number;
  y2?: number;
  start: number;
  end: number;
  // FIXME: Something weird here
  exon_number?: number;
  feature?: string;
  features: string[];
  isDisplayed?: boolean;
  tooltip?: any;
  visibleX1?: number;
  visibleX2?: number;
  visibleY1?: number;
  visibleY2?: number;
};

type ScreenPositions = {
  start: number;
  end: number;
};

type RequestType = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = {
  method: RequestType;
  headers: any;
  body?: string;
};

type OffscreenPosition = {
  start: number | null;
  end: number | null;
  scale: number | null;
};

type OnscreenPosition = {
  start: number | null;
  end: number | null;
};

type InteractiveFeature = {
  yStart: number;
  yEnd: number;
  step: number;
  color: string;
};
