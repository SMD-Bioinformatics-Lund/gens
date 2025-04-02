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
import {
    getAnnotationDataForChrom,
    getBafData,
    getCovAndBafFromOldAPI,
    getCovData,
} from "./tmp";
import { GensCache } from "./cache";
// import { get } from "http";

const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

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

    const inputControls = document.getElementById(
        "input-controls",
    ) as InputControls;

    // @ts-ignore
    const startRegion: Region = window.regionConfig;
    const startRange: [number, number] = [startRegion.start, startRegion.end];
    const tallTrackHeight = 80;
    const thinTrackHeight = 20;

    const gensCache = new GensCache();

    coverageTrack.initialize("Coverage", tallTrackHeight);
    // coverageTrack.render(startRange, COV_Y_RANGE, covDots);
    bafTrack.initialize("BAF", tallTrackHeight);
    // bafTrack.render(startRange, BAF_Y_RANGE, bafDots);
    variantTrack.initialize("Variant", thinTrackHeight);
    // variantTrack.render(1, 10, dots);
    transcriptTrack.initialize("Transcript", thinTrackHeight);
    // transcriptTrack.render(1, 10, []);
    annotationTrack.initialize("Annotation", thinTrackHeight);

    const defaultAnnot = "mimisbrunnr";

    renderTracks(
        gensCache,
        startRegion,
        defaultAnnot,
        annotationTrack,
        coverageTrack,
        bafTrack,
    );

    // FIXME: Look into how to parse this for predefined start URLs
    inputControls.initialize(
        startRegion,
        defaultAnnot,
        async (region) => {
            // const {cov, baf} = await getCovAndBafFromOldAPI(region);
            // coverageTrack.render(xRange, COV_Y_RANGE, cov);
            // bafTrack.render(xRange, BAF_Y_RANGE, baf);
        },
        async (region, source) => {
            const annotations = await getAnnotationDataForChrom(
                region.chrom,
                source,
            );
            annotationTrack.render([region.start, region.end], annotations);

            // const xRange: [number, number] = [startRegion.start, startRegion.end];
            // const yRange: [number, number] = [-4, 4];
            // coverageTrack.render(xRange, yRange, dots);
        },
        async (_newXRange) => {
            const region = inputControls.getRegion();
            const annotSource = inputControls.getSource();

            renderTracks(
                gensCache,
                region,
                annotSource,
                annotationTrack,
                coverageTrack,
                bafTrack,
            );
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

async function renderTracks(
    gensCache: GensCache,
    region: Region,
    annotationSource: string,
    annotationTrack: AnnotationTrack,
    coverageTrack: DotTrack,
    bafTrack: DotTrack,
) {
    const range: [number, number] = [region.start, region.end];

    console.log(`Rendering. Chrom: ${region.chrom} Range: ${range} Annot: ${annotationSource}`);

    let annotations;
    if (gensCache.isAnnotCached(region.chrom, annotationSource)) {
        annotations = gensCache.getAnnotations(region.chrom, annotationSource);
    } else {
        annotations = await getAnnotationDataForChrom(
            region.chrom,
            annotationSource,
        );
        gensCache.setAnnotations(region.chrom, annotationSource, annotations);
    }
    annotationTrack.render(range, annotations);

    let covData;
    if (gensCache.isCovCached(region.chrom)) {
        covData = gensCache.getCov(region.chrom);
    } else {
        covData = await getCovData(region);
        gensCache.setCov(region.chrom, covData);
    }
    coverageTrack.render(range, COV_Y_RANGE, covData);

    let bafData;
    if (gensCache.isBafCached(region.chrom)) {
        bafData = gensCache.getBaf(region.chrom);
    } else {
        bafData = await getBafData(region);
        gensCache.setBaf(region.chrom, bafData);
    }
    bafTrack.render(range, BAF_Y_RANGE, bafData);
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
