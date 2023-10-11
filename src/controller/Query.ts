import e from "express";

export class Query {
	public where: QueryNode;
	public options: QueryNode;

	constructor(where: QueryNode, opts: QueryNode) {
		this.where = where;
		this.options = opts;
	}
}

export class QueryNode {
	public operator: string | number;
	public children: any[];
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

	public removeExcept(node: QueryNode) {
		for (let i = this.children.length - 1; i >= 0; i--) {
			if (this.children[i] !== node) {
				this.children.splice(i, 1);
			}
		}
	}

	public removeOrderColumns(key: string) {
		let seen = false;
		for (let i = this.children.length - 1; i >= 0; i--) {
			if (this.children[i].getKey() === key) {
				if (!seen) {
					seen = true;
				} else {
					this.children.splice(i, 1);
				}
			}
		}
	}
	public getChildKeys() {
		const keysArray = this.children.map((node) => node.operator);
		return keysArray;
	}

	public getChildWithKey(key: string) {
		for (const c of this.getChilds()) {
			if (c.getKey() === key) {
				return c;
			}
		}
	}

	public isLeaf() {
		return this.leaf;
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
