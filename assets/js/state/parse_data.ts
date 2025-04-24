import { STYLE } from "../constants";
import { transformMap } from "../util/utils";
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
  gensAPI: API,
  getChrom: () => string,
  getXRange: () => Rng,
): RenderDataSource {
  const getChromInfo = async () => {
    return await gensAPI.getChromData(getChrom());
  };

  const getAnnotation = async (recordId: string) => {
    const annotData = await gensAPI.getAnnotations(recordId);
    return parseAnnotations(annotData, getChrom());
  };

  const getCovData = async () => {
    const xRange = getXRange();
    const zoom = calculateZoom(xRange);

    const covRaw = await gensAPI.getCov(getChrom(), zoom, xRange);
    return parseCoverageDot(covRaw, STYLE.colors.teal);
  };

  const getBafData = async () => {
    const xRange = getXRange();
    const zoom = calculateZoom(xRange);

    const bafRaw = await gensAPI.getBaf(getChrom(), zoom, xRange);
    return parseCoverageDot(bafRaw, STYLE.colors.orange);
  };

  const getTranscriptData = async () => {
    const onlyMane = true;
    const transcriptsRaw = await gensAPI.getTranscripts(getChrom(), onlyMane);
    return parseTranscripts(transcriptsRaw);
  };

  const getVariantData = async () => {
    const variantsRaw = await gensAPI.getVariants(getChrom());
    return parseVariants(variantsRaw, STYLE.variantColors);
  };

  const getOverviewCovData = async () => {
    const overviewCovRaw = await gensAPI.getOverviewCovData();
    const overviewCovRender = transformMap(overviewCovRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewCovRender;
  };

  const getOverviewBafData = async () => {
    const overviewBafRaw = await gensAPI.getOverviewBafData();
    const overviewBafRender = transformMap(overviewBafRaw, (cov) =>
      parseCoverageDot(cov, STYLE.colors.darkGray),
    );
    return overviewBafRender;
  };

  const renderDataSource: RenderDataSource = {
    getChromInfo,
    getAnnotation,
    getCovData,
    getBafData,
    getTranscriptData,
    getVariantData,
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
    .filter((annot) => (annot.chrom == chromosome))
    .map((annot) => {
      const label = annot.name;
      return {
        id: `${annot.start}_${annot.end}_${annot.color}_${label}`,
        start: annot.start,
        end: annot.end,
        color: annot.color,
        label,
        hoverInfo: `${annot.name} (${annot.start}-${annot.end})`,
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
  const transcriptsToRender: RenderBand[] = transcripts
    .map((transcript) => {
      const exons = parseExons(transcript.record_id, transcript.features);
      const renderBand: RenderBand = {
        id: transcript.record_id,
        start: transcript.start,
        end: transcript.end,
        label: transcript.name,
        color: STYLE.colors.lightGray,
        hoverInfo: `${transcript.name} (${transcript.record_id})`,
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
  variants: ApiVariant[],
  variantColorMap: VariantColors,
): RenderBand[] {
  return variants.map((variant) => {
    const id = variant.document_id;
    return {
      id,
      start: variant.position,
      end: variant.end,
      hoverInfo: `${variant.variant_type} ${variant.sub_category}; length ${variant.length}`,
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
