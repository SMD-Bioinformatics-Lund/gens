const template = document.createElement("template");
template.innerHTML = `
    <div>Hello from the inside</div>
`;

export class SimpleTrack extends HTMLElement {
    private _root: ShadowRoot;

    public initialize() {}

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));    
    }

    constructor() {
        super();
    }
}

customElements.define("simple-track", SimpleTrack);
