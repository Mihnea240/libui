import { TreeMenu, Types } from "./treeMenu.js"

let menu = TreeMenu.parse({
	Data: {
		field1: {
			type: "boolean",
			value: true,
		},
		field2: {
			type: "number",
			value: -1,
		},
		field3: true,
		field4: 4,
	}
})

document.body.appendChild(menu);

console.log(menu.dataTree.Data.field4)