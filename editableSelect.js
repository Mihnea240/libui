export class EditableSelect extends HTMLElement{

    static observedAttributes = [];

    constructor() {
        super();
        this.selected = null;
        this.attachShadow({ mode: "open" });

        this.shadowRoot.innerHTML =/*html */ `
            <style>
                :host{
                    position: relative;
                }
                .drop-container{
                    display: grid;
                    grid-template-rows: 0fr;

                    position: absolute;
                    top: 100%;
                    width: 100%;
                    z-index: 10000;

                    transition: grid-template-rows 500ms;
                }
                [part='container']{
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .open{
                    grid-template-rows: 1fr;
                }
            </style>
            <slot></slot>
            <div class="drop-container">
                <div part="container">
                    <slot name="option"></slot>
                </div>
            </div>

        `

        this.elementSelectedEvent = new CustomEvent("selected", { bubbles: true, detail: {} });
        this.newEntryEvent = new CustomEvent("newentry", { bubbles: true, detail: {} });
        this.entryChangedEvent = new CustomEvent("entrychange", { bubbles: true, detail: {} });

        this.func = (ev) => {
            if (!this.contains(ev.target)) this.dropDown();
            else if (ev.target.matches("[slot='option']")) {
                this.select(ev.target);
                this.dropDown();
            }
        }

        this.dropDown = () => {
            let result = this.shadowRoot.querySelector(".drop-container").classList.toggle("open");
    
            if (result) document.addEventListener("click", this.func);
            else document.removeEventListener("click", this.func);
        };
    }

    set value(val) {
        return this.mainInput.value = value;
    }
    get value() {
        return this.mainInput.value;
    }
    get options() {
        return this.shadowRoot.querySelector("slot[name='option']").assignedNodes();
    }

    add(value) {
        if (!value || this.search(value)) return;

        let template = this.options[0]?.cloneNode(true);
        if (!template) {
            template = document.createElement("div");
            template.setAttribute("slot", "option");
        }
        template.setAttribute("data-value", value);
        template.textContent = value;

        return this.appendChild(template);
    }

    search(text) {
        let slot = this.shadowRoot.querySelector("slot[name='option']");
        return slot.querySelector(`[data-value='${text}']`) || document.evaluate(`//div[text()="${text}"]`, slot, null, XPathResult.ANY_TYPE, null).iterateNext();
    }
    toggleNewEntryMode() {
        if (this.addButton.classList.toggle("active")) {
            this.mainInput.value = "";
            this.mainInput.focus();
            this.mainInput.addEventListener("change", (ev) => {
                this.toggleNewEntryMode();
                this.newEntryEvent.detail.option = this.add(ev.target.value);
                this.dispatchEvent(this.newEntryEvent);
                ev.stopImmediatePropagation();
            }, { once: true })
        }
    }

    getOptionValue(opt) {
        return opt.getAttribute("data-value") || opt.textContent;
    }

    select(element, triggerEvent = true) {
        
        if (typeof element === "string") element = this.search(element);
        if (!element || element===this.selected) return;

        let value = this.getOptionValue(element);
        
        this.elementSelectedEvent.detail.last = this.selected;

        this.mainInput.value = element.textContent || value;
        this.selected = element;

        if (triggerEvent) this.dispatchEvent(this.elementSelectedEvent);
        
        return element;
    }

    connectedCallback() {
        this.mainInput = this.querySelector("[name='main-input']");
        this.addButton = this.querySelector("[name='add-btn']");
        this.dropDownButton = this.querySelector("[name='drop']");

        this.mainInput.addEventListener("change", (ev) => {
            if (this.addButton.classList.contains("active")) return;
            if (!ev.target.value) {
                this.entryChangedEvent.detail.removed = this.selected;

                this.selected.remove();

                this.dispatchEvent(this.entryChangedEvent);
                return this.select(this.options[0]);
            }
            this.entryChangedEvent.detail.removed = false;
            this.selected.textContent = ev.target.value;
            this.dispatchEvent(this.entryChangedEvent);
        });

        this.addButton.addEventListener("click", () => this.toggleNewEntryMode());
        this.dropDownButton.addEventListener("click", this.dropDown);

        this.select(this.options[0]);
    }
}

customElements.define("editable-select", EditableSelect);