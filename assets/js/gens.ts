// GENS module

import { InteractiveCanvas } from "./interactive";
import { OverviewCanvas } from "./overview";
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
import { get } from "./fetch";
import {
    getAnnotationDataForChrom,
    getBafData,
    getCovData,
    getOverviewData,
    getSVVariantData,
    getTranscriptData,
} from "./requests";
import { GensDb } from "./gens_db";
import { extractFromMap } from "./track/utils";
// import { get } from "http";


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
    
    gensTracks.initialize(gensDb);

    // @ts-ignore
    const startRegion: Region = window.regionConfig;
    const startRange: [number, number] = [startRegion.start, startRegion.end];

    // annotationTrack.initialize("Annotation", thinTrackHeight);

    // FIXME: Clean this up, so that I can collaborate with Markus
    const defaultAnnots = ["mimisbrunnr"];

    gensTracks.render(gensDb, startRegion, defaultAnnots);

    // renderTracks(
    //     gensDb,
    //     startRegion,
    //     defaultAnnots,
    //     ideogramTrack,
    //     annotationsContainer,
    //     coverageTrack,
    //     bafTrack,
    //     transcriptTrack,
    //     variantTrack,
    // );

    // FIXME: Look into how to parse this for predefined start URLs
    inputControls.initialize(
        startRegion,
        defaultAnnots,
        async (region) => {
            // const {cov, baf} = await getCovAndBafFromOldAPI(region);
            // coverageTrack.render(xRange, COV_Y_RANGE, cov);
            // bafTrack.render(xRange, BAF_Y_RANGE, baf);
        },
        async (region, source) => {
            // const annotations = await getAnnotationDataForChrom(
            //     region.chrom,
            //     source,
            // );
            // annotationTrack.render([region.start, region.end], annotations);
            const annotSources = inputControls.getSources();

            gensTracks.render(gensDb, region, annotSources);


            // renderTracks(
            //     gensDb,
            //     region,
            //     annotSources,
            //     ideogramTrack,
            //     annotationsContainer,
            //     coverageTrack,
            //     bafTrack,
            //     transcriptTrack,
            //     variantTrack,
            // );

            // const xRange: [number, number] = [startRegion.start, startRegion.end];
            // const yRange: [number, number] = [-4, 4];
            // coverageTrack.render(xRange, yRange, dots);
        },
        async (_newXRange) => {
            const region = inputControls.getRegion();
            const annotSources = inputControls.getSources();

            gensTracks.render(gensDb, region, annotSources);

            // renderTracks(
            //     gensDb,
            //     region,
            //     annotSources,
            //     ideogramTrack,
            //     annotationsContainer,
            //     coverageTrack,
            //     bafTrack,
            //     transcriptTrack,
            //     variantTrack,
            // );
        },
    );

    // initialize and return the different canvases
    // WEBGL values
    const near = 0.1;
    const far = 100;
    const lineMargin = 2; // Margin for line thickness
    // // Listener values
    // const inputField = document.getElementById("region-field");

    // const ic = new InteractiveCanvas(
    //   inputField,
    //   lineMargin,
    //   near,
    //   far,
    //   caseId,
    //   sampleName,
    //   genomeBuild,
    //   hgFileDir
    // );
    // // Initiate and draw overview canvas
    // const oc = new OverviewCanvas(
    //   ic.x,
    //   ic.plotWidth,
    //   lineMargin,
    //   near,
    //   far,
    //   caseId,
    //   sampleName,
    //   genomeBuild,
    //   hgFileDir
    // );

    // return { ic, oc };

    // Initiate interactive canvas
    // // Initiate variant, annotation and transcript canvases
    // const vc = new VariantTrack(
    //   ic.x,
    //   ic.plotWidth,
    //   near,
    //   far,
    //   sampleId,
    //   caseId,
    //   genomeBuild,
    //   uiColors.variants,
    //   scoutBaseURL,
    //   selectedVariant,
    // );
    // const tc = new TranscriptTrack(
    //   ic.x,
    //   ic.plotWidth,
    //   near,
    //   far,
    //   genomeBuild,
    //   uiColors.transcripts,
    // );
    // const ac = new AnnotationTrack(
    //   ic.x,
    //   ic.plotWidth,
    //   near,
    //   far,
    //   genomeBuild,
    //   annotationFile,
    // );
    // // Draw cytogenetic ideogram figure
    // const cg = new CytogeneticIdeogram({
    //   targetId: "cytogenetic-ideogram",
    //   genomeBuild,
    //   x: ic.x,
    //   y: ic.y,
    //   width: ic.plotWidth,
    //   height: 40,
    // });
    // return {
    //   ic: ic,
    //   vc: vc,
    //   tc: tc,
    //   ac: ac,
    //   oc: oc,
    //   cg: cg,
    // };
}

// async function renderTracks(
//     gensDb: GensDb,
//     region: Region,
//     annotationSources: string[],
//     ideogramTrack: IdeogramTrack,
//     annotationsContainer: HTMLDivElement,
//     coverageTrack: DotTrack,
//     bafTrack: DotTrack,
//     transcriptsTrack: BandTrack,
//     variantsTrack: BandTrack,
// ) {
//     const range: [number, number] = [region.start, region.end];

//     console.log(
//         `Rendering. Chrom: ${region.chrom} Range: ${range} Annot: ${annotationSources}`,
//     );

//     const chromInfo = await gensDb.getChromData(region.chrom);
//     ideogramTrack.render(region.chrom, chromInfo, range);

//     while (annotationsContainer.firstChild) {
//         annotationsContainer.removeChild(annotationsContainer.firstChild);
//     }
//     for (const source of annotationSources) {
//         console.log("Looping out a new track", source);
//         const annotTrack = new BandTrack();
//         annotationsContainer.appendChild(annotTrack);
//         annotTrack.initialize(source, THIN_TRACK_HEIGHT);
//         const annotations = await gensDb.getAnnotations(region.chrom, source);
//         annotTrack.render(range, annotations);
//     }

//     // annotationTrack.render(range, annotations);

//     const covData = await gensDb.getCov(region.chrom);
//     coverageTrack.render(range, COV_Y_RANGE, covData);

//     const bafData = await gensDb.getBaf(region.chrom);
//     bafTrack.render(range, BAF_Y_RANGE, bafData);

//     const transcriptData = await gensDb.getTranscripts(region.chrom);
//     transcriptsTrack.render(range, transcriptData);

//     // const variantsData = await gensDb.getVariants(region.chrom);
//     // variantsTrack.render(range, variantsData);
// }

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
