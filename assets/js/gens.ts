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

import "./components/simple_track";
import "./components/tracks/canvas_track";
import "./components/tracks/annotation_track";
import "./components/tracks/dot_track";
// import "./components/tracks/coverage_track";
import "./components/input_controls";
import { InputControls } from "./components/input_controls";
import { AnnotationTrack } from "./components/tracks/annotation_track";
import { CanvasTrack } from "./components/tracks/canvas_track";
import { DotTrack } from "./components/tracks/dot_track";
// import { AnnotationTrack } from "./components/tracks/annotation_track";
// import { CoverageTrack } from "./components/tracks/coverage_track";
import { get } from "./fetch";
import { getAnnotationData, getCovAndBafFromOldAPI } from "./tmp";
// import { get } from "http";

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
    const coverageTrack = document.getElementById("coverage-track") as DotTrack;
    const bafTrack = document.getElementById("baf-track") as DotTrack;
    const annotationTrack = document.getElementById(
        "annotation-track",
    ) as AnnotationTrack;
    const transcriptTrack = document.getElementById(
        "transcript-track",
    ) as CanvasTrack;
    const variantTrack = document.getElementById(
        "variant-track",
    ) as CanvasTrack;

    const sourcesList = document.getElementById(
        "source-list",
    ) as HTMLSelectElement;
    sourcesList.style.visibility = "visible";

    const inputControls = document.getElementById(
        "input-controls",
    ) as InputControls;


    // @ts-ignore
    const startRegion: Region = window.regionConfig;
    const trackHeight = 50;

    // const region = inputControls.getRegion()

    // console.log("Parsed region", region);

    annotationTrack.initialize("Annotation", trackHeight);
    annotationTrack.render(startRegion, []);

    const dots = [
        {
            pos: 10000000,
            value: -3,
            color: "red",
        },
        {
            pos: 20000000,
            value: -2,
            color: "green",
        },
        {
            pos: 30000000,
            value: 0,
            color: "black",
        },
        {
            pos: 40000000,
            value: -2,
            color: "blue",
        },
    ];

    const COV_Y_RANGE: [number, number] = [-4, 4];
    const BAF_Y_RANGE: [number, number] = [0, 1];


    coverageTrack.initialize("Coverage", trackHeight);
    bafTrack.initialize("BAF", trackHeight);
    // bafTrack.render(1, 10, []);
    variantTrack.initialize("Variant", trackHeight);
    // variantTrack.render(1, 10, []);
    transcriptTrack.initialize("Transcript", trackHeight);
    // transcriptTrack.render(1, 10, []);

    // FIXME: Look into how to parse this for predefined start URLs
    inputControls.initialize(
        startRegion,
        async (region) => {
            const {cov, baf} = await getCovAndBafFromOldAPI(region);
            coverageTrack.render(xRange, COV_Y_RANGE, cov);
            bafTrack.render(xRange, BAF_Y_RANGE, baf);        
        },
        async (region, source) => {

            const annotations = await getAnnotationData(region, source);
            annotationTrack.render(region, annotations);

            // const xRange: [number, number] = [startRegion.start, startRegion.end];
            // const yRange: [number, number] = [-4, 4];
            // coverageTrack.render(xRange, yRange, dots);        

        },
        (_newXRange) => {
            console.log("Zoom logic coming here");
            // annotationTrack.render(region, annotsResult.annotations);
        }
    );

    const annotations = await getAnnotationData(startRegion, "mimisbrunnr");
    console.log(annotations);
    annotationTrack.render(startRegion, annotations);

    const {cov, baf} = await getCovAndBafFromOldAPI(startRegion);
    const xRange: [number, number] = [startRegion.start, startRegion.end];
    coverageTrack.render(xRange, COV_Y_RANGE, cov);
    bafTrack.render(xRange, BAF_Y_RANGE, baf);

    // initialize and return the different canvases
    // WEBGL values
    const near = 0.1;
    const far = 100;
    const lineMargin = 2; // Margin for line thickness
    // // Listener values
    const inputField = document.getElementById("region-field");

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

// Reloads page to printable size
export function loadPrintPage(region) {
    let location = window.location.href.replace(
        /region=.*&/,
        `region=${region}&`,
    );
    location = location.includes("?")
        ? `${location}&print_page=true`
        : `${location}?print_page=true`;
    window.location.replace(location);
}

// Show print prompt and reloads page after print
export function printPage() {
    document.querySelector(".no-print").toggleAttribute("hidden");
    window.addEventListener(
        "afterprint",
        () => {
            window.location.replace(
                window.location.href.replace("&print_page=true", ""),
            );
        },
        { once: true },
    );
    print();
}

export { CHROMOSOMES, setupGenericEventManager } from "./track";
