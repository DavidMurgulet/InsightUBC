import e from "express";

export class Query {
	public where: QueryNode;
	public options: QueryNode;

	constructor(where: QueryNode, opts: QueryNode) {
		this.where = where;
		this.options = opts;
	}

	public addWhere(node: QueryNode) {
		this.where = node;
	}

	public addOpts(node: QueryNode) {
		this.options = node;
	}
}

// export class Where {
// 	public mComparator: comparator;
//
// 	constructor() {
// 	}
//
// }

export class QueryNode {
	public operator: string | number;
	public children: QueryNode[];
	public leaf: boolean;
	public parent!: QueryNode;

	constructor(operator: any) {
		this.operator = operator;
		this.children = new Array<QueryNode>();
		this.leaf = false;
	}

	public addChild(node: QueryNode) {
		this.children.push(node);
	}

	public getKey(): any {
		return this.operator;
	}
	public setLeaf() {
		this.leaf = true;
	}

	public getChilds() {
		return this.children;
	}

	public addParent(parent: QueryNode) {
		this.parent = parent;
	}

	public getParent() {
		return this.parent;
	}
}
export enum Filter {
	OR = "OR",
	AND = "AND",
	NOT = "NOT",
}

export enum Comp {
	GT = "GT",
	LT = "LT",
	EQ = "EQ",
}

export enum Field {
	uuid = "uuid",
	id = "id",
	title = "title",
	instructor = "instructor",
	dept = "dept",
	year = "year",
	avg = "avg",
	pass = "pass",
	fail = "fail",
	audit = "audit",
}

export enum MField {
	year = "year",
	avg = "avg",
	pass = "pass",
	fail = "fail",
	audit = "audit",
}

export enum SField {
	uuid = "uuid",
	id = "id",
	title = "title",
	instructor = "instructor",
	dept = "dept",
}
