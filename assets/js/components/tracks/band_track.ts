import { createTooltipElement, makeVirtualDOMElement } from "../../track/tooltip";
import { stringToHash } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initializeCanvas(label, trackHeight);
        console.log("Initializing band track", label);
    }

    render(xRange: [number, number], annotations: RenderBand[]) {
        const dimensions = super.syncDimensions();
        
        const annotWithinRange = annotations.filter(
            (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
        );

        // Hover

        renderBorder(this.ctx, dimensions);
        renderBands(this.ctx, dimensions, annotWithinRange, xRange);

        // this.renderTooltip(annotWithinRange);
    }

    // renderTooltip(annotations: RenderBand[]) {
    //     const tooltip = createTooltipElement({
    //     id: "popover-${annotationObj.id}",
    //     title: "annotationObj.name",
    //     information: [
    //         { title: "More info", value: "Value" }
    //         // { title: track.chrom, value: `${track.start}-${track.end}` },
    //         // { title: "Score", value: `${track.score}` },
    //     ],
    //     });
    //     this.trackContainer.appendChild(tooltip);

    //     for (const track of annotations) {
    //         const annotationObj = {
    //           id: stringToHash(
    //             `${track.name}-${annotations.start}-${track.end}-${track.color}`
    //           ),
    //           name: "track.name",
    //           start: track.start,
    //           end: track.end,
    //           x1: x1,
    //           x2: x1 + scale * (end - start + 1),
    //           y1: canvasYPos,
    //           y2: canvasYPos + this.featureHeight / 2,
    //           features: [],
    //           isDisplayed: false,
    //         } as DisplayElement;
      
    //           const virtualElement = makeVirtualDOMElement({
    //           x1: annotationObj.visibleX1,
    //           x2: annotationObj.visibleX2,
    //           y1: annotationObj.visibleY1,
    //           y2: annotationObj.visibleY2,
    //           canvas: this.contentCanvas,
    //           });
    //     }
    // }
}

customElements.define("band-track", BandTrack);
