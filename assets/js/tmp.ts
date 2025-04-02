import { get } from "./fetch";

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

export async function getTranscriptData(chrom: string): Promise<RenderBand> {
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
        }
    })
    return toRender;
}

async function getDotData(
    sampleId: string,
    caseId: string,
    region: Region,
    covOrBaf: string,
): Promise<RenderDot[]> {
    const regionString = `${region.chrom}:${region.start}-${region.end}`;

    // FIXME (obviously)
    const query = {
        sample_id: sampleId,
        case_id: caseId,
        region_str: regionString,
        cov_or_baf: covOrBaf,
    };

    const results = await get("dev-get-data", query);

    const renderData = results.data.map((d) => {
        return {
            x: (d.start + d.end) / 2,
            y: d.value,
            color: "blue", // Should this be assigned later actually?
        };
    });

    return renderData;
}

export async function getCovData(
    sampleId: string,
    caseId: string,
    region: Region,
): Promise<RenderDot[]> {
    return getDotData(sampleId, caseId, region, "cov");
}

export async function getBafData(
    sampleId: string,
    caseId: string,
    region: Region,
): Promise<RenderDot[]> {
    return getDotData(sampleId, caseId, region, "baf");
}

// export async function getCovAndBafFromOldAPI(
//     region: Region,
// ): Promise<{ cov: any; baf: any }> {
//     const regionString = `${region.chrom}:${region.start}-${region.end}`;
//     const query = {
//         region: regionString,
//         case_id: "hg002-2",
//         sample_id: "hg002-2",
//         genome_build: 38,
//         hg_filedir: undefined,
//         x_pos: 930,
//         y_pos: 94,
//         plot_height: 180,
//         extra_plot_width: 930,
//         top_bottom_padding: 8,
//         x_ampl: 1395,
//         baf_y_start: 1,
//         baf_y_end: 0,
//         log2_y_start: 4,
//         log2_y_end: -4,
//         reduce_data: 1,
//     };

//     const covResults = await get("get-coverage", query);
//     const bafRaw = covResults.baf;
//     const bafPoints = parseResponseToPoints(bafRaw);
//     const covRaw = covResults.data;
//     const covPoints = parseResponseToPoints(covRaw);

//     return {
//         cov: covPoints,
//         baf: bafPoints,
//     };
// }
