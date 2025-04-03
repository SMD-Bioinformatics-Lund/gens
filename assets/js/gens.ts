// GENS module

// import {
//     VariantTrack,
//     AnnotationTrack,
//     TranscriptTrack,
//     CytogeneticIdeogram,
// } from "./track";
export {
    setupDrawEventManager,
    drawTrack,
    previousChromosome,
    nextChromosome,
    panTracks,
    zoomIn,
    zoomOut,
    parseRegionDesignation,
    queryRegionOrGene,
} from "./navigation";

import "./components/genstracks"
import { GensTracks } from "./components/genstracks";
import "./components/input_controls";
import { InputControls } from "./components/input_controls";
// import { AnnotationTrack } from "./components/tracks/annotation_track";
// import { CoverageTrack } from "./components/tracks/coverage_track";
import { GensDb } from "./gens_db";


// FIXME: Query from the backend

export async function initCanvases({
    sampleName,
    sampleId,
    caseId,
    genomeBuild,
    hgFileDir,
    uiColors,
    scoutBaseURL,
    selectedVariant,
    annotationFile,
}: {
    sampleName: string;
    sampleId: string;
    caseId: string;
    genomeBuild: number;
    hgFileDir: string;
    uiColors: UIColors;
    scoutBaseURL: string;
    selectedVariant: string;
    annotationFile: string;
}) {
    // FIXME: Looks like there should be a "tracks" web component

    const gensTracks = document.getElementById("gens-tracks") as GensTracks;

    const inputControls = document.getElementById(
        "input-controls",
    ) as InputControls;

    const gensDb = new GensDb(sampleId, caseId, genomeBuild);
    
    const allChromData = await gensDb.getAllChromData();
    const overviewCovData = await gensDb.getOverviewCovData();
    const overviewBafData = await gensDb.getOverviewBafData();

    gensTracks.initialize(allChromData, overviewCovData, overviewBafData);

    // @ts-ignore
    const startRegion: Region = window.regionConfig;
    const startRange: Rng = [startRegion.start, startRegion.end];

    // FIXME: Clean this up, so that I can collaborate with Markus
    const defaultAnnots = ["mimisbrunnr"];

    const renderData = fetchRenderData(gensDb, startRegion, defaultAnnots);
    gensTracks.render(renderData, startRegion);

    // FIXME: Look into how to parse this for predefined start URLs
    inputControls.initialize(
        startRegion,
        defaultAnnots,
        async (region) => {
        },
        async (region, source) => {
            const renderData = fetchRenderData(gensDb, startRegion, defaultAnnots);
            gensTracks.render(renderData, region);
        },
        async (_newXRange) => {
            const region = inputControls.getRegion();
            const renderData = fetchRenderData(gensDb, startRegion, defaultAnnots);
            gensTracks.render(renderData, region);
        },
    );

    // initialize and return the different canvases
    // WEBGL values
    const near = 0.1;
    const far = 100;
    const lineMargin = 2; // Margin for line thickness
    // // Listener values
    // const inputField = document.getElementById("region-field");
}

async function fetchRenderData(gensDb: GensDb, region: Region, annotSources: string[]): RenderData {

    const annotationData = {};
    for (const source of annotSources) {
        const annotData = await gensDb.getAnnotations(
            region.chrom,
            source,
        )
        annotationData[source] = annotData;
    }

    const renderData: RenderData = {
        chromInfo: await gensDb.getChromData(region.chrom),
        annotations: annotationData,
        covData: await gensDb.getCov(region.chrom),
        bafData: await gensDb.getBaf(region.chrom),
        transcriptData: await gensDb.getTranscripts(region.chrom)
    }
    return renderData;
}


// Make hard link and copy link to clipboard
export function copyPermalink(genomeBuild, region) {
    // create element and add url to it
    const tempElement = document.createElement("input");
    const loc = window.location;
    tempElement.value = `${loc.host}${loc.pathname}?genome_build=${genomeBuild}&region=${region}`;
    // add element to DOM
    document.body.append(tempElement);
    tempElement.select();
    document.execCommand("copy");
    tempElement.remove(); // remove temp node
}

export { CHROMOSOMES, setupGenericEventManager } from "./track";
