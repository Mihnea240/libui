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
		if (typeof data == "object") {
			let element = this[data.type || "Default"].instantiate(name, data.value);
            return element;
		}
		return this[typeof data || "Default"].instantiate(name, data);
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

    static string = class extends this.Default{
        static instantiate(name, data) {
            let element = super.instantiate(name);
            element.querySelector("input").setAttribute("type", "text");
            element.setAttribute("data-type", "string");
            this.set(element, data);
            return element
        }
    }
    
    static number = class extends this.Default{
        static instantiate(name,data) {
            let element = super.instantiate(name);
            element.querySelector("input").setAttribute("type", "number");
            element.setAttribute("data-type", "number");

            this.set(element, data);
            return element
        }
        
    }

    static boolean= class extends this.Default{
        static instantiate(name, data) {
            let element = super.instantiate(name);
            element.querySelector("input").setAttribute("type", "checkbox");
            element.setAttribute("data-type", "boolean");

            this.set(element, data);
            return element
        }
        static set(node, value) { node.querySelector("input[type='checkbox']").checked = !!value }
        static get(node) { return node.querySelector("input[type='checkbox']").checked }
    }

}

export class TreeMenu extends HTMLElement{
    static alias = {
        node: "data-node",
		leaf: "data-leaf",
		nodeChange: "nodechange",
    }
    static DefaultNodeTemplate(name) {
        let div = document.createElement("div");
        div.setAttribute(TreeMenu.alias.node, name);
        return div;
    }

    constructor() {

        super();
		this.ignoreParseObj={value: 0}
        this.proxyTraps = {

            get: (target, key) => {
                return target[key];
            },

			set: (target, key, data, receiver) => {
				//Data in this object will not be parsed
				if (data===this.ignoreParseObj) {
                    target[key] = data.value;
                    return true;
				}
				
				let prop = target[key];
				
				if (data === undefined || data === null) {
					if (prop) {
						this.deleteNode(target, key);
					}
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
            }
        }

        this.nodeToHtmlMap = new Map();
        this.dataTree = new Proxy({}, this.proxyTraps);
        this.nodeToHtmlMap.set(this.dataTree, this);
        this.triggersEvents = true;

        this.addEventListener("change", (ev) => {
            let chain = this.chainFromElement(ev.target);
            let ref = this.refrence(chain, 1);
            let prop = chain[chain.length - 1];

            
            let value = ref[prop].value = Types.getValue(ev.target.closest(`[${TreeMenu.alias.leaf}]`));

            this.triggerEvent(ref, prop, value);
        })
	}
	
	/**
	 * 
	 * @param {Object} parent the parent of the removed node
	 * @param {String} prop its name
	 * @param {any} data its value
	 * 
	 */
    triggerEvent(parent, prop, data) {
		if (!this.triggersEvents) return;

		return this.dispatchEvent(
			new CustomEvent(TreeMenu.alias.nodeChange, { bubbles: true, detail: { parent, prop, data } })
		);
	}

    addNode(ref, name, data, htmlElement) {
		let element, proxyObject = {}, newNode;

		if (!data && htmlElement) data = Types.getValue(htmlElement);
		
        if (typeof data === "object") {
            if (data.value) proxyObject = data;
        } else {
			proxyObject = {
				type: typeof data,
				value: data
			};
		}
		this.ignoreParseObj.value = proxyObject.value ?
			proxyObject :
			new Proxy(proxyObject, this.proxyTraps);
		
		ref[name] = this.ignoreParseObj;
		newNode = ref[name];

        if (!htmlElement) {
            if (proxyObject.value) {
                element = Types.instantiate(name, proxyObject);
                element.setAttribute(TreeMenu.alias.leaf, name);

                this.nodeToHtmlMap.set(newNode, element);
                this.nodeToHtmlMap.get(ref).appendChild(element);
            } else {
                element = (this.nodeTemplate || TreeMenu.DefaultNodeTemplate)(name);
                this.nodeToHtmlMap.get(ref).appendChild(element);

                if (!element.hasAttribute(TreeMenu.alias.node) && !element.hasAttribute(TreeMenu.alias.leaf)) {
                    element = element.querySelector(`[${TreeMenu.alias.node}], [${TreeMenu.alias.leaf}]`);
                }
                this.nodeToHtmlMap.set(newNode, element);
            }
        }else this.nodeToHtmlMap.set(newNode, htmlElement);

        if (proxyObject.value) {
            Types.setValue(this.nodeToHtmlMap.get(newNode), proxyObject.value);
        } else {
            for (const key in data) this.addNode(newNode, key, data[key]);
        }

        return newNode;
	}
	/**
	 * @param parent Tree menu node
	 * @param {String} child name of field to be erased 
	 */
    deleteNode(parent, child) {
        for (const key in parent[child]) {
            if (key != "value" && key!="type") this.deleteNode(parent[child], key);
		}
		//console.log(parent, child)
        this.nodeToHtmlMap.get(parent[child]).remove();
        this.nodeToHtmlMap.delete(parent[child]); 
        
        this.triggerEvent(parent, child, null);
		delete parent[child];
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

	/**
	 * 
	 * @param {String[]} chain 
	 * @param {Number} ofsset 
	 * @returns {Object} The menu node at the given path
	 */
    refrence(path, ofsset = 0) {
        let ref = this.dataTree;
        for (let i = 0; i < path.length-ofsset; i++){
            ref = ref[path[i]];
            if (!ref) return undefined;
        }
        return ref;
    }
	/**
	 * @param {HTMLElement} target 
	 * @returns {String[]}
	 * @description the path to target or the closest node of the tree menu
	 */
    chainFromElement(target) {
        
        let chain = [];
        let f = (target) => {
            if (target == this) return;

            let name = target.getAttribute(TreeMenu.alias.node);

            f(target.parentElement);

			let v = name || target.getAttribute(TreeMenu.alias.leaf);
            if (v) chain.push(v);
		}
		
        f(target);
        return chain;
    }

    connectedCallback() {
        if (!this.nodeToHtmlMap.size) this.parseChildren();
    }
    /**
	 * @returns {TreeMenu} 
	 * @param {Object} data The hierarchy of the menu
	 * @example
	 * ```
	 *{  
	 *	Group1: {  
	 *		field1: {  
	 *			type: "Bool",  
	 *			value: true,  
	 *		},
	 *		field2: {
	 *			type: "Number",  
	 *			value: -1,
	 *		},  
	 *		field3: true  
	 *	},  
	 *
	 *	Group2: {  
     	field3: {  
	 *			type: "custom",  
	 *		}  
	 *	}  
	 *}  
	 * ```
	*/
    static parse(data) {
        let tree = document.createElement("tree-menu");
        for (const name in data) tree.addNode(tree.dataTree, name, data[name]);
        return tree; 
    }
}

customElements.define("tree-menu", TreeMenu);