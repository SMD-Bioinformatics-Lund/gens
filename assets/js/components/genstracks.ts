import "./tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { extractFromMap, removeChildren } from "../track/utils";
import { GensDb } from "../gens_db";
import { getOverviewData } from "../requests";

const THICK_TRACK_HEIGHT = 80;
const THIN_TRACK_HEIGHT = 20;
const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container">
        <ideogram-track id="ideogram-track"></ideogram-track>
        <overview-track id="overview-track-cov"></overview-track>
        <overview-track id="overview-track-baf"></overview-track>
    
        <dot-track id="coverage-track"></dot-track>
        <dot-track id="baf-track"></dot-track>
        <div id="annotations-container"></div>
        <band-track id="transcript-track"></band-track>
        <band-track id="variant-track" hidden></band-track>
    </div>
`;

export class GensTracks extends HTMLElement {
    protected _root: ShadowRoot;

    ideogramTrack: IdeogramTrack;
    overviewTrackCov: OverviewTrack;
    overviewTrackBaf: OverviewTrack;
    coverageTrack: DotTrack;
    bafTrack: DotTrack;
    transcriptTrack: BandTrack;
    variantTrack: BandTrack;

    annotationsContainer: HTMLDivElement;

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));

        this.ideogramTrack = this._root.getElementById(
            "ideogram-track",
        ) as IdeogramTrack;
        this.overviewTrackCov = this._root.getElementById(
            "overview-track-cov",
        ) as OverviewTrack;
        this.overviewTrackBaf = this._root.getElementById(
            "overview-track-baf",
        ) as OverviewTrack;

        this.coverageTrack = this._root.getElementById(
            "coverage-track",
        ) as DotTrack;
        this.bafTrack = this._root.getElementById("baf-track") as DotTrack;
        this.transcriptTrack = this._root.getElementById(
            "transcript-track",
        ) as BandTrack;
        this.variantTrack = this._root.getElementById(
            "variant-track",
        ) as BandTrack;

        this.annotationsContainer = this._root.getElementById(
            "annotations-container",
        ) as HTMLDivElement;
    }

    // FIXME: Should async be removed from here?
    async initialize(gensDb: GensDb) {
        this.coverageTrack.initialize("Coverage", THICK_TRACK_HEIGHT);
        this.bafTrack.initialize("BAF", THICK_TRACK_HEIGHT);
        this.variantTrack.initialize("Variant", THIN_TRACK_HEIGHT);
        this.transcriptTrack.initialize("Transcript", THIN_TRACK_HEIGHT);
        this.ideogramTrack.initialize("Ideogram", THIN_TRACK_HEIGHT);

        const allChromData = await gensDb.getAllChromData();
        // const chromSizes = Object.fromEntries(
        //     Object.values(allChromData).map((data) => [data.chrom, data.size]),
        // );
        const chromSizes = extractFromMap(allChromData, (data) => data.size);

        this.overviewTrackCov.initialize(
            "Overview (cov)",
            THICK_TRACK_HEIGHT,
            chromSizes,
        );
        this.overviewTrackBaf.initialize(
            "Overview (baf)",
            THICK_TRACK_HEIGHT,
            chromSizes,
        );

        const covData = await gensDb.getOverviewCovData();
        this.overviewTrackCov.render(null, covData, COV_Y_RANGE);

        const bafData = await gensDb.getOverviewBafData();
        this.overviewTrackBaf.render(null, bafData, BAF_Y_RANGE);
    }

    // FIXME: Can it be preloaded, so that this does not need to be async?
    // I guess all data loading ideally could be handled outside?
    async render(gensDb: GensDb, region: Region, annotationSources: string[]) {
        const range: [number, number] = [region.start, region.end];

        const chromInfo = await gensDb.getChromData(region.chrom);
        this.ideogramTrack.render(region.chrom, chromInfo, range);
    
        // FIXME: Move this somewhere?
        removeChildren(this.annotationsContainer)
        for (const source of annotationSources) {
            const annotTrack = new BandTrack();
            this.annotationsContainer.appendChild(annotTrack);
            annotTrack.initialize(source, THIN_TRACK_HEIGHT);
            const annotations = await gensDb.getAnnotations(region.chrom, source);
            annotTrack.render(range, annotations);
        }
    
        const covData = await gensDb.getCov(region.chrom);
        this.coverageTrack.render(range, COV_Y_RANGE, covData);
    
        const bafData = await gensDb.getBaf(region.chrom);
        this.bafTrack.render(range, BAF_Y_RANGE, bafData);
    
        const transcriptData = await gensDb.getTranscripts(region.chrom);
        this.transcriptTrack.render(range, transcriptData);
    }
}

customElements.define("gens-tracks", GensTracks);
