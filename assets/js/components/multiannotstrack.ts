const template = document.createElement("template");
template.innerHTML = `
    <div>
        <p id="header">[Header]</p>
        <canvas id="canvas" width="100" height="10"></canvas>
    </div>
`;

export class MultiAnnotsTrack extends HTMLElement {
    private _root: ShadowRoot;

    public setTitle(title: string) {
        const header = this._root.getElementById("header") as HTMLParagraphElement;
        header.textContent = title;
    }

    constructor() {
        super();

        this._root = this.attachShadow({mode: "open"})
        this._root.appendChild(template.content.cloneNode(true));

        const canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
        console.log("Canvas:", canvas);

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "blue";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }    
}

customElements.define("multi-annots-track", MultiAnnotsTrack);
