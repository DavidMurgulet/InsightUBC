import {Field, MField, QueryNode, SField} from "./Query";

export function validWhere(node: QueryNode): boolean {
	const key = node.getKey();
	const children = node.getChilds();

	if (key === "WHERE") {
		for (const k of children) {
			if (!validWhere(k)) {
				return false;
			}
		}
	} else if (key === "AND" || key === "OR") {
		// must be non-empty array, no {}
		// must have at least 1 key
		if (children.length === 0) {
			return false;
		}
		for (const k of children) {
			if (!validWhere(k)) {
				return false;
			}
		}
	} else if (key === "GT" || key === "LT" || key === "EQ") {
		if (children.length < 0 || children.length > 1) {
			return false;
		}
		let child = children[0];
		if (!validateLeaf(child, 0)) {
			return false;
		}
	} else if (key === "IS") {
		if (children.length < 0 || children.length > 1) {
			return false;
		}
		let child = children[0];
		if (!validateLeaf(child, 1)) {
			return false;
		}
	} else {
		return false;
	}

	return true;
}

export function validOpts(node: QueryNode): boolean {
	const key = node.getKey();
	const children = node.getChilds();

	if (key === "OPTIONS") {
		for (const k of children) {
			if (!validOpts(k)) {
				return false;
			}
		}
	} else if (key === "COLUMNS") {
		// children must be an array over > 1
		if (children.length < 1) {
			// COLUMNS cannot be empty
			return false;
		}

		// check

		for (const k of children) {
			if (!validOrder(k)) {
				return false;
			}
		}
	} else if (key === "ORDER") {
		// must only have 1 child.
		if (children.length !== 1) {
			return false;
		}
		let child = children[0];
		if (!validOrder(child)) {
			return false;
		}
	}

	return true;
}

export function validOrder(node: QueryNode): boolean {
	const key = node.getKey();
	const children = node.getChilds();

	if (children.length !== 0) {
		return false;
	}

	if (key.includes("_")) {
		const splitArr = key.split("_");
		let dset = splitArr[0];
		let field = splitArr[1];

		// check dset

		if (!Object.values(Field).includes(field)) {
			return false;
		}
	}

	return true;
}

export function validateLeaf(node: QueryNode, parent: number): boolean {
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
			let dset = splitArr[0];
			let field = splitArr[1];

			// DSET SHOULD BE A VALID DATSET.

			// GT/LT/EQ case
			if (parent === 0) {
				// can combine these 2 cases.
				if (Object.values(MField).includes(field)) {
					if (isNaN(leafKey)) {
						// should be a number (invalid type)
						return false;
					}
				} else {
					// wrong key type in GT/LT/EQ
					return false;
				}
			} else if (parent === 1) {
				if (Object.values(SField).includes(field)) {
					if (!(typeof leafKey === "string")) {
						// invalid value type (should be string)
						return false;
					}
					if (!validWildcard(leafKey)) {
						return false;
					}
				} else {
					// wrong key type in IS
					return false;
				}
			} else if (parent === 2) {
				if (!Object.values(Field).includes(field)) {
					return false;
				}
			}
		} else {
			return false;
		}
	}
	return true;
}
export function validWildcard(wildcard: string): boolean {
	let count = 0;

	for (let i = 0; i < wildcard.length; i++) {
		const char = wildcard.charAt(i);
		if (char === "*" && (i !== 0 || i !== wildcard.length - 1)) {
			// error case * in middle of string
			return false;
		}
	}
	return true;
}
