// TRANSFORMATIONS must contain GROUP and APPLY
import {Order} from "./Query";
import {InsightResult} from "./IInsightFacade";

export class Transformations {
	public groupBlock?: GroupBlock;
	public applyList!: ApplyRule[];
	public hasApply: boolean = false;

	constructor() {
		this.applyList = new Array<ApplyRule>();
	}

	public setGroup(groupBlock: GroupBlock) {
		this.groupBlock = groupBlock;
	}

	public addApplyRule(rule: ApplyRule) {
		this.applyList.push(rule);
	}
}

// must be a non-empty array
export class GroupBlock {
	public keys: string[];

	constructor(keys: string[]) {
		this.keys = keys;
	}
}

// can be an empty array
export class ApplyRule {
	public applyKey: string;
	public applyToken: string;
	public key: string;

	constructor(applyKey: string, applyToken: string, key: string) {
		this.applyKey = applyKey;
		this.applyToken = applyToken;
		this.key = key;
	}
}

export function orderResultsRefactored(order: Order, results: any[]): InsightResult[] {
	if (order.isSingleColumn()) {
		const orderBy = order.keys as string;
		return results.sort((a, b) => {
			const valA = a[orderBy];
			const valB = b[orderBy];
			if (typeof valA === "number" && typeof valB === "number") {
				return valA - valB;
			} else if (typeof valA === "string" && typeof valB === "string") {
				if (valA < valB) {
					return -1;
				} else if (valA > valB) {
					return 1;
				} else {
					return 0;
				}
			}
			return 0;
		});
	} else {
		let isAsc: null | boolean = null;
		const orderBy = order.keys;
		// can contain fields or applyKeys
		if (order.dir === "UP") {
			isAsc = true;
		} else if (order.dir === "DOWN") {
			isAsc = false;
		}
		return results.sort((a, b) => {
			for (const i of orderBy) {
				let field = i;
				const valA = a[field];
				const valB = b[field];
				if (typeof valA === "number" && typeof valB === "number") {
					if (valA < valB) {
						return isAsc ? -1 : 1;
					} else if (valA > valB) {
						return isAsc ? 1 : -1;
					}
				} else if (typeof valA === "string" && typeof valB === "string") {
					if (valA < valB) {
						return isAsc ? -1 : 1;
					} else if (valA > valB) {
						return isAsc ? 1 : -1;
					}
				}
			}
			return 0;
		});
	}
}
