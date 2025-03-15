export class ListView extends HTMLElement{
    static sizeObserver=new ResizeObserver((entries) => {
        for (let entry of entries) {
            let list = entry.target;
            let { inlineSize: w, blockSize: h } = entry.borderBoxSize[0];
            
            if(list.size.x+list.size.y)
                if ((list.direction == 0 && Math.abs(list.size.y - h) < 1) || (list.direction == 1 && Math.abs(list.size.x - w) < 1)) continue;
            
            list.size.x = w;
            list.size.y = h;
            list.render();
        }
    })
    static styleDeclaration=/*html */`
        <style>
            :host{
                display: flex;
                z-index: 100;
                overflow: scroll;

            }
            :host([direction="row"]) [part=container]{
                flex-direction: row;
            }
            :host([direction="column"]) [part=container]{
                flex-direction: column;
            }
            :host([length=auto]) [part=container]{
                flex-grow: 0;
            }
            :host([length=auto]){
                overflow: hidden;
            }
            ::slotted([slot=item]) {
                transition: margin 250ms ease-in;
            }

            ::slotted(.dragging){
                opacity: 0.5;
            }
            ::slotted(.dragend){
                transition: none;
            }
            :host([direction=column]) ::slotted(.dragover){
                margin-bottom: var(--margin-value);
            }
            :host([direction=row]) ::slotted(.dragover){
                margin-right: var(--margin-value);
            }
            
            [part=container]{
                display: flex;
                width: 100%;
                height:100%;
                --margin-value: 20px;
            }
        </style>
        <div part="container">
            <slot name='item'></slot>
            <slot></slot>
        </div>
    `.trim();

    static enum = {
        slotSelector: "[slot='item']",
        indexAttribute: "data-list-index",
        slotShadowSelector: "slot[name='item']",
        _slot: "item",
        set slot(value) {
            this._slot = value;
            this.slotSelector = `[slot='${value}']`;
            this.slotShadowSelector = `slot[name='${value}']`;
        },
        get slot() {return this._slot;}
    }

    static defaultFunctions = {
        template() { return document.createElement("div") },
        load(node, val) { return node.textContent = val },
        countingFunction(index) { return index; }
    }

    /**@param {HTMLElement} node*/
    static closestListNode(node) {
        return node.matches(ListView.enum.slotSelector) ? node : node.closest(ListView.enum.slotSelector);
    }

    /**@param {HTMLElement} node*/
    static index(node) {
        return parseInt(node.getAttribute(ListView.enum.indexAttribute));
    }

    static observedAttributes = ["length", "padding", "autoflow", "direction", "target", "drag", "start"];

    constructor(){
        super();
        /**@description Creates UI elements*/
        this.template = ListView.defaultFunctions.template;

        /**@description Defines how the data is displayed in the elements created bt template()*/
        this.load = ListView.defaultFunctions.load;

        /**@description Defines the autogeneration of data based on an index */
        this.countingFunction = ListView.defaultFunctions.countingFunction;

        this.scrollEventHandler = ev => this.move(ev.deltaY * 0.05);
        
        
        this.autoflow = this.autofit = this.drag = this.live = false;
        this.viewLength = -1;
        this.flow = this.firstIndex = this.paddingElements = 0;
        
        this.size = { x: 0, y: 0 };
        this.unit = { x: 0, y: 0 };
        this.scrollOffset = { x: 1, y: 1 };
        this.dragStoarge = {
            originalTarget: null,
            marginValue: 0,
            lastDrop: null,
            dropEvent: null,
        }
        
        const shadow = this.attachShadow({mode: "open"});
        shadow.innerHTML = ListView.styleDeclaration;
        
        this.list = this.observedList = [];
        

        this.tabIndex = 0;
        this.addEventListener("keydown", this.arrowScrollHandler);
        this.addEventListener("wheel", this.scrollEventHandler);
        this.itemSlot.addEventListener("slotchange", this.slotChangedHandler)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch(name){
            case "length": {
                switch (newValue) {
                    case "auto": this.autofit = true; break;
                    case null: case undefined: this.autofit = false; break;
                    default: {
                        this.autofit = false;
                        this.length = parseInt(newValue) || 0;
                        return; 
                    }
                }
                this.render(); break;
            }
            case "autoflow": this.autoflow = newValue; this.render(); break;
            case "direction": this.direction = newValue; this.render(); break;
            case "target": this.scrollTarget = this.closest(newValue); break; 
            case "padding": this.paddingElements = parseInt(newValue); this.render(); break;
            case "drag": this.drag = newValue === "true" ? true : false; this.dragSetup(); break;
            case "start": this.start = newValue; break;
        }
    }

    set direction(val) {
        if (val === "column") this.flow = 0;
        else if (val === "row") this.flow = 1;
        else this.flow = val;
    }
    get direction() { return this.flow; }

    set length(val) {
        this.viewLength = val || 0;
        if (this.autofit) this.autofit = false;
        if (this.getAttribute("length") === "auto") this.setAttribute("length", val);
        else this.render();
    }
    get length() { return this.viewLength }

    set target(target) {
        this.target?.removeEventListener("scroll", this.scrollEventHandler);
        this.scrollTarget = target;
        this.scrollTarget.addEventListener("scroll", this.scrollEventHandler);
    }
    get target() { return this.scrollTarget }

    set list(newList) {
        this.observedList = new Proxy(this.unobservedList=newList, {
            set: (obj, prop, value) => {
                obj[prop] = value;
                if (prop == "length") this.render();
                else this.update(parseInt(prop));
                return true;
            }
        })
        this.render();
        this.update();
    }
    /**@returns {[]} */
    get list() { return this.observedList; }

    set start(value) {
        if (this.autoflow) this.firstIndex = value;
        else if (value < this.list.length) {
            if (value < 0) value = 0;
            this.firstIndex = value;

            let dif = this.firstIndex + this.items.length - this.list.length;
            if (dif > 0) this.firstIndex -= dif;
        } else return;
        this.update();
    }
    get start() { return this.firstIndex; }

    get itemSlot() {
        return this.shadowRoot.querySelector(ListView.enum.slotShadowSelector);
    }
    get items() { return this.itemSlot.assignedNodes(); }

    //List interface
    /**@description Adds an element from the value at list[index] */
    pushItem(index) {
        let data = this.data(index);
        if (data!==undefined) {
            let child = this.template();
            child.slot = ListView.enum.slot;

            child.setAttribute(ListView.enum.indexAttribute, index);

            if (this.drag) child.setAttribute("draggable", true);
            if (this.load(child, data, index)!==false) return this.appendChild(child);
        }
    }
    popItem() {
        let n = this.children.length;
        if (n == 0) return;
        this.children[n - 1].remove();
        if (n <= this.list.length) return this.list[n - 1];
    }
    clear() {
        this.list = [];
        this.itemSlot.innerHTML = "";
    }
    insert(index, ...data) {
        let list = this.unobservedList;
        for (let i = list.length - 1; i >= index; i--){
            list[i + data.length] = list[i];
        }
        for (let i = 0; i < data.length; i++){
            list[i + index] = data[i];
        }
        this.list = list;
    }

    //Rendering
    getWindowSize() {
        let n;
        if (this.autofit) {
            if (!this.getUnit()) {
                this.pushItem(0);
                this.getUnit();
            };
            n = Math.floor(this.getSize() / this.getUnit()) - this.paddingElements;
            if (!this.autoflow) {
                //if (this.length > 0) n = Math.min(n, this.length);
                n = Math.min(n, this.list.length);
            }
        } else if (this.length < 0) n = this.list.length;
        else n = Math.min(this.length, this.list.length);
        return n;
    }
    render() {
        if (!this.live) return;
        
        let val = this.getWindowSize(), n = this.items.length;

        for (let i = n; i < val; i++) this.pushItem(i + this.firstIndex);
        for (let i = n; i > val; i--)this.popItem();

    }
    update(index) {
        let n = this.items.length;
        if (index === undefined) {
            for (let i = 0; i < n; i++) {
                let data = this.data(i + this.firstIndex);

                if (data != undefined) {
                    this.load(this.items[i], data, i + this.firstIndex);
                    this.items[i].setAttribute(ListView.enum.indexAttribute, i);
                }
            }
        }
        else if (index >= 0 && index < n) {
            this.load(this.items[index], this.data(index + this.firstIndex), index + this.firstIndex);
            this.items[index].setAttribute(ListView.enum.indexAttribute, index);

        }
    }
    
    data(index) {
        return (index >= 0 && index < this.list.length) ? this.list[index] : this.autoflow ? this.countingFunction(index) : undefined;
    }

    //Utils
    directionToAxix() {
        return this.flow ? "x" : "y";
    }
    directionToSize() {
        return this.flow ? "width" : "height";
    }
    

    getUnit(recalculate=false) {
        if (recalculate || this.unit.x + this.unit.y == 0) {
            let rect = this.items[0]?.getBoundingClientRect();
            if (!rect) return;
            this.unit.x = rect.width;
            this.unit.y = rect.height;
        }
        return this.unit[this.directionToAxix()] || 1;
    }
    getSize() {
        return this.size[this.directionToAxix()];
    }
    getScroll(scrollVector) {
        if (!scrollVector) scrollVector = this.scrollOffset;
        return this.scrollTarget?.[this.flow ? "scrollLeft" : "scrollTop"] || scrollVector[this.directionToAxix()];
    }
    getContainer() { return this.shadowRoot.querySelector("[part=container]") }
    
    move(value) {
        if (!this.autoflow) {
            let scroll = { x: this.scrollOffset.x, y: this.scrollOffset.y };
            if (this.flow) {
                scroll.x += value;
                if (scroll.x < 0) scroll.x = 0;
                if (scroll.x > this.size.x) scroll.x = this.size.x;
    
            } else {
                scroll.y += value;
                if (scroll.y < 0) scroll.y = 0;
                if (scroll.y > this.size.y) scroll.y = this.size.y;
            }
            
            let dI = value / this.getUnit();
            this.start += (dI < 0 ? -Math.ceil(-dI) : Math.ceil(dI));
    
            this.scrollOffset.x = scroll.x;
            this.scrollOffset.y = scroll.y;        
        }

        let v = this.getScroll() / this.getUnit();
        if(this.autoflow){
            this.start = Math.floor(this.getScroll() / this.getUnit());
        }

        let to = (Math.floor(v) - v) * this.getUnit();
        let x = 0, y = 0;
        this.flow ? x = to : y = to;

        this.getContainer().style.cssText += `transform: translate(${x}px, ${y}px)`;      
    }

    //Event handlers
    dragStart(ev) {
        let target = ListView.closestListNode(ev.target);
        if (!target) return;

        target.classList.add("dragging");
        this.dragStoarge.originalTarget = target;
        this.getContainer().style.setProperty("--margin-value", target.getBoundingClientRect()[this.directionToSize()]+"px");
    }
    dragOver(ev) {
        let target = ListView.closestListNode(ev.target);
        if (!target  || target === this.dragStoarge.lastDrop) return;

        this.dragStoarge.lastDrop?.classList.remove("dragover");
        this.dragStoarge.lastDrop = target;
        this.dragStoarge.lastDrop?.classList.add("dragover");


        // if (!this.direction) target.style.margin = `0 0 ${wall}px 0`;
        // else target.style.margin = `0 ${wall}px 0 0`;
    }
    dragEnd(ev) {
        let target = ListView.closestListNode(ev.target);
        if (!target) return;

        target.classList.remove("dragging");
        if (this.dragStoarge.lastDrop) {
            let dropzone = ListView.index(this.dragStoarge.lastDrop);
            let packet = ListView.index(this.dragStoarge.originalTarget);
            let list = this.unobservedList;
            let data = this.list[packet];

            if (packet < dropzone) {
                
                for (let i = packet; i < dropzone; i++) {
                    list[i] = list[i + 1];
                    this.update(i);
                }
                list[dropzone] = data;
                this.update(dropzone);
                
            } else if (packet > dropzone) {
                
                for (let i = packet; i > dropzone + 1; i--) {
                    list[i] = list[i - 1];
                    this.update(i);
                }
                list[dropzone + 1] = data;
                this.update(dropzone + 1);
            }

            this.dragStoarge.lastDrop.classList.remove("dragover");
            this.dragStoarge.lastDrop.classList.add("dragend");
            setTimeout(() => this.dragStoarge.lastDrop.classList.remove("dragend"), 20);
            //this.dragStoarge.lastDrop.style.cssText += `margin: 0; transition: none;`;
        }

        this.dragStoarge.originalTarget = null;
    }
    

    dragSetup() {
        if (this.drag) {
            for (const node of this.items) node.setAttribute("draggable", true);

            this.addEventListener("dragstart", this.dragStart);
            this.addEventListener("dragover", this.dragOver);
            this.addEventListener("dragend", this.dragEnd);
        } else {
            this.removeEventListener("dragstart", this.dragStart);
            this.removeEventListener("dragover", this.dragOver);
            this.removeEventListener("dragend", this.dragEnd);

            for (const node of this.items) node.removeAttribute("draggable");
        }
        return this.drag;
    }

    arrowScrollHandler(ev) {
        if (ev.key == "ArrowLeft" || ev.key == "ArrowUp") this.move(-this.getUnit());
        else if(ev.key=="ArrowRight" || ev.key=="ArrowDown") this.move(this.getUnit());
    }

    slotChangedHandler() {
        if (this.items?.length == 1) this.getUnit(true);
    }

    scrollTo() {
        switch (arguments.length) {
            case 2: return super.scrollTo(arguments);
            case 1: {
                let arg = arguments[0], index;
                switch (typeof arg) {
                    case "object": return super.scrollTo(arguments);
                    case "number": index = arg || 0; break;
                    case "string": index = parseInt(arg) || 0; break;
                }
                this.start = index;
                this.getContainer().style.cssText += `transform: translate(${0}px, ${0}px)`;     
            }
        }
    }

    connectedCallback() {
        this.live = true;
        ListView.sizeObserver.observe(this);
        if (!this.getAttribute("direction")) this.setAttribute("direction", "column");
        
    }
}

customElements.define("list-view",ListView);