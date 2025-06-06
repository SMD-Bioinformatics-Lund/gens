import { STYLE } from "../constants";
import { prefixNts, transformMap } from "../util/utils";
import { API } from "./api";

function calculateZoom(xRange: Rng) {
  const xRangeSize = xRange[1] - xRange[0];
  let returnVal;
  if (xRangeSize > 100 * 10 ** 6) {
    returnVal = "o";
  } else if (xRangeSize > 50 * 10 ** 6) {
    returnVal = "a";
  } else if (xRangeSize > 10 * 10 ** 6) {
    returnVal = "b";
  } else if (xRangeSize > 500 * 10 ** 3) {
    returnVal = "c";
  } else {
    returnVal = "d";
  }
  return returnVal;
}

export function getRenderDataSource(
  api: API,
  getChrom: () => string,
  getXRange: () => Rng,
): RenderDataSource {
  const getChromInfo = async () => {
    return api.getChromData(getChrom());
  };

  const getAnnotation = async (recordId: string, chrom: string) => {
    const annotData = await api.getAnnotations(recordId);
    return parseAnnotations(annotData, chrom);
  };

  const getCovData = async (sample: Sample, chrom: string, xRange: Rng) => {
    const zoom = calculateZoom(xRange);

    const covRaw = await api.getCov(
      sample.caseId,
      sample.sampleId,
      chrom,
      zoom,
      xRange,
    );
    return parseCoverageDot(covRaw, STYLE.colors.darkGray);
  };

  const getBafData = async (sample: Sample, chrom: string) => {
    const xRange = getXRange();
    const zoom = calculateZoom(xRange);

    const bafRaw = await api.getBaf(
      sample.caseId,
      sample.sampleId,
      chrom,
      zoom,
      xRange,
    );
    return parseCoverageDot(bafRaw, STYLE.colors.darkGray);
  };

  const getTranscriptBands = async (chrom: string) => {
    const onlyMane = true;
    const transcriptsRaw = await api.getTranscripts(chrom, onlyMane);
    return parseTranscripts(transcriptsRaw);
  };

  const getVariantBands = async (sample: Sample, chrom: string) => {
    const variantsRaw = await api.getVariants(
      sample.caseId,
      sample.sampleId,
      chrom,
    );
    return parseVariants(variantsRaw, STYLE.variantColors);
  };

  const getOverviewCovData = async (sample: Sample) => {
    const overviewCovRaw = await api.getOverviewCovData(
      sample.caseId,
      sample.sampleId,
    );
    const overviewCovRender = transformMap(overviewCovRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewCovRender;
  };

  const getOverviewBafData = async (sample: Sample) => {
    const overviewBafRaw = await api.getOverviewBafData(
      sample.caseId,
      sample.sampleId,
    );
    const overviewBafRender = transformMap(overviewBafRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewBafRender;
  };

  const renderDataSource: RenderDataSource = {
    getChromInfo,
    getAnnotationBands: getAnnotation,
    getAnnotationDetails: (id: string) => api.getAnnotationDetails(id),
    getCovData,
    getBafData,
    getTranscriptBands,
    getTranscriptDetails: (id: string) => api.getTranscriptDetails(id),
    getVariantBands,
    getVariantDetails: (id: string) =>
      api.getVariantDetails(id),
    getOverviewCovData,
    getOverviewBafData,
  };
  return renderDataSource;
}

export function parseAnnotations(
  annotations: ApiSimplifiedAnnotation[],
  chromosome: string,
): RenderBand[] {
  const results = annotations
    .filter((annot) => annot.chrom == chromosome)
    .map((annot) => {
      const label = annot.name;
      return {
        id: annot.record_id,
        // id: `${annot.start}_${annot.end}_${annot.color}_${label}`,
        start: annot.start,
        end: annot.end,
        color: annot.color,
        label,
        hoverInfo: `${annot.name}`,
      };
    });
  return results;
}

function parseExons(
  geneId: string,
  exons: { start: number; end: number }[],
): RenderBand[] {
  return exons.map((part, i) => {
    const renderBand = {
      id: `${geneId}_exon${i + 1}_${part.start}_${part.end}`,
      start: part.start,
      end: part.end,
      color: STYLE.colors.teal,
      label: `${i + 1} ${part.start}-${part.end}`,
    };
    return renderBand;
  });
}

export function parseTranscripts(
  transcripts: ApiSimplifiedTranscript[],
): RenderBand[] {
  const transcriptsToRender: RenderBand[] = transcripts.map((transcript) => {
    const exons = parseExons(transcript.record_id, transcript.features);
    const renderBand: RenderBand = {
      id: transcript.record_id,
      start: transcript.start,
      end: transcript.end,
      label: transcript.name,
      color: STYLE.colors.lightGray,
      hoverInfo: `${transcript.name}`,
      direction: transcript.strand as "+" | "-",
      subBands: exons,
    };
    return renderBand;
  });

  // FIXME: This should be done on the backend
  const seenIds = new Set();
  const filteredDuplicates = transcriptsToRender.filter((tr) => {
    const fingerprint = `${tr.label}_${tr.start}_${tr.end}`;
    if (seenIds.has(fingerprint)) {
      return false;
    } else {
      seenIds.add(fingerprint);
      return true;
    }
  });

  return filteredDuplicates;
}

export function parseVariants(
  variants: ApiSimplifiedVariant[],
  variantColorMap: VariantColors,
): RenderBand[] {
  return variants.map((variant) => {
    const id = variant.variant_id;
    const length = variant.end - variant.start;
    return {
      id,
      start: variant.start,
      end: variant.end,
      hoverInfo: `${variant.sub_category} (${prefixNts(length)})`,
      label: `${variant.variant_type} ${variant.sub_category}`,
      color:
        variantColorMap[variant.sub_category] != undefined
          ? variantColorMap[variant.sub_category]
          : variantColorMap.default,
    };
  });
}

export function parseCoverageBin(
  coverage: ApiCoverageBin[],
  color: string,
): RenderDot[] {
  const renderData = coverage.map((d) => {
    return {
      x: (d.start + d.end) / 2,
      y: d.value,
      color,
    };
  });

  return renderData;
}

export function parseCoverageDot(
  coverage: ApiCoverageDot[],
  color: string,
): RenderDot[] {
  const renderData = coverage.map((d) => {
    return {
      x: d.pos,
      y: d.value,
      color,
    };
  });

  return renderData;
}
