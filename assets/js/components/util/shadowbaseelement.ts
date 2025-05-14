export abstract class ShadowBaseElement extends HTMLElement {
  protected root: ShadowRoot;

  /** Disconnect sets of listeners attached to element on disconnect */
  private abortController;

  protected getListenerAbortSignal(): AbortSignal {
    if (this.abortController == null) {
      throw Error(
        "Must connect component (remember super.connectedCallback()) before adding listeners",
      );
    }
    return this.abortController.signal;
  }

  protected addElementListener(
    element: HTMLElement,
    type: string,
    callback: (event: Event) => void,
  ) {
    element.addEventListener(type, callback, {
      signal: this.getListenerAbortSignal(),
    });
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
