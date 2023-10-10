import {Field, MField, QueryNode, SField} from "./Query";
import {Dataset} from "./Dataset";

// RETURN VALUE 0 = no errors
// RETURN 1 = InsightError
// RETURN 2 = NotFoundErro

let currentDatasetID: string;

export class Validator {
	private datasets: Dataset[];


	constructor(datasets: Dataset[]) {
		this.datasets = datasets;
	}


	public validWhere(node: QueryNode, datasets: Dataset[]): number {
		const key = node.getKey();
		const children = node.getChilds();

		if (key === "WHERE") {
			// can have 0 or 1 children,
			if (children.length !== (1 || 0)) {
				return 1;
			}

			for (const k of children) {
				if (this.validWhere(k, datasets) === 1) {
					return 1;
				}
			}
		} else if (key === "AND" || key === "OR") {
			// must be non-empty array, no {}
			// must have at least 1 key
			if (children.length === 0) {
				return 1;
			}
			for (const k of children) {
				if (this.validWhere(k, datasets) === 1) {
					return 1;
				}
			}
		} else if (key === "GT" || key === "LT" || key === "EQ") {
			if (children.length < 0 || children.length > 1) {
				return 1;
			}
			let child = children[0];
			if (this.validateLeaf(child, 0, datasets) === 1) {
				return 1;
			}
		} else if (key === "IS") {
			if (children.length < 0 || children.length > 1) {
				return 1;
			}
			let child = children[0];
			if (this.validateLeaf(child, 1, datasets) === 1) {
				return 1;
			}
		} else {
			return 1;
		}

		return 0;
	}

	public validOpts(node: QueryNode): number {
		const key = node.getKey();
		const children = node.getChilds();

		if (key === "OPTIONS") {
			// check that children are COL and ORDER
			// one of the children must be COL, the other ORDER
			let childKeys = node.getChildKeys();

			if (((childKeys.length === 1) && (childKeys.includes("COLUMNS")))
				|| ((childKeys.length === 2) && ((childKeys.includes("COLUMNS") && (childKeys.includes("ORDER")))))) {
				for (const k of children) {
					if (this.validOpts(k) === 1) {
						return 1;
					}
				}
			} else {
				return 1;
			}


		} else if (key === "COLUMNS") {
			// children must be an array over > 1
			if (children.length < 1) {
				// COLUMNS cannot be empty
				return 1;
			}

			// check

			for (const k of children) {
				if (this.validOrder(k) === 1) {
					return 1;
				}
			}
		} else if (key === "ORDER") {
			// must only have 1 child.
			if (children.length !== 1) {
				return 1;
			}
			let child = children[0];
			if (this.validOrder(child) === 1) {
				return 1;
			}
		}

		return 0;
	}

	public validOrder(node: QueryNode): number {
		const key = node.getKey();
		const children = node.getChilds();

		if (children.length !== 0) {
			return 1;
		}

		if (key.includes("_")) {
			const splitArr = key.split("_");
			let dset = splitArr[0];
			let field = splitArr[1];

			// check dset

			if (!Object.values(Field).includes(field)) {
				return 1;
			}
		}

		return 0;
	}

	public validateLeaf(node: QueryNode, parent: number, datasets: Dataset[]): number {
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
				let field = splitArr[1];

				// queried dataset is in loaded Datasets check
				for (const set of datasets) {
					if (set.id === dsetID) {
						if (currentDatasetID === undefined) {
							currentDatasetID = dsetID;
						} else {
							if (dsetID !== currentDatasetID) {
								return 1;
							}
						}

					}
				}

				// if currentID not set, set it as first queried dataset,
				// else check to see that all leafs query the same dataset.
				if (currentDatasetID === undefined) {
					currentDatasetID = dsetID;
				} else {
					if (dsetID !== currentDatasetID) {
						return 1;
					}
				}
				// CANNOT QUERY MULTIPLE DSET.
				// DSET SHOULD BE SAME ACROSS BOTH WHERE AND OPTIONS

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


