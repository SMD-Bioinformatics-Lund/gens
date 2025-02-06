const template = document.createElement("template");
template.innerHTML = `
    <div>
        <p id="header">[Header]</p>
        <canvas id="canvas" width="100" height="10"></canvas>
    </div>
`;

class MultiAnnotsTrack extends HTMLElement {
    private _root: ShadowRoot;

    constructor() {
        super();

        const canvas = this._root.getElementById("canvas") as HTMLCanvasElement;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "blue";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }    
}

customElements.define("multi-annots-track", MultiAnnotsTrack);
