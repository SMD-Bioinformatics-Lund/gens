export abstract class ShadowBaseElement extends HTMLElement {
  protected root: ShadowRoot;

  private abortController;

  protected getAbortSignal(): AbortSignal {
    if (this.abortController == null) {
      throw Error(
        "Must connect component (remember super.connectedCallback()) before adding listeners",
      );
    }
    return this.abortController.signal;
  }

  constructor(template: HTMLTemplateElement) {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    if (!this.root) {
      this.root = this.attachShadow({ mode: "open" });
    }

    this.abortController = new AbortController();
  }

  disconnectedCallback() {
    this.abortController.abort();
  }
}
