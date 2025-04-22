import { STYLE } from "../constants";
import { rgbArrayToString } from "../draw/render_utils";
import { transformMap } from "../util/utils";
import { API } from "./api";

export function getRenderDataSource(
    gensAPI: API,
    getChrom: () => string,
  ): RenderDataSource {
    const getChromInfo = async () => {
      return await gensAPI.getChromData(getChrom());
    };
  
    const getAnnotation = async (recordId: string) => {
      const annotData = await gensAPI.getAnnotations(recordId);
      return parseAnnotations(annotData);
    };
  
    const getCovData = async () => {
      const covRaw = await gensAPI.getCov(getChrom());
      return parseCoverageDot(covRaw, STYLE.colors.teal);
    };
  
    const getBafData = async () => {
      const bafRaw = await gensAPI.getBaf(getChrom());
      return parseCoverageDot(bafRaw, STYLE.colors.orange);
    };
  
    const getTranscriptData = async () => {
      const transcriptsRaw = await gensAPI.getTranscripts(getChrom());
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
  

export function parseAnnotations(annotations: ApiSimplifiedAnnotation[]): RenderBand[] {
  const results = annotations.map((annot) => {
    // const rankScore = annot.score ? `, Rankscore: ${annot.score}` : "";
    const label = annot.name;
    const colorStr = rgbArrayToString(annot.color);
    return {
      id: `${annot.start}_${annot.end}_${colorStr}`,
      start: annot.start,
      end: annot.end,
      color: colorStr,
      label,
      hoverInfo: `${annot.name} (${annot.start}-${annot.end})`,
    };
  });
  return results;
}

// FIXME: Should this one be here?
function parseExons(
  geneId: string,
  exons: {start: number, end: number}[],
): RenderBand[] {
  // const exons = transcriptParts.filter((part) => part.feature == "exon");

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

export function parseTranscripts(transcripts: ApiSimplifiedTranscript[]): RenderBand[] {
  const transcriptsToRender: RenderBand[] = transcripts.map((transcript) => {
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
    if (seenIds.has(tr.id)) {
      return false;
    } else {
      seenIds.add(tr.id);
      return true;
    }
  });

  return filteredDuplicates;
}

export function parseVariants(
  variants: APIVariant[],
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
  coverage: APICoverageBin[],
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
  coverage: APICoverageDot[],
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