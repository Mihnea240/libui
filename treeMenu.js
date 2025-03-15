export class Types{
    static getValue(node) {
        if (!node.getAttribute("data-leaf")) return;   
        return this[node.getAttribute("data-type") || "Default"].get(node);
    }
    static setValue(node, value) {
        if (!node.getAttribute("data-leaf")) return;
        return this[node.getAttribute("data-type") || "Default"].set(node, value);
    }
    static instantiate(name, data) {
        switch (typeof data) {
            case "string": return this.Text.instantiate(name, data);
            case "number": case "bigint": return this.Text.instantiate(name, data);
            case "boolean": return this.Bool.instantiate(name, data);
            case "object": {
                let element = this[data.type || "Default"].instantiate(name, data.value);
                return element;
            }
        }
    }

    static Default= class {
        static instantiate(name) {
            let element = document.createElement("div");
            let text = document.createElement("div");
            let input = document.createElement("input");

            text.textContent = name + " : ";
            element.append(text);
            element.appendChild(input);
            element.setAttribute("data-type", "Default");

            return element;
        }
        static set(node,value) {return node.querySelector("input").value = value;}
        static get(node) {return node.querySelector("input").value;}
    }

    static Text = class extends this.Default{
        static instantiate(name, data) {
            let element = super.instantiate(name);
            element.querySelector("input").setAttribute("type", "text");
            element.setAttribute("data-type", "Text");
            this.set(element, data);
            return element
        }
    }
    
    static Number = class extends this.Default{
        static instantiate(name,data) {
            let element = super.instantiate(name);
            element.querySelector("input").setAttribute("type", "number");
            element.setAttribute("data-type", "Number");

            this.set(element, data);
            return element
        }
        
    }

    static Bool= class extends this.Default{
        static instantiate(name, data) {
            let element = super.instantiate(name);
            element.querySelector("input").setAttribute("type", "checkbox");
            element.setAttribute("data-type", "Bool");

            this.set(element, data);
            return element
        }
        static set(node, value) { node.querySelector("input[type='checkbox']").checked = !!value }
        static get(node) { return node.querySelector("input[type='checkbox']").checked }
    }

}

export class TreeMenu extends HTMLElement{
    static enum = {
        node: "data-node",
        leaf: "data-leaf",
    }
    static nodeTemplate(name) {
        let div = document.createElement("div");
        div.setAttribute("data-node", name);
        return div;
    }

    constructor() {

        super();

        this.proxyTraps = {

            get: (target, key) => {
                return target[key];
            },

            set: (target, key, data, receiver) => {
                if (data?.hasOwnProperty("bypassSecurity")) {
                    target[key] = data.bypassSecurity;
                    return true;
                }
                let prop = target[key];
                if (data===undefined) {
                    this.deleteNode(target, key);
                    return true;
                }

                
                if (!prop) {
                    this.addNode(receiver, key, data);
                    return true;
                }

                if (prop.hasOwnProperty("value")) {
                    let node = this.nodeToHtmlMap.get(prop), value;
                    if (typeof data === "object" && data.hasOwnProperty("value")) {
                        this.nodeToHtmlMap.delete(prop);
                        this.nodeToHtmlMap.set(target[key] = data, node);
                        
                        value = Types.setValue(node, data.value);

                    } else value = prop.value = Types.setValue(node, data);

                    this.triggerEvent(target, key, value);
                }
                else {
                    this.deleteNode(target, key);
                    this.addNode(receiver, key, data);
                }
                return true;
            },
        }

        this.nodeToHtmlMap = new Map();
        this.dataTree = new Proxy({}, this.proxyTraps);
        this.nodeToHtmlMap.set(this.dataTree, this);
        this.triggersEvents = true;

        this.addEventListener("change", (ev) => {
            let chain = this.chainFromNode(ev.target);
            let ref = this.refrence(chain, 1);
            let prop = chain[chain.length - 1];

            
            let value = ref[prop].value = Types.getValue(ev.target.closest(`[${TreeMenu.enum.leaf}]`));

            this.triggerEvent(ref, prop, value);
        })
    }

    triggerEvent(node, prop, data) {
        if(this.triggersEvents)return this.dispatchEvent(new CustomEvent("nodechange", { bubbles: true, detail: { node, prop, data } }));
    }

    addNode(ref, name, data, htmlNode) {
        let element, proxyObject={}, newNode;

        if (!data && htmlNode) data = Types.getValue(htmlNode);
        if (typeof data === "object") {
            if (data.value) proxyObject = data;
        } else {
            proxyObject = { value: data };
        }

        if (proxyObject.value) ref[name] = { bypassSecurity: proxyObject };
        else ref[name] = { bypassSecurity: new Proxy(proxyObject, this.proxyTraps) };
        newNode = ref[name];

        if (!htmlNode) {
            if (proxyObject.value) {
                element = Types.instantiate(name, proxyObject);
                element.setAttribute("data-leaf", name);

                this.nodeToHtmlMap.set(newNode, element);
                this.nodeToHtmlMap.get(ref).appendChild(element);
            } else {
                element = (this.nodeTemplate || TreeMenu.nodeTemplate)(name);
                this.nodeToHtmlMap.get(ref).appendChild(element);

                if (!element.hasAttribute(TreeMenu.enum.node) && !element.hasAttribute(TreeMenu.enum.leaf)) {
                    element = element.querySelector(`[${TreeMenu.enum.node}], [${TreeMenu.enum.leaf}]`);
                }
                this.nodeToHtmlMap.set(newNode, element);
            }
        }else this.nodeToHtmlMap.set(newNode, htmlNode);

        if (proxyObject.value) {
            Types.setValue(this.nodeToHtmlMap.get(newNode), proxyObject.value);
        } else {
            for (const key in data) this.addNode(newNode, key, data[key]);
            
        }

        return newNode;
    }
    deleteNode(target, prop) {

        for (const key in target[prop]) {
            if (key != "value") this.deleteNode(target[prop], key);
        }
        this.nodeToHtmlMap.get(target[prop]).remove();
        this.nodeToHtmlMap.delete(target[prop]); 
        
        this.triggerEvent(target, prop, null);
        target[prop] = { bypassSecurity: undefined };
    }

    parseChildren(htmlParent = this, nodeParent = this.dataTree) {
        for (const node of htmlParent.children){
            let name = node.getAttribute("data-node");

            if (name) {
                this.parseChildren(node, this.addNode(nodeParent, name, null, node));
                continue;
            }

            name = node.getAttribute("data-leaf");
            if (name) {
                this.addNode(nodeParent, name, null, node);
            }

        }
    }

    refrence(chain, ofsset = 0) {
        let ref = this.dataTree;
        for (let i = 0; i < chain.length-ofsset; i++){
            ref = ref[chain[i]];
            if (!ref) return undefined;
        }
        return ref;
    }

    chainFromNode(target) {
        
        let chain = [];
        let f = (target) => {
            if (target == this) return;

            let name = target.getAttribute("data-node");

            f(target.parentElement);

            if (name) chain.push(name);
            else {
                name = target.getAttribute("data-leaf");
                if (name) chain.push(name);
            }
        }
        f(target);
        return chain;
    }

    connectedCallback() {
        if (!Object.values(this.dataTree).length) this.parseChildren();
    }
    
    static parse(data) {
        let tree = document.createElement("tree-menu");
        for (const key in data) tree.addNode(tree.dataTree, key, data[key]);
        return tree; 
    }
}

customElements.define("tree-menu", TreeMenu);