class HelloWorld extends HTMLElement {
    constructor() {
        super();

        const shadow = this.attachShadow({ mode: "open" });

        const wrapper = document.createElement("p");
        wrapper.textContent = "Hello World!";

        shadow.appendChild(wrapper);
    }
}

customElements.define("hello-world", HelloWorld);
