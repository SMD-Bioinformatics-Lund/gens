import { get } from "./fetch";

function parseResponseToPoints(bafRaw: any): ColorPoint[] {
    const points = [];
    for (let i = 0; i < bafRaw.length; i += 2) {
        const x = bafRaw[i][0];
        const y = bafRaw[i + 1];
        const point = {
            x, y, color: "blue"
        }
        points.push(point);
    }
    return points;
}

export async function getAnnotationData(region: Region, source: string): Promise<AnnotationEntries[]> {
    const regionString = `${region.chrom}:${region.start}-${region.end}`;
    const annotPayload = {
        sample_id: undefined,
        region: regionString,
        genome_build: 38,
        collapsed: true,
        source: source,
    };
    const annotsResult = await get("get-annotation-data", annotPayload); 
    return annotsResult.annotations;
}

export async function getCovAndBafFromOldAPI(region: Region): Promise<{cov: any, baf: any}> {
    const regionString = `${region.chrom}:${region.start}-${region.end}`;
    const covPayload = {
        region: regionString,
        case_id: 'hg002-2',
        sample_id: 'hg002-2',
        genome_build: 38,
        hg_filedir: undefined,
        x_pos: 930,
        y_pos: 94,
        plot_height: 180,
        extra_plot_width: 930,
        top_bottom_padding: 8,
        x_ampl: 1395,
        baf_y_start: 1,
        baf_y_end: 0,
        log2_y_start: 4,
        log2_y_end: -4,
        reduce_data: 1};

    const covResults = await get("get-coverage", covPayload);
    const bafRaw = covResults.baf;
    const bafPoints = parseResponseToPoints(bafRaw);
    const covRaw = covResults.data;
    const covPoints = parseResponseToPoints(covRaw);

    return {
        cov: covPoints,
        baf: bafPoints
    }
}