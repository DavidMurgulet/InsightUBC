import {QueryNode} from "./Query";
import * as querystring from "querystring";

export function makeLeaf(query: any, parent: QueryNode): QueryNode {
	const leaf = new QueryNode(query);
	leaf.addParent(parent);
	leaf.setLeaf();
	return leaf;
}

let sameParent = false;

export function parseWhere(query: any, key: string, parent?: QueryNode): QueryNode {
	let curr = new QueryNode(key);
	// dealing with duplicates
	if (parent instanceof QueryNode) {
		for (let child of parent.getChilds()) {
			if (sameParent) {
				curr = child;
				sameParent = false;
			}

			// if (child.getKey() === curr.getKey()) {
			// 	curr = child;
			// 	break;
			// }
		}
	}

	// THIS IS AN IFFY CASE
	if (key === "WHERE" && Object.keys(query).length === 0) {
		return curr;
	}

	// LEAF CASE
	if (Object.keys(query).length === 0 || typeof query === "string") {
		let leaf = makeLeaf(query, curr);
		curr.addChild(leaf);
		return curr;
	}
	// iterate through keys (kids) of current query
	for (const k in query) {
		if (Object.prototype.hasOwnProperty.call(query, k)) {
			let subQuery: any = (query as any)[k];
			if (Array.isArray(subQuery)) {
				for (let c of subQuery) {
					sameParent = true;
					let child = parseWhere(c, k, curr);
					if (!curr.getChilds().includes(child)) {
						child.addParent(curr);
						curr.addChild(child);
					}
				}
			} else if (!isNaN(subQuery) || typeof subQuery === "string" || typeof subQuery === "object") {
				let child = parseWhere(subQuery, k, curr);
				child.addParent(curr);
				curr.addChild(child);
			}
		}
	}

	return curr;
}

export function parseOpts(query: any, key: string): QueryNode {
	let curr = new QueryNode(key);

	// COL is empty.
	if (Object.keys(query).length === 0) {
		return curr;
	}

	if (typeof query === "string") {
		let leaf = makeLeaf(query, curr);
		curr.addChild(leaf);
		return curr;
	}

	// COLUMNS CASE, WILL BE NON EMPTY ARRAY
	if (Array.isArray(query)) {
		// COLUMNS case, subQuery is an array of strings
		// iterate through, add as children
		for (let child of query) {
			let leaf = makeLeaf(child, curr);
			curr.addChild(leaf);
		}
		return curr;
	}

	for (const k in query) {
		if (Object.prototype.hasOwnProperty.call(query, k)) {
			let subQuery = (query as any)[k];
			if (typeof subQuery === "string") {
				// const leaf = new queryNode(subQuery);
				let child = parseOpts(subQuery, k);
				curr.addChild(child);
			} else if (typeof subQuery === "object") {
				let child = parseOpts(subQuery, k);
				curr.addChild(child);
			}
		}
	}

	return curr;
}

export function checkParsing(node: QueryNode, level: number) {
	const indent = "  ".repeat(level);

	if (node.leaf) {
		console.log(indent + node.getKey());
		return;
	}

	console.log(indent + node.getKey());

	for (const c of node.getChilds()) {
		checkParsing(c, level + 1);
	}
}
