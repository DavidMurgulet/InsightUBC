import {Field, MField, QueryNode, SField} from "./Query";
import {Dataset} from "./Dataset";
import {Collector} from "./Collector";

// RETURN VALUE 0 = no errors
// RETURN 1 = InsightError
// RETURN 2 = NotFoundErro

// let leafDatasets: string[];
let colFields: string[];

export class Validator {
	private datasets: Dataset[];
	public leafDatasets: string[];

	constructor(datasets: Dataset[]) {
		this.datasets = datasets;
		this.leafDatasets = [];
	}


	 // MADE CHANGES
	public validWhere(node: QueryNode): number {
		const key = node.getKey();
		const children = node.getChilds();
		if (key === "WHERE") {
			// can have 0 or 1 children,
			if (children.length !== (1 || 0)) {
				return 1;
			}
			for (const k of children) {
				if (this.validWhere(k) === 1) {
					return 1;
				}
			}
		} else if (key === "AND" || key === "OR" || key === "NOT") {
			// must be non-empty array, no {}
			// must have at least 1 key
			if (children.length === 0) {
				return 1;
			}
			for (const k of children) {
				if (this.validWhere(k) === 1) {
					return 1;
				}
			}
		} else if (key === "GT" || key === "LT" || key === "EQ" || key === "IS") {
			if (children.length < 0) {
				return 1;
			}
			if (children.length > 1) {
				// if multiple children all with same key, remove latest added
				const fkey = children[0].getKey();
				if (children.every((c) => c.getKey() === fkey)) {
					node.removeExcept(children[children.length - 1]);
				} else {
					// only one key in GT/LT/EQ allowed
					return 1;
				}
			}

			let child = children[0];
			if (key === "GT" || key === "LT" || key === "EQ") {
				if (this.validateLeaf(child, 0) === 1) {
					return 1;
				}
			} else if (key === "IS") {
				if (this.validateLeaf(child, 1) === 1) {
					return 1;
				}
			}
		} else {
			return 1;
		}

		return 0;
	}

	public validateOptions(node: QueryNode): number {
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
				return 1;
			}

			// keys can only be COLUMNS or ORDER
			// 2 cases, only columns,

			// if there are multiple instances of a col or order, check validity

			// remove all except latest added.

			// case 1: all childkeys are columns
			//			if all come back valid, remove all but the last one
			if (children.every((chi) => chi.getKey() === "COLUMNS")) {
				for (const c of children) {
					if (this.validateColumns(c) === 1) {
						return 1;
					}
				}
				node.removeExcept(children[children.length - 1]);
			} else if (children.every((chi) => chi.getKey() === "COLUMNS" || chi.getKey() === "ORDER")) {
				// validate all columns
				for (const c of children) {
					if (c.getKey() === "COLUMNS") {
						if (this.validateColumns(c) === 1) {
							return 1;
						}
					}
				}
				// validate all ORDER
				for (const c of children) {
					if (c.getKey() === "ORDER") {
						if (this.validateOrder(c) === 1) {
							return 1;
						}
					}
				}
				node.removeOrderColumns("COLUMNS");
				node.removeOrderColumns("ORDER");
			} else {
				return 1;
			}

			// case 2: multiple columns and multiple order childkeys
			//			validate all columns, remove all but last.
			//			validate all order, remove all but last.
			// if (childKeys.length === 1 && childKeys.includes("COLUMNS")) {
			// 	// only columns case, no need to check order
			// 	const col = node.getChildWithKey("COLUMNS") as QueryNode;
			// 	if (this.validateColumns(col) === 1) {
			// 		return 1;
			// 	}
			// } else if (childKeys.length === 2 && childKeys.includes("COLUMNS") && childKeys.includes("ORDER")) {
			// 	const col = node.getChildWithKey("COLUMNS") as QueryNode;
			// 	const order = node.getChildWithKey("ORDER") as QueryNode;
			//
			// 	// validate columns
			// 	if (this.validateColumns(col) === 1) {
			// 		return 1;
			// 	}
			//
			// 	// validate order
			// 	if (this.validateOrder(order) === 1) {
			// 		return 1;
			// 	}
			// } else {
			// 	// error case
			// 	return 1;
			// }
		} else {
			return 1;
		}

		return 0;
	}

	public checkDatasetValidity() {
		if (this.leafDatasets.every((element) => element === this.leafDatasets[0])) {
			for (const d of this.datasets) {
				if (this.leafDatasets[0] === d.id) {
					return 0;
				}
			}
			return 2;
		} else {
			return 1;
		}
	}

	public validateOrder(node: QueryNode): number {
		const key = node.getKey(); // ORDER
		const children = node.getChilds(); // "sections_avg"

		// order child cannot be type array
		if (children.length !== 1) {
			return 1;
		}

		for (const s of colFields) {
			if (children[0].getKey() === s) {
				return 0;
			}
		}
		return 1;
	}

	public validateColumns(node: QueryNode): number {
		const key = node.getKey(); // COLUMNS
		const children = node.getChilds(); // ["sections_avg", "sections_dept", "sections_pass"]
		// COLUMNS cannot be empty
		if (children.length < 1) {
			return 1;
		}
		for (const leaf of children) {
			if (leaf.getChilds().length !== 0) {
				return 1;
			}
			if (leaf.getKey().includes("_")) {
				const splitArr = leaf.getKey().split("_");
				let datasetID = splitArr[0]; // "sections"
				this.leafDatasets.push(datasetID);
				let field = splitArr[1]; // "avg"

				if (!Object.values(Field).includes(field)) {
					return 1;
				}
			} else {
				// improper formatting of dataset_mfield/sfield
				return 1;
			}
		}
		const tempCollector = new Collector(this.datasets);
		colFields = tempCollector.extractCol(node);
		return 0;
	}

	public validateLeaf(node: QueryNode, parent: number): number {
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
				this.leafDatasets.push(dsetID);
				let field = splitArr[1];

				// GT/LT/EQ case
				if (parent === 0) {
					// can combine these 2 cases.
					if (Object.values(MField).includes(field)) {
						if (isNaN(leafKey)) {
							// should be a number (invalid type)
							return 1;
						}
					} else {
						// wrong key type in GT/LT/EQ
						return 1;
					}
				} else if (parent === 1) {
					if (Object.values(SField).includes(field)) {
						if (!(typeof leafKey === "string")) {
							// invalid value type (should be string)
							return 1;
						}
						if (this.validWildcard(leafKey) === 1) {
							return 1;
						}
					} else {
						// wrong key type in IS
						return 1;
					}
				} else if (parent === 2) {
					if (!Object.values(Field).includes(field)) {
						return 1;
					}
				}
			} else {
				return 1;
			}
		}
		return 0;
	}

	public validWildcard(wildcard: string): number {
		let count = 0;

		// may need to change this in future.
		if (wildcard.length === 0) {
			return 0;
		}

		for (let i = 0; i < wildcard.length; i++) {
			const char = wildcard.charAt(i);
			if (char === "*" && (i !== 0 || i !== wildcard.length - 1)) {
				// error case * in middle of string
				return 1;
			}
		}
		return 0;
	}
}
