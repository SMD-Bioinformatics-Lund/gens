export class ShadowBaseElement extends HTMLElement {
  protected root: ShadowRoot;
  // protected readonly host: HTMLElement;
  constructor(template: HTMLTemplateElement) {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.appendChild(template.content.cloneNode(true));

    // this.host = this;
  }

  connectedCallback() {
    if (!this.root) {
      this.root = this.attachShadow({ mode: "open" });
    }
  }
}