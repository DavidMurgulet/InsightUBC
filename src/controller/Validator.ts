import {Field, MField, QueryNode, SField} from "./Query";
import {Dataset} from "./Dataset";

import {Collector} from "./Collector";

// RETURN VALUE 0 = no errors
// RETURN 1 = InsightError
let colFields: string[];

export class Validator {
	private datasets: Dataset[];
	public leafDatasets: string[];
	constructor(datasets: Dataset[]) {
		this.datasets = datasets;
		this.leafDatasets = [];
	}
	// MADE CHANGES
	public validWhere(node: QueryNode, firstLoop?: boolean): {error: number; msg: string} {
		const key = node.getKey();
		const children = node.getChilds();
		if (key === "WHERE") {
			if (children.length !== 1 && children.length !== 0) {
				return {error: 1, msg: "Where has more than one mComp"};
			}
			for (const k of children) {
				let temp = this.validWhere(k);
				if (temp.error === 1) {
					return {error: 1, msg: temp.msg};
				}
			}
		} else if (key === "AND" || key === "OR" || key === "NOT") {
			// must be non-empty array, no {}
			// must have at least 1 key
			if (children.length === 0) {
				return {error: 1, msg: "Error message for code 1"};
			}
			for (const k of children) {
				let temp = this.validWhere(k);
				if (temp.error === 1) {
					return {error: 1, msg: temp.msg};
				}
			}
		} else if (key === "GT" || key === "LT" || key === "EQ" || key === "IS") {
			if (children.length === 0) {
				return {error: 1, msg: "empty GT/LT/EQ/IS"};
			}
			if (children.length > 1) {
				const fkey = children[0].getKey();
				if (children.every((c) => c.getKey() === fkey)) {
					node.removeExcept(children[children.length - 1]);
				} else {
					return {error: 1, msg: "only one key in GT allowed"};
				}
			}
			const compCode = key === "IS" ? 1 : 0;
			let child = children[0];
			let temp = this.validateLeaf(child, compCode);
			if (temp.error === 1) {
				return {error: 1, msg: temp.msg};
			}
		} else {
			return {error: 1, msg: "invalid comparator / "};
		}
		return {error: 0, msg: ""};
	}
	public validateOptions(node: QueryNode): {error: number; msg: string} {
		const key = node.getKey();
		const children = node.getChilds();
		if (key === "OPTIONS") {
			// check that children are COL and ORDER
			// one of the children must be COL, the other ORDER, may be multiple
			let childKeys = node.getChildKeys();
			// check that options only has COLUMNS and ORDER as children
			// if has both, ensure that COLUMNS is processed first
			// empty options
			if (children.length < 1) {
				return {error: 1, msg: "options is empty"};
			}
			// if (children.every((chi) => chi.getKey() === "COLUMNS")) {
			// 	for (const c of children) {
			// 		const temp = this.validateColumns(c);
			// 		if (temp.error === 1) {
			// 			return {error: 1, msg: temp.msg};
			// 		}
			// 	}
			// 	node.removeExcept(children[children.length - 1]);
			// } else if (children.every((chi) => chi.getKey() === "COLUMNS" || chi.getKey() === "ORDER")) {
			// 	// validate all columns
			// 	for (const c of children) {
			// 		if (c.getKey() === "COLUMNS") {
			// 			const temp = this.validateColumns(c);
			// 			if (temp.error === 1) {
			// 				return {error: 1, msg: temp.msg};
			// 			}
			// 		}
			// 	}
			// 	// validate all ORDER
			// 	for (const c of children) {
			// 		if (c.getKey() === "ORDER") {
			// 			const temp = this.validateOrder(c);
			// 			if (temp.error === 1) {
			// 				return {error: 1, msg: temp.msg};
			// 			}
			// 		}
			// 	}
			// 	node.removeOrderColumns("COLUMNS");
			// 	node.removeOrderColumns("ORDER");
			// } else {
			// 	return {error: 1, msg: "options contains not columns or order"};
			// }
			// case 2: multiple columns and multiple order childkeys
			//			validate all columns, remove all but last.
			//			validate all order, remove all but last.
			if (childKeys.length === 1 && childKeys.includes("COLUMNS")) {
				// only columns case, no need to check order
				const col = node.getChildWithKey("COLUMNS") as QueryNode;
				const temp = this.validateColumns(col);
				if (temp.error === 1) {
					return {error: 1, msg: temp.msg};
				}
				// if (this.validateColumns(col) === 1) {
				// 	return 1;
				// }
			} else if (childKeys.length === 2 && childKeys.includes("COLUMNS") && childKeys.includes("ORDER")) {
				const col = node.getChildWithKey("COLUMNS") as QueryNode;
				const order = node.getChildWithKey("ORDER") as QueryNode;
				// validate columns
				// if (this.validateColumns(col) === 1) {
				// 	return 1;
				// }
				const temp = this.validateColumns(col);
				if (temp.error === 1) {
					return {error: 1, msg: temp.msg};
				}
				// validate order
				// if (this.validateOrder(order) === 1) {
				// 	return 1;
				// }
				const ord = this.validateOrder(order);
				if (ord.error === 1) {
					return {error: 1, msg: ord.msg};
				}
			} else {
				// error case
				return {error: 1, msg: "error idk"};
			}
		} else {
			return {error: 1, msg: "OPTIONS missing"};
		}

		return {error: 0, msg: ""};
	}

	// should check that they're all the same
	public checkDatasetValidity() {
		if (this.leafDatasets.every((element) => element === this.leafDatasets[0])) {
			// all the same,
			for (const d of this.datasets) {
				if (this.leafDatasets[0] === d.id) {
					return 0;
				}
			}
			// one of the keys has an invalid dataset
			return 1;
		} else {
			// keys dont match, m
			return 1;
		}
	}

	public validateOrder(node: QueryNode): {error: number; msg: string} {
		const key = node.getKey(); // ORDER

		if (key !== "ORDER") {
			return {error: 1, msg: "order missing"};
		}
		const children = node.getChilds(); // "sections_avg"

		// order child cannot be type array
		if (children.length !== 1) {
			return {error: 1, msg: "Order cannot have multiple children"};
		}

		for (const s of colFields) {
			if (children[0].getKey() === s) {
				return {error: 0, msg: ""};
			}
		}
		return {error: 1, msg: "order is not in columns"};
	}

	public validateColumns(node: QueryNode): {error: number; msg: string} {
		const key = node.getKey(); // COLUMNS

		if (key !== "COLUMNS") {
			return {error: 1, msg: "missing col"};
		}

		const children = node.getChilds(); // ["sections_avg", "sections_dept", "sections_pass"]
		// COLUMNS cannot be empty
		if (children.length < 1) {
			return {error: 1, msg: "empty columns"};
		}
		for (const leaf of children) {
			if (leaf.getChilds().length !== 0) {
				return {error: 1, msg: "children arent leafs?"};
			}
			if (leaf.getKey().includes("_")) {
				const splitArr = leaf.getKey().split("_");
				let datasetID = splitArr[0]; // "sections"
				if (datasetID === "") {
					return {error: 1, msg: "empty string instead of dataset"};
				}
				this.leafDatasets.push(datasetID);
				let field = splitArr[1]; // "avg"

				if (!Object.values(Field).includes(field)) {
					return {error: 1, msg: "field is not a valid sections field"};
				}
			} else {
				// improper formatting of dataset_mfield/sfield
				return {error: 1, msg: "improper formatting of dataset_filed"};
			}
		}
		const tempCollector = new Collector(this.datasets);
		colFields = tempCollector.extractCol(node);
		return {error: 0, msg: ""};
	}

	public validateLeaf(node: QueryNode, parent: number): {error: number; msg: string} {
		// needs to contain underscore
		// parse string, first needs to be same as dataset.
		// second needs to be a valid key
		const key = node.getKey();
		const children = node.getChilds();
		if (children.length === 1) {
			const leaf = children[0];
			const leafKey = leaf.getKey();
			if (key.includes("_")) {
				const splitArr = key.split("_");
				let dsetID = splitArr[0];
				if (dsetID === "") {
					return {error: 1, msg: "empty string instead of dataset"};
				}
				this.leafDatasets.push(dsetID);
				let field = splitArr[1];

				// GT/LT/EQ case
				if (parent === 0) {
					// can combine these 2 cases.
					if (Object.values(MField).includes(field)) {
						if (isNaN(leafKey)) {
							// should be a number (invalid type)
							return {error: 1, msg: "value type is not a number"};
						}
					} else {
						// wrong key type in GT/LT/EQ
						return {error: 1, msg: "wrong key type in GT LT EQ"};
					}
				} else if (parent === 1) {
					if (Object.values(SField).includes(field)) {
						if (!(typeof leafKey === "string")) {
							// invalid value type (should be string)
							return {error: 1, msg: "value type is not a string"};
						}
						let temp = this.validWildcard(leafKey);
						if (temp.error === 1) {
							return {error: 1, msg: temp.msg};
						}
					} else {
						// wrong key type in IS
						return {error: 1, msg: "wrong key type in IS"};
					}
				}
			} else {
				return {error: 1, msg: "key is not in proper format (dataset_key)"};
			}
		} else {
			return {error: 1, msg: "EQ/GT/LT is empty"};
		}
		return {error: 0, msg: ""};
	}

	public validWildcard(wildcard: string): {error: number; msg: string} {
		// may need to change this in future.
		if (wildcard.length === 0) {
			return {error: 0, msg: ""};
		}

		for (let i = 1; i < wildcard.length - 1; i++) {
			const char = wildcard.charAt(i);
			if (char === "*") {
				return {error: 1, msg: "* found in middle of string"};
			}
		}
		return {error: 0, msg: ""};
	}
}
