// GENS module

import { InteractiveCanvas } from "./interactive";
import { OverviewCanvas } from "./overview";
import {
    VariantTrack,
    AnnotationTrack,
    TranscriptTrack,
    CytogeneticIdeogram,
} from "./track";
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
import "./components/canvas_track";
import { CanvasTrack } from "./components/canvas_track";
import { get } from "./fetch";
import { parseRegionDesignation } from "./navigation";
// import { get } from "http";

export function initCanvases({
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
    const coverageTrack = document.getElementById(
        "coverage-track",
    ) as CanvasTrack;
    const bafTrack = document.getElementById("baf-track") as CanvasTrack;
    const annotationTrack = document.getElementById(
        "annotation-track",
    ) as CanvasTrack;
    const transcriptTrack = document.getElementById(
        "transcript-track",
    ) as CanvasTrack;
    const variantTrack = document.getElementById(
        "variant-track",
    ) as CanvasTrack;

    const sourceList = document.getElementById(
        "source-list",
    ) as HTMLSelectElement;
    sourceList.style.visibility = "visible";

    get("get-annotation-sources", { genome_build: 38 }).then((result) => {
        const filenames = result.sources;
        for (const filename of filenames) {
            const opt = document.createElement("option");
            opt.value = filename;
            opt.innerHTML = filename;

            sourceList.appendChild(opt);
        }
    });

    const regionField = document.getElementById(
        "region-field",
    ) as HTMLInputElement;

    annotationTrack.render(1, 10, []);

    let annotationData = [];
    sourceList.addEventListener("change", async () => {
        const source = sourceList.value;

        const region = parseRegionDesignation(regionField.value);

        const payload = {
            sample_id: undefined,
            region: `${region.chrom}:${region.start}-${region.end}`,
            genome_build: 38,
            collapsed: true,
            source: source,
        };

        // Current positions?
        const annotsResult = await get("get-annotation-data", payload);
        console.log(annotsResult);

        annotationTrack.render(
            region.start,
            region.end,
            annotsResult.annotations,
        );

        // Force redraw here
        // console.log(`Redrawing source: ${source}`);
    });

    // <canvas-track id="coverage-track"></canvas-track>
    // <canvas-track id="baf-track"></canvas-track>
    // <canvas-track id="annotation-track"></canvas-track>
    // <canvas-track id="transcript-track"></canvas-track>
    // <canvas-track id="variant-track"></canvas-track>

    const annots = [
        {
            chrom: "1",
            color: [0,0,255],
            start: 2,
            end: 4,
            genome_build: 38,
            name: "test",
            source: "test",
        },
        {
            chrom: "1",
            color: [255, 0, 0],
            start: 5,
            end: 7,
            genome_build: 38,
            name: "test",
            source: "test",
        },
        {
            chrom: "1",
            color: [0, 255, 0],
            start: 9,
            end: 10,
            genome_build: 38,
            name: "test",
            source: "test",
        },
    ];
    coverageTrack.initialize("Coverage")
    coverageTrack.render(1, 10, annots);
    bafTrack.initialize("BAF");
    bafTrack.render(1, 10, []);
    variantTrack.initialize("Variant");
    variantTrack.render(1, 10, []);
    transcriptTrack.initialize("Transcript");
    transcriptTrack.render(1, 10, []);

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
