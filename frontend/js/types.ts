enum VariantCategory {
  SV = "sv",
  SNV = "snv",
  STR = "str",
}

enum VariantSubCategory {
  SNV = "snv",
  INDEL = "indel",
  DEL = "del",
  INS = "ins",
  DUP = "dup",
  INV = "inv",
  CNV = "cnv",
  BND = "bnd",
  STR = "str",
  MEI = "mei",
}

interface ApiAnnotationTrack {
  track_id: string;
  name: string;
  description: string;
  maintainer: string;
  metadata: { key: string; value: string }[];
  genome_build: number;
}

interface ApiGeneList {
  id: string;
  name: string;
  version: string;
}

interface ApiSampleAnnotationTrack {
  // FIXME: What to do with this one
  _id: string;
  track_id: string;
  sample_id: string;
  case_id: string;
  name: string;
  description: string | null;
  metadata: { key: string; value: string }[];
  genome_build: number;
}

interface ApiSearchResult {
  chromosome: string;
  start: number;
  end: number;
}

interface ApiSimplifiedAnnotation {
  record_id: string;
  name: string;
  type: string;
  start: number;
  end: number;
  chrom: string;
  color: string | null;
}

interface ApiSimplifiedTranscript {
  record_id: string;
  name: string;
  type: string;
  start: number;
  end: number;
  strand: string;
  color: number[] | null;
  is_protein_coding: boolean;
  features: {
    feature: string;
    start: number;
    end: number;
    exon_number?: number;
  }[];
}

interface ApiComment {
  created_at: string;
  username: string;
  comment: string;
  displayed: boolean;
}

interface ApiReference {
  title: string;
  url: string;
  pmid: string;
  authors: string[];
}

interface ApiMetadata {
  field_name: string;
  value: string | { url: string; title: string };
  type: string;
}

interface ApiAnnotationDetails {
  start: number;
  end: number;
  track_id: string;
  name: string;
  description?: string;
  genome_build: number;
  chrom: string;
  comments: ApiComment[];
  references: ApiReference[];
  metadata: ApiMetadata[];
}

interface ApiSampleAnnotationDetails extends ApiAnnotationDetails {
  sample_id: string;
  case_id: string;
}

interface ApiTranscriptFeature {
  feature: string;
  start: number;
  end: number;
  exon_number: number;
}

interface ApiGeneDetails {
  transcript_id: string;
  transcript_biotype: string;
  gene_name: string;
  mane: string;
  hgnc_id: string;
  refseq_id: string;
  features: ApiTranscriptFeature[];
  chrom: string;
  start: number;
  end: number;
  strand: string;
  genome_build: number;
}

interface ApiScoutSample {
  allele_depths: [number, number];
  alt_frequency: number;
  display_name: string;
  genotype_call: string;
  sample_id: string;
  read_depth: number;
  split_read: number;
  genotype_quality: number;
}

interface SampleMetaValue {
  type: string;
  value: string;
  row_name?: string;
  color: string;
}

interface SampleMetaEntry {
  id: string;
  file_name: string;
  row_name_header?: string;
  data: SampleMetaValue[];
}

interface ApiSimplifiedVariant {
  document_id: string;
  start: number;
  end: number;
  variant_type: string; // e.g. research, clinical
  category: VariantCategory;
  sub_category: VariantSubCategory;
  genotype: string;
}

interface ApiVariantDetails {
  alternative: string;
  cadd_score: string;
  case_id: string;
  category: VariantCategory;
  chromosome: string;
  cytoband_start: string;
  cytoband_end: string;
  display_name: string;
  document_id: string;
  end: number;
  end_chrom: string;
  filters: string[];
  gatk: string;
  hgnc_ids: string[];
  hgnc_symbols: string[];
  genes: string[];
  length: number;
  missing_data: boolean;
  panels: string[];
  phast_conservation: string[];
  phylop_conservation: string[];
  start: number;
  quality: number;
  rank_score: number;
  rank_score_results: { category: string; score: number }[];
  reference: string;
  sample?: ApiScoutSample;
  samples: ApiScoutSample[];
  simple_id: string;
  sub_category: VariantSubCategory;
  variant_id: string;
  variant_rank: number;
  variant_type: string;
}

interface ApiCoverageDot {
  pos: number;
  value: number;
}

interface ApiCoverageBin {
  start: number;
  end: number;
  value: number;
  zoom: string;
}

interface PopupContent {
  header: string;
  info?: { key: string; value: string; url?: string }[];
}

type RenderElement = RenderBand | RenderDot;

interface TranscriptFeature {
  start: number;
  end: number;
  feature: string;
  exonNumber?: number;
}

interface RenderBand {
  id: string;
  start: number;
  end: number;
  color?: string;
  edgeColor?: string;
  edgeWidth?: number;
  label?: string;
  hoverInfo?: string;
  direction?: "+" | "-";
  y1?: number;
  y2?: number;
  subFeatures?: TranscriptFeature[];
  exonCount?: number;
}

interface RenderDot {
  x: number;
  y: number;
  color: string;
}

interface DotTrackData {
  dots: RenderDot[];
}

interface AnnotationTrackData {
  xRange: Rng;
  annotation: { source: string; bands: RenderBand[] };
}

type Chromosome =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "X"
  | "Y";

interface BandTrackData {
  // xRange: Rng;
  bands: RenderBand[];
}

interface IdeogramTrackData {
  chromInfo: ChromosomeInfo;
  xRange: Rng;
}

interface OverviewTrackData {
  dotsPerChrom: Record<string, RenderDot[]>;
  chromosome: string;
  xRange: Rng;
}

interface Box {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

interface HoverBox {
  label: string;
  box: Box;
  element?: RenderBand | RenderDot;
}

interface BoxStyle {
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  alpha?: number;
}

interface LabelStyle {
  withFrame?: boolean;
  textBaseline?: "top" | "middle" | "bottom";
  textAlign?: "left" | "right" | "center";
  padding?: number;
  font?: string;
  textColor?: string;
  boxStyle?: BoxStyle;
  rotation?: number;
}

interface LineStyle {
  lineWidth?: number;
  color?: string;
  dashed?: boolean;
  transpose_05?: boolean;
}

type Scale = (value: number) => number;

type ColorScale = (level: string) => string;

type BandYScale = (lane: number, expanded: boolean) => Rng;

type GetAnnotSources = (settings: {
  selectedOnly: boolean;
}) => { id: string; label: string }[];

interface RenderDataSource {
  getChromInfo: (chrom: Chromosome) => Promise<ChromosomeInfo>;

  getAnnotationBands: (
    sourceId: string,
    chrom: string,
  ) => Promise<RenderBand[]>;
  getAnnotationDetails: (bandId: string) => Promise<ApiAnnotationDetails>;

  getSampleAnnotSources: (
    caseId: string,
    sampleId: string,
  ) => Promise<{ id: string; name: string }[]>;
  getSampleAnnotationBands: (
    trackId: string,
    chrom: string,
  ) => Promise<RenderBand[]>;
  getSampleAnnotationDetails: (
    recordId: string,
  ) => Promise<ApiSampleAnnotationDetails>;

  getCovData: (
    sample: Sample,
    chrom: string,
    xRange: Rng,
  ) => Promise<RenderDot[]>;
  getBafData: (
    sample: Sample,
    chrom: string,
    xRange: Rng,
  ) => Promise<RenderDot[]>;

  getTranscriptBands: (chrom: string) => Promise<RenderBand[]>;
  getTranscriptDetails: (geneId: string) => Promise<ApiGeneDetails>;

  getGeneListBands: (listId: string, chrom: string) => Promise<RenderBand[]>;

  getVariantBands: (sample: Sample, chrom: string, rankScoreThres: number) => Promise<RenderBand[]>;
  getVariantDetails: (variantId: string) => Promise<ApiVariantDetails>;

  getOverviewCovData: (sample: Sample) => Promise<Record<string, RenderDot[]>>;
  getOverviewBafData: (sample: Sample) => Promise<Record<string, RenderDot[]>>;
}

type Rng = [number, number];

interface Region {
  chrom: Chromosome;
  start: number;
  end: number;
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
  start: number;
  end: number;
  stain: string;
  id: string;
  strand: string;
}

interface ChromosomeInfo {
  chrom: string;
  centromere: { start: number; end: number };
  size: number;
  bands: ChromosomeBand[];
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
  width: number;
  height: number;
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
  id: string | number;
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

interface DragCallbacks {
  onZoomIn: (xRange: Rng) => void;
  onZoomOut: () => void;
  getHighlights: () => RangeHighlight[];
  addHighlight: (highlight: RangeHighlight) => void;
  removeHighlight: (id: string) => void;
}

interface Axis {
  range: Rng;
  label: string;
  hideLabelOnCollapse: boolean;
  hideTicksOnCollapse: boolean;
}

interface RenderSettings {
  dataUpdated?: boolean;
  resized?: boolean;
  positionOnly?: boolean;
  samplesUpdated?: boolean;
}

interface RangeHighlight {
  id: string;
  chromosome: Chromosome;
  range: Rng;
  color: string;
}

interface ApiSample {
  baf_file: string;
  baf_index: string,
  case_id: string;
  coverage_file: string;
  coverage_index: string;
  created_at: string;
  genome_build: number;
  overview_file: string;
  sample_id: string;
  sample_type?: string;
  sex?: string;
  meta: SampleMetaEntry[];
}

interface Sample {
  caseId: string;
  sampleId: string;
  sampleType?: string;
  sex?: string;
  meta?: SampleMetaEntry[];
}

type TrackType = "annotation" | "variant" | "dot-cov" | "dot-baf" | "gene" | "position" | "gene-panel";

type IDBTranscripts = {
  transcripts: ApiSimplifiedTranscript[],
  serverTimestamp: string,
}
