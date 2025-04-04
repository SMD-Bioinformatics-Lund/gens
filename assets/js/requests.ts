import { get } from "./fetch";
import { lightenColor } from "./track/base";
import { STYLE } from "./util/constants";

function parseResponseToPoints(bafRaw: any): ColorPoint[] {
    const points = [];
    for (let i = 0; i < bafRaw.length; i += 2) {
        const x = bafRaw[i][0];
        const y = bafRaw[i + 1];
        const point = {
            x,
            y,
            color: "blue",
        };
        points.push(point);
    }
    return points;
}

// FIXME: Move to utils
function rgbArrayToString(rgbArray: number[]): string {
    return `rgb(${rgbArray[0]},${rgbArray[1]},${rgbArray[2]})`;
}

export async function getAnnotationDataForChrom(
    chrom: string,
    source: string,
): Promise<RenderBand[]> {
    const query = {
        sample_id: undefined,
        region: `${chrom}:1-None`,
        genome_build: 38,
        collapsed: true,
        source: source,
    };
    const annotsResult = await get("get-annotation-data", query);
    const annotations = annotsResult.annotations as AnnotationEntry[];
    return annotations.map((annot) => {
        return {
            start: annot.start,
            end: annot.end,
            color: rgbArrayToString(annot.color),
        };
    });
}

export async function getTranscriptData(chrom: string): Promise<RenderBand[]> {
    const query = {
        sample_id: undefined,
        region: `${chrom}:1-None`,
        genome_build: 38,
        collapsed: true,
    };
    const results = await get("get-transcript-data", query);
    const transcripts = results.transcripts;

    const transcriptsToRender = transcripts.map((transcript) => {
        return {
            start: transcript.start,
            end: transcript.end,
            color: "blue",
            label: `${transcript.gene_name} (${transcript.transcript_id})`,
        };
    });

    return transcriptsToRender;
}

export async function getSVVariantData(
    sample_id: string,
    case_id: string,
    genome_build: number,
    chrom: string,
) {
    // FIXME: Specify sample
    const query = {
        sample_id,
        case_id,
        region: `${chrom}:1-None`,
        genome_build,
        collapsed: true,
        variant_category: "sv",
    };
    const results = await get("get-variant-data", query);
    const variants = results.variants;
    const toRender = variants.map((variant) => {
        return {
            start: variant.start,
            end: variant.end,
            color: "red",
        };
    });
    return toRender;
}

async function getDotData(
    sampleId: string,
    caseId: string,
    chrom: string,
    covOrBaf: string,
): Promise<RenderDot[]> {
    // const regionString = `${region.chrom}:${region.start}-${region.end}`;

    const query = {
        sample_id: sampleId,
        case_id: caseId,
        region_str: `${chrom}:1-None`,
        cov_or_baf: covOrBaf,
    };

    const results = await get("dev-get-data", query);

    const renderData = results.data.map((d) => {
        return {
            x: (d.start + d.end) / 2,
            y: d.value,
            color: "black", // Should this be assigned later actually?
        };
    });

    return renderData;
}

export async function getCovData(
    sampleId: string,
    caseId: string,
    chrom: string,
): Promise<RenderDot[]> {
    return getDotData(sampleId, caseId, chrom, "cov");
}

export async function getBafData(
    sampleId: string,
    caseId: string,
    chrom: string,
): Promise<RenderDot[]> {
    return getDotData(sampleId, caseId, chrom, "baf");
}

export async function getOverviewData(
    sampleId: string,
    caseId: string,
    covOrBaf: string,
): Promise<Record<string, RenderDot[]>> {
    const query = {
        sample_id: sampleId,
        case_id: caseId,
        cov_or_baf: covOrBaf,
    };

    const overviewData: { chrom: string; pos: number; value: number }[] =
        await get("dev-get-multiple-coverages", query);

    const dataPerChrom: Record<string, RenderDot[]> = {};

    overviewData.forEach((element) => {
        if (dataPerChrom[element.chrom] === undefined) {
            dataPerChrom[element.chrom] = [];
        };
        const point: RenderDot = {
            x: element.pos,
            y: element.value,
            color: "black",
        };
        dataPerChrom[element.chrom].push(point);
    });

    return dataPerChrom;
}

export async function getIdeogramData(
    chrom: string,
    genomeBuild: number,
): Promise<ChromosomeInfo> {
    const chromosomeInfo = (await get("get-chromosome-info", {
        chromosome: chrom,
        genome_build: genomeBuild,
    })) as ChromosomeInfo;

    return chromosomeInfo;
}

