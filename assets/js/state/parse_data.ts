import { STYLE, VARIANT_COLORS } from "../constants";
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

  const getAnnotation = async (recordId: string, chrom: string): Promise<RenderBand[]> => {
    const annotData = await api.getAnnotations(recordId);
    return parseAnnotations(annotData, chrom);
  };

  const getCovData = async (sample: Sample, chrom: string, xRange: Rng): Promise<RenderDot[]> => {
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

  const getBafData = async (sample: Sample, chrom: string): Promise<RenderDot[]> => {
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

  const getTranscriptBands = async (chrom: string): Promise<RenderBand[]> => {
    const onlyMane = true;
    const transcriptsRaw = await api.getTranscripts(chrom, onlyMane);
    return parseTranscripts(transcriptsRaw);
  };

  const getVariantBands = async (sample: Sample, chrom: string): Promise<RenderBand[]> => {
    const variantsRaw = await api.getVariants(
      sample.caseId,
      sample.sampleId,
      chrom,
    );
    return parseVariants(variantsRaw);
  };

  const getOverviewCovData = async (sample: Sample): Promise<Record<string, RenderDot[]>> => {
    const overviewCovRaw = await api.getOverviewCovData(
      sample.caseId,
      sample.sampleId,
    );
    const overviewCovRender = transformMap(overviewCovRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewCovRender;
  };

  const getOverviewBafData = async (sample: Sample): Promise<Record<string, RenderDot[]>> => {
    const overviewBafRaw = await api.getOverviewBafData(
      sample.caseId,
      sample.sampleId,
    );
    const overviewBafRender = transformMap(overviewBafRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewBafRender;
  };

  // const getSampleAnnotationSources = async(caseId: string, sampleId: string): Promise<ApiSampleAnnotationTrack[]> => {
  //   const rawSources = await api.getSampleAnnotationSources(caseId, sampleId);
  //   const sources = rawSources.map((source) => {
  //     source.track_id = source._id;
  //     return source;
  //   })
  //   console.log("Returning sources", sources);
  //   return sources
  // }

  const getSampleAnnotationBands = async (trackId: string, chrom: string): Promise<RenderBand[]> => {
    const annotsRaw = await api.getSampleAnnotations(trackId);
    return parseAnnotations(annotsRaw, chrom);
  }

  const getSampleAnnotationDetails = async (recordId: string): Promise<ApiSampleAnnotationDetails> => {
    return api.getSampleAnnotationDetails(recordId);
  }

  const renderDataSource: RenderDataSource = {
    getChromInfo,
    getAnnotationBands: getAnnotation,
    getAnnotationDetails: (id: string) => api.getAnnotationDetails(id),
    getSampleAnnotationBands,
    getSampleAnnotationDetails,
    getCovData,
    getBafData,
    getTranscriptBands,
    getTranscriptDetails: (id: string) => api.getTranscriptDetails(id),
    getVariantBands,
    getVariantDetails: (id: string) => api.getVariantDetails(id),
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

export function parseSampleAnnotations(
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

function parseTranscriptFeatures(
  features: {
    feature: string;
    start: number;
    end: number;
    exon_number?: number;
  }[],
): TranscriptFeature[] {
  return features.map((part) => {
    return {
      start: part.start,
      end: part.end,
      exonNumber: part.exon_number,
      feature: part.feature,
    };
  });
}

export function parseTranscripts(
  transcripts: ApiSimplifiedTranscript[],
): RenderBand[] {
  const transcriptsToRender: RenderBand[] = transcripts.map((transcript) => {
    const exons = parseTranscriptFeatures(transcript.features);
    const exonCount = exons.filter((f) => f.feature === "exon").length;
    const renderBand: RenderBand = {
      id: transcript.record_id,
      start: transcript.start,
      end: transcript.end,
      label: transcript.name,
      color: STYLE.colors.green,
      hoverInfo: `${transcript.name}`,
      direction: transcript.strand as "+" | "-",
      subFeatures: exons,
      exonCount,
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

export function parseVariants(variants: ApiSimplifiedVariant[]): RenderBand[] {
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
        VARIANT_COLORS[variant.sub_category] != undefined
          ? VARIANT_COLORS[variant.sub_category]
          : VARIANT_COLORS.default,
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
