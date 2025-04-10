interface APIAnnotation {
  chrom: string,
  color: [number, number, number],
  end: number,
  genome_build: number,
  name: string,
  score: number | null,
  source: string,
  start: number,
  strand: string
}

interface APITranscriptPart {
  start: number,
  end: number,
  exon_number?: number,
  feature: "exon"
}

interface APITranscript {
  chrom: string,
  start: number,
  end: number,
  features: APITranscriptPart[],
  gene_name: string,
  genome_build: number,
  height_order: number,
  hgnc_id: string,
  mane: string,
  refseq_id: string,
  strand: string,
  transcript_biotype: string,
  transcript_id: string,
}

interface APIVariant {
  alternative: string,
  cadd_score: string,
  case_id: string,
  category: string,
  chromosome: string,
  cytoband_start: string,
  cytoband_end: string,
  display_name: string,
  document_id: string,
  end: number,
  end_chrom: string,
  filters: string[],
  gatk: string,
  hgnc_ids: string[],
  hgnc_symbols: string[],
  institute: string,
  length: number,
  missing_data: boolean,
  panels: string[],
  phast_conservation: string[],
  phylop_conservation: string[],
  position: number,
  quality: number,
  rank_score: number,
  rank_score_results: {category: string, score: number}[],
  reference: string,
  simple_id: string,
  sub_category: string,
  variant_id: string,
  variant_rank: number,
  variant_type: string
}

interface APICoverageDot {
  pos: number,
  value: number,
}

interface APICoverageBin {
  start: number,
  end: number,
  value: number,
  zoom: string,
}

interface RenderBand {
  id: string,
  start: number,
  end: number,
  color?: string,
  edgeColor?: string,
  edgeWidth?: number
  label?: string,
  hoverInfo?: string,
  direction?: "+" | "-",
  y1?: number,
  y2?: number,
  subBands?: RenderBand[],
}

interface RenderDot {
    x: number,
    y: number,
    color: string,
}

interface DotTrackData {
  xRange: Rng,
  dots: RenderDot[]
}

interface AnnotationTracksData {
  xRange: Rng,
  annotations: {source: string, bands: RenderBand[]}[],
}

interface BandTrackData {
  xRange: Rng,
  bands: RenderBand[],
}

interface IdeogramTrackData {
  chromInfo: ChromosomeInfo,
  xRange: Rng
}

interface OverviewTrackData {
  dotsPerChrom: Record<string, RenderDot[]>,
  chromosome: string,
  xRange: Rng,
}

interface Box {
  x1: number,
  x2: number,
  y1: number,
  y2: number,
}

interface HoverBox {
  label: string,
  box: Box
}

interface BoxStyle {
  fillColor?: string,
  borderColor?: string,
  borderWidth?: number
}

type Scale = (value: number) => number

type ColorScale = (level: string) => string

type BandYScale = (lane: number, expanded: boolean) => Rng

interface RenderDataSource {
  getChromInfo: () => Promise<ChromosomeInfo>,
  getAnnotation: (string) => Promise<RenderBand[]>,
  getCovData: () => Promise<RenderDot[]>,
  getBafData: () => Promise<RenderDot[]>,
  getTranscriptData: () => Promise<RenderBand[]>,
  getVariantData: () => Promise<RenderBand[]>,
  getOverviewCovData: () => Promise<Record<string, RenderDot[]>>,
  getOverviewBafData: () => Promise<Record<string, RenderDot[]>>,
}

type Rng = [number, number];

interface Region {
  chrom: string,
  start: number,
  end: number,
}

interface _RegionDetail {
  region: Region;
  exclude?: string[];
}

interface DrawPaths {
  chromosome: _DrawChromosome;
  bands: _BandPath[];
}

interface _Transcript {
  id: string;
  name: string;
  chrom: string;
  start: number;
  end: number;
  mane: string;
  scale: number;
  color: string;
  // eslint-disable-next-line
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
  // eslint-disable-next-line
  instance: any; // Popper.js instance
  // eslint-disable-next-line
  virtualElement: any;
  tooltip: HTMLDivElement;
  isDisplayed: boolean;
}

interface _VirtualDOMElement {
  x: number; // Placeholder for Popper.js
  y: number; // Placeholder for Popper.js
  // eslint-disable-next-line
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

interface _DrawChromosome {
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

interface _BandPath {
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

interface _ChromosomeDims {
  [key: string]: _ChromosomeDim;
}

interface _ChromosomeDim {
  x_pos: number;
  y_pos: number;
  width: number;
  size: number;
}

interface _ChromosomePos {
  region: string;
  x_pos: number;
  y_pos: number;
  x_ampl: number; // What is this?
}

interface _ColorSchema {
  default?: string;
  [key: string]: string;
}

type Point = {
  x: number;
  y: number;
};

interface _VariantLabel {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
  fontProp: string;
}

type _DisplayElement = {
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
  // eslint-disable-next-line
  tooltip?: any;
  visibleX1?: number;
  visibleX2?: number;
  visibleY1?: number;
  visibleY2?: number;
};

type _ScreenPositions = {
  start: number;
  end: number;
};

type RequestType = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = {
  method: RequestType;
  // eslint-disable-next-line
  headers: any;
  body?: string;
};

type _OffscreenPosition = {
  start: number | null;
  end: number | null;
  scale: number | null;
};

type _OnscreenPosition = {
  start: number | null;
  end: number | null;
};

type _InteractiveFeature = {
  yStart: number;
  yEnd: number;
  step: number;
  color: string;
};

type VariantColors = {
  del: string,
  dup: string,
  inv: string,
  default: string,
}