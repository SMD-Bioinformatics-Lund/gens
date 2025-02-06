import { get } from "../fetch";

async function getAnnotationSources(): Promise<string[]> {

    const results = await get("get-annotation-sources", {genome_build: 38});
    return results.sources;
}

const template = document.createElement("template");
template.innerHTML = `
    <div>
        <p id="message">Placeholder</p>
        <canvas id="canvas" width="100" height="100"></canvas>
        <select id="annotations" multiple></select>
    </div>
`;

class HelloWorld extends HTMLElement {

    private _root: ShadowRoot;

    private _message: string = "Hello world!";
    private _ballColor: string = "red";
    private _annotSources: HTMLElement[] = [];

    async setMessage(message: string) {
        console.log("Assigning message", message);
        this._annotSources.map((source) => source.remove());
        // this._textElement.textContent = message;

        const annotSelect = this._root.querySelector("#annotations") as HTMLSelectElement | null;
        if (annotSelect) {
            annotSelect.innerHTML = "";
        }
        const annotSources = await getAnnotationSources();
        annotSources.forEach((source) => {
            const option = document.createElement("option");
            option.value = source;
            option.textContent = source;
            annotSelect?.appendChild(option);

            // const element = document.createElement("p");
            // element.textContent = source;
            // this._root.appendChild(element);
        })
    }

    constructor() {
        super();

        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));

        const helloElement = this._root.getElementById("message");
        helloElement.textContent = "Hello World!"
        // const wrapper = document.createElement("p");
        // shadow.appendChild(wrapper);
        // this._textElement = wrapper;

        const canvas = this._root.getElementById("canvas") as HTMLCanvasElement;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.beginPath();
            ctx.arc(50, 50, 20, 0, 2 * Math.PI);
            ctx.fillStyle = "blue";
            ctx.fill();
            ctx.closePath();
        }
    }
}

customElements.define("hello-world", HelloWorld);
