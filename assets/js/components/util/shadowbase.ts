export class ShadowBase extends HTMLElement {
  protected root: ShadowRoot;
  constructor(template: HTMLTemplateElement) {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    if (!this.root) {
      this.root = this.attachShadow({ mode: "open" });
    }
  }
}