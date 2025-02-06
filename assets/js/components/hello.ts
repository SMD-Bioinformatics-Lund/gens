import { get } from "../fetch";

async function getAnnotationSources(): Promise<string[]> {

    const results = await get("get-annotation-sources", {genome_build: 38});
        // .getHeaderNames((result) => {
        //     console.log(result);
        // })

    console.log(results.sources);

    return [];
}

class HelloWorld extends HTMLElement {

    private _message: string = "Hello world!";
    private _ballColor: string = "red";
    private _textElement: HTMLElement = null;

    setMessage(message: string) {
        console.log("Assigning message", message);
        this._textElement.textContent = message;

        getAnnotationSources();
    }

    constructor() {
        super();

        const shadow = this.attachShadow({ mode: "open" });

        const wrapper = document.createElement("p");
        wrapper.textContent = "Hello World!";
        shadow.appendChild(wrapper);
        this._textElement = wrapper;

        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        shadow.appendChild(canvas);

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
