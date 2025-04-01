const template = document.createElement("template");
template.innerHTML = `
    <div>
        <p id="header">[Header]</p>
        <canvas id="canvas"></canvas>
    </div>
`;

export class MultiAnnotsTrack extends HTMLElement {
  private _root: ShadowRoot;

  public setTitle(title: string) {
    const header = this._root.getElementById("header") as HTMLParagraphElement;
    header.textContent = title;
  }

  constructor(chrStart: number, chrEnd: number, annotations: TestAnnot[]) {
    super();

    console.log(
      `Next: Visualize annots in range ${chrStart}-${chrEnd} (nbr annots: ${annotations.length})`
    );

    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    const canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
    canvas.width = 500;
    canvas.height = 20;
    console.log("Canvas:", canvas);

    const viewNts = chrEnd - chrStart;
    const scaleFactor = canvas.width / viewNts;

    const drawAnnots = annotations.map((annot) => {
        const viewStart = annot.start * scaleFactor;
        const viewEnd = annot.end * scaleFactor;
        return {
            start: viewStart,
            end: viewEnd,
            color: annot.color
        }
    })

    // const drawAnnots = [
    //   { start: 10, end: 20 },
    //   { start: 40, end: 50 },
    // ];

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const dim = {
      width: canvas.width,
      height: canvas.height,
    };
    this._renderBorder(ctx, dim);
    this._renderAnnotations(ctx, dim, drawAnnots);
  }

  private _renderBorder(
    ctx: CanvasRenderingContext2D,
    canvasDim: { height: number; width: number }
  ) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasDim.width, canvasDim.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasDim.width, canvasDim.height);
  }

  private _renderAnnotations(
    ctx: CanvasRenderingContext2D,
    canvasDim: { height: number; width: number },
    annots: { start: number; end: number, color: number[] }[]
  ) {
    annots.forEach((annot) => {
        const c = annot.color;
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        const width = annot.end - annot.start;
      ctx.fillRect(annot.start, 0, width, canvasDim.height);
    });
  }
}

customElements.define("multi-annots-track", MultiAnnotsTrack);