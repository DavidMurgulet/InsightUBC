import {Columns, Comparator, LogicComparator, Options, Order, QueryNode, Where} from "./Query";
import {InsightError} from "./IInsightFacade";
import {ApplyRule, GroupBlock, Transformations} from "./Transformations";

export function makeLeaf(query: any, parent: QueryNode): QueryNode {
	const leaf = new QueryNode(query);
	leaf.addParent(parent);
	leaf.setLeaf();
	return leaf;
}

let sameParent = false;
export function parseOptionsRefactored(query: any, key: string): Options {
	if (key === "OPTIONS") {
		const opts = new Options();
		for (const k in query) {
			if (Object.prototype.hasOwnProperty.call(query, k)) {
				if (k === "ORDER") {
					opts.setOrder(parseOrder((query as any)[k], k));
				} else if (k === "COLUMNS") {
					opts.setCol(parseColumns((query as any)[k], k));
				} else {
					throw new InsightError();
				}
			}
		}

		return opts;
	} else {
		throw new InsightError();
	}
}
export function parseWhereRefactored(query: any, key: string): Where {
	// WHERE can only have 1 comparator, child cannot be an array
	if (key === "WHERE") {
		const where = new Where();

		// checks to see if where child is an array, or has multiple children.
		if (Array.isArray(query)) {
			throw new InsightError();
		} else if (Object.keys(query).length > 2) {
			throw new InsightError();
		}

		for (const k in query) {
			if (Object.prototype.hasOwnProperty.call(query, k)) {
				if (k === "AND" || k === "OR") {
					where.setComparator(parseLogic((query as any)[k], k));
					where.hasComparator = true;
					return where;
				} else if (k === "GT" || k === "LT" || k === "EQ" || k === "IS") {
					where.setComparator(parseLeaf((query as any)[k], k));
					where.hasComparator = true;
					return where;
				} else if (k === "NOT") {
					where.setComparator(parseNot((query as any)[k], k));
					where.hasComparator = true;
					return where;
				} else {
					throw new InsightError();
				}
			}
		}
		return where;
	} else {
		throw new InsightError();
	}
}
export function parseTransformations(query: any, key: string): Transformations {
	if (key === "TRANSFORMATIONS") {
		const trans = new Transformations();
		for (const k in query) {
			if (Object.prototype.hasOwnProperty.call(query, k)) {
				if (k === "GROUP") {
					if (!Array.isArray((query as any)[k])) {
						throw new InsightError();
					}
					trans.setGroup(parseGroup((query as any)[k], k));
				} else if (k === "APPLY") {
					trans.hasApply = true;
					if (!Array.isArray((query as any)[k])) {
						throw new InsightError();
					}
					// loop through subquery, calling parseapply for each one.
					for (const rule of (query as any)[k]) {
						if (Object.keys(rule).length !== 1) {
							throw new InsightError();
						}
						let applyRule = parseApply(rule);
						trans.addApplyRule(applyRule);
					}
				} else {
					throw new InsightError();
				}
			}
		}
		return trans;
	} else {
		throw new InsightError();
	}
}
export function parseGroup(group: any, key: string): GroupBlock {
	let keys: string[] = [];
	if (key === "GROUP") {
		for (const k of group) {
			keys.push(k);
		}
	}

	return new GroupBlock(keys);
}
export function parseApply(rule: any): ApplyRule {
	for (const k in rule) {
		let applyKey = k;
		let applyObj = (rule as any)[k];

		for (const i in applyObj) {
			const token = i;
			const key = applyObj[i];
			return new ApplyRule(applyKey, token, key);
		}
	}

	return new ApplyRule("", "", "");
}
export function parseColumns(columns: any, key: string): Columns {
	let keys: string[] = [];
	if (key === "COLUMNS") {
		if (columns.length === 0) {
			throw new InsightError();
		}
		for (const k of columns) {
			keys.push(k);
		}
	}

	return new Columns(keys);
}
export function parseOrder(order: any, key: string): Order {
	let dir;
	let keys;

	if (key === "ORDER") {
		// check to see if order is a string --> CASE 1
		if (Array.isArray(order)) {
			throw new InsightError();
		}

		if (typeof order === "string") {
			return new Order(order);
		} else if (typeof order === "object") {
			for (const k in order) {
				if (Object.prototype.hasOwnProperty.call(order, k)) {
					if (k === "keys") {
						keys = order[k];
					} else if (k === "dir") {
						dir = order[k];
					}
				}
			}
		}

		return new Order(keys, dir);
	}

	// TODO: check this
	return new Order(order);
}

export function parseNot(not: any, key: string): LogicComparator {
	const logicComp = new LogicComparator(key);
	if (Array.isArray(not)) {
		throw new InsightError();
	}

	for (const k in not) {
		let subQuery = (not as any)[k];
		// check for only 1 key here.
		// TODO: might cause some issues if subquery has no keys
		// if (Object.keys(subQuery).length !== 1) {
		// 	throw new InsightError();
		// }
		if (k === "AND" || k === "OR") {
			logicComp.addChild(parseLogic(subQuery, k));
		} else if (k === "GT" || k === "LT" || k === "EQ" || k === "IS") {
			logicComp.addChild(parseLeaf(subQuery, k));
		} else if (k === "NOT") {
			logicComp.addChild(parseNot(subQuery, k));
		}
	}

	return logicComp;
}
export function parseLogic(logic: any, key: string): LogicComparator {
	const logicComp = new LogicComparator(key);
	// Logic cannot have an empty array as a child, also must be an array.
	// TODO: possible error source
	// AND/OR must have non-empty arrays as children
	// NOT must be an object, cannot be array.
	if (key === "NOT") {
		if (Array.isArray(logic)) {
			throw new InsightError();
		}
	} else if (key === "AND" || key === "OR") {
		if (!Array.isArray(logic) || logic.length === 0) {
			throw new InsightError();
		}
	}

	// if AND/OR, k is 0 or 1, representing index of an object
	// subQuery will be that object eg. {GT: {sections_avg : 90}}
	// subKey is "GT"
	// pass in a subQuery of that GT.

	// if NOT, logic will be an object {GT: {sections_avg: 90}}
	// k will be GT, as logic is the subquery of NOT
	// subQuery = {sections_avg: 90}
	// want to call logic with k, subQuery(k);
	// k can be AND,  {AND: [{...}, {...}]}
	// subQuery will be an array.
	for (const k in logic) {
		let subQuery = (logic as any)[k];
		// check for only 1 key here.
		// TODO: might cause some issues if subquery has no keys
		if (Object.keys(subQuery).length !== 1) {
			throw new InsightError();
		}
		let subKey = Object.keys(subQuery)[0];
		if (subKey === "AND" || subKey === "OR") {
			logicComp.addChild(parseLogic((subQuery as any)[subKey], subKey));
		} else if (subKey === "GT" || subKey === "LT" || subKey === "EQ" || subKey === "IS") {
			logicComp.addChild(parseLeaf((subQuery as any)[subKey], subKey));
		} else if (subKey === "NOT") {
			logicComp.addChild(parseNot((subQuery as any)[subKey], subKey));
		}
	}

	return logicComp;
}
export function parseLeaf(leaf: any, key: string): Comparator {
	if (Array.isArray(leaf)) {
		throw new InsightError();
	}

	// TODO: possible source of error.
	if (Object.keys(leaf).length !== 1) {
		throw new InsightError();
	}
	return new Comparator(key, leaf);
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
