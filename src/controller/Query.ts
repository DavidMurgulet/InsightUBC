import Log from "@ubccpsc310/folder-test/build/Log";
import {Transformations} from "./Transformations";

export class Query {
	public where: QueryNode;
	public options: QueryNode;

	constructor(where: QueryNode, opts: QueryNode) {
		this.where = where;
		this.options = opts;
	}
}

export class QueryRefactored {
	public where: Where;
	public options: Options;
	public transformations?: Transformations;

	constructor(where: Where, opts: Options, transformations?: Transformations) {
		this.where = where;
		this.options = opts;
		this.transformations = transformations;
	}
}

// can have no comp (undefined), a logic comp (not, and, or), or a mcomp/scomp (gt, lt, eq, is)
export class Where {
	public comparator?: LogicComparator | Comparator;
	public hasComparator = false;

	public setComparator(comp: LogicComparator | Comparator) {
		this.comparator = comp;
	}
}

export class LogicComparator {
	public operator: string;
	public children: any[];

	constructor(operator: string) {
		this.operator = operator;
		this.children = new Array<any>();
	}

	public addChild(child: LogicComparator | Comparator) {
		this.children.push(child);
	}
}

export class Comparator {
	public operator: string;
	public child: {[key: string]: string | number};
	public key?: string;
	public field?: string;

	constructor(operator: string, child: {[key: string]: string | number}) {
		this.operator = operator;
		this.child = child;
	}
}

export class Options {
	public columns?: Columns;
	public order?: Order;

	public setCol(columns: Columns) {
		this.columns = columns;
	}

	public setOrder(order: Order) {
		this.order = order;
	}
}

// order is either:
//	1 column sort, cannot be an array, will have no dir.
// 	multiple column sort, must have dir and 1 or multiple keys in keys. array in this case
export class Order {
	public dir?: string;
	public keys: string[] | string;

	constructor(keys: string[] | string, dir?: string) {
		this.dir = dir;
		this.keys = keys;
	}

	public isSingleColumn(): boolean {
		return typeof this.keys === "string";
	}
}
export class Columns {
	public cols: string[];

	constructor(keys: string[]) {
		this.cols = keys;
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

export enum SectionField {
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

export enum SectionMField {
	year = "year",
	avg = "avg",
	pass = "pass",
	fail = "fail",
	audit = "audit",
}

export enum SectionSField {
	uuid = "uuid",
	id = "id",
	title = "title",
	instructor = "instructor",
	dept = "dept",
}

export enum RoomField {
	fullname = "fullname",
	shortname = "shortname",
	number = "number",
	name = "name",
	address = "address",
	lat = "lat",
	lon = "lon",
	seats = "seats",
	type = "type",
	furniture = "furniture",
	href = "href",
}

export enum RoomMField {
	lat = "lat",
	lon = "lon",
	seats = "seats",
}

export enum RoomSField {
	fullname = "fullname",
	shortname = "shortname",
	number = "number",
	name = "name",
	address = "address",
	type = "type",
	furniture = "furniture",
	href = "href",
}
