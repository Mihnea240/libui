export class DropMenu extends HTMLElement{
    static shadowDom=/*html*/`
        <style>
            :host{
                position: relative;
            }
            .drop-container{
                display: grid;
                grid-template-rows: 0fr;

                position: relative;
                
                width: 100%;

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
        <div class="drop-container">
            <div part="container">
                <slot></slot>
            </div>
        </div>

        
    `
    static observedAttributes = ["for","open"];

    constructor() {
        super();

        const shadow=this.attachShadow({ mode: "open" });
        shadow.innerHTML = DropMenu.shadowDom;
        
        this._trigger = null;
        this.toggleFunction = () => this.toggle();
    }

    toggle(force) {
        return this.shadowRoot.querySelector(".drop-container").classList.toggle("open", force);
    }


    attributeChangedCallback(name, oldValue, newValue) {
        switch(name){
            case "for": {
                let newTrigger = document.querySelector(newValue);
                if (newTrigger) this.trigger = newTrigger;
                break;
            }
            case "open": this.toggle(newValue == "false" ? false : true);
        }
    }
    set trigger(value) {
        this._trigger?.removeEventListener("click", this.toggleFunction);
        this._trigger = value;
        this._trigger?.addEventListener("click", this.toggleFunction);
    }
    get rigger() {
        return this, this._trigger;
    }
    get open() {
        return this.shadowRoot.querySelector(".drop-container").classList.contains("open");
    }

}

customElements.define("drop-menu", DropMenu);