class TextInput extends HTMLElement{
    static observedAttributes = ["inputmode","allownewline","readonly","value","decimal","step"];
    constructor() {
        super();
        this.oldValue = "";
        this.isNumber = false;
        this._value = "";
        this.contentEditable = true;
        this.step = 1;

        this.addEventListener("keydown", (ev) => {
            switch (ev.key) {
                case "Enter": {
                    if (!this.allownewline) return ev.preventDefault();
                }
                case "ArrowUp": if (this.isNumber) this.value = this.value + this.step;  this.dispatchEvent(new Event("input",{bubbles: true}));  break;
                case "ArrowDown": if (this.isNumber) this.value=this.value - this.step;  this.dispatchEvent(new Event("input",{bubbles: true}));  break;
            }
            ev.stopImmediatePropagation(); ev.stopPropagation();
            this.oldValue = this.textContent;
            return true;
        })
        this.addEventListener("input", (ev) => {
            //this.innerHTML.replace("</div>", "").replace("<div>", "\n");
            this.value = this.innerText;
        })
        this.addEventListener("blur", function(ev){ 
            if (this.isNumber) this.textContent = this.parseAsNumber(this.value);
            this.dispatchEvent(new Event("change",{bubbles: true}));
        })
    }

    set value(text) {
        text += "";
        let pattern = this.getAttribute("pattern"), check = true;
        let maxLength = parseFloat(this.getAttribute("maxLength")), minLength = parseFloat(this.getAttribute("minLength"));

        if (pattern) text = text.replace(new RegExp(pattern), "");
        if (this.isNumber) {
            text = text.replace(/[^0-9*.+-\/]+/g, "");
            let number = parseFloat(text);
            if (number && this.decimal != undefined) text = number.toFixed(this.decimal) + "";
        }
        if (text.length < minLength || text.length > maxLength) text = this.oldValue;
        this.textContent = text;
    }
    get value() {
        if (this.isNumber) return parseFloat(this.textContent);
        return this.textContent;
    }
    parseAsNumber(text) {
        let rez = 0;
        try { rez = eval(text) || 0; }
        catch (error) { console.log(error) }

        let max = parseFloat(this.getAttribute("max")), min = parseFloat(this.getAttribute("min"));
        if (max && rez > max) rez = max;
        if (min && rez < min) rez = min;
        if (this.decimal != undefined) rez = rez.toFixed(this.decimal);
        return rez;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "inputmode": this.isNumber = Boolean(newValue === "numeric" || newValue === "decimal"); break;
            case "allownewline": this.allownewline = !!newValue; break;
            case "value": this.value = newValue; break;
            case "readonly": {
                if (newValue === "true" || newValue === true) this.setAttribute("contenteditable", false);
                else this.setAttribute("contenteditable", true);
                break;
            }
            case "step": this.step = parseFloat(newValue); break;
            case "decimal": this.decimal = parseInt(newValue); break;
            
        }
    }

    connectedCallback() {
        this.value = this.getAttribute("value") || "";
    }

}
customElements.define("text-input", TextInput);