import {
	Columns,
	Comparator,
	LogicComparator,
	Options,
	Order,
	RoomField,
	RoomMField,
	RoomSField,
	SectionField,
	SectionMField,
	SectionSField,
	Where,
} from "../../../src/controller/Query";
import {Dataset} from "../../../src/controller/Dataset";
import {ApplyRule, GroupBlock, Transformations} from "../../../src/controller/Transformations";
import {InsightDatasetKind} from "../../../src/controller/IInsightFacade";

let colFields: string[];

export class Validator {
	public datasets: Dataset[];
	public leafDatasets: string[];
	public transformationKeys: string[] = [];
	public hasTransformations: boolean = false;
	constructor(datasets: Dataset[]) {
		this.datasets = datasets;
		this.leafDatasets = [];
	}
	public validateWhereRefactored(where: Where): {error: number; msg: string} {
		if (where.comparator !== undefined) {
			where.hasComparator = true;
			if (where.comparator instanceof LogicComparator) {
				let v = this.validateLogicComp(where.comparator);
				if (v.error === 1) {
					return v;
				}
			} else {
				let v = this.validateComp(where.comparator);
				if (v.error === 1) {
					return v;
				}
			}
		}
		return {error: 0, msg: ""};
	}
	public validateLogicComp(logic: LogicComparator): {error: number; msg: string} {
		// must be non-empty array, no {}
		// must have at least 1 key
		// TODO: possibly redundant, check the parsing code
		if (logic.operator === "NOT") {
			if (logic.children.length !== 1) {
				return {error: 1, msg: "NOT error"};
			}
		} else if (logic.operator === "AND" || logic.operator === "OR") {
			if (logic.children.length === 0) {
				return {error: 1, msg: "Logic must have at least 1 child"};
			}
		}
		for (const c of logic.children) {
			if (c instanceof LogicComparator) {
				let v = this.validateLogicComp(c);
				if (v.error === 1) {
					return v;
				}
			} else {
				let v = this.validateComp(c);
				if (v.error === 1) {
					return v;
				}
			}
		}
		return {error: 0, msg: ""};
	}
	public validateComp(comp: Comparator) {
		let op = comp.operator;
		let key = Object.keys(comp.child)[0];
		let val = Object.values(comp.child)[0];
		if (this.validateKey(key, op).error === 1) {
			return {error: 1, msg: "invalid key in comp"};
		}
		if (op === "GT" || op === "LT" || op === "EQ") {
			if (typeof val !== "number") {
				return {error: 1, msg: "value type is not a number"};
			}
		} else if (op === "IS") {
			if (typeof val !== "string") {
				return {error: 1, msg: "value type is not a string"};
			}
			if (this.validWildcard(val).error === 1) {
				return {error: 1, msg: "wildcard error"};
			}
		}
		return {error: 0, msg: ""};
	}
	public validateOptionsRefactored(options: Options): {error: number; msg: string} {
		if (options.columns === undefined) {
			return {error: 1, msg: "columns is undefined"};
		}
		if (this.validateColumnsRefactored(options.columns).error === 1) {
			return {error: 1, msg: this.validateColumnsRefactored(options.columns).msg};
		}
		if (options.order !== undefined) {
			if (this.validateOrderRefactored(options.order).error === 1) {
				return {error: 1, msg: this.validateOrderRefactored(options.order).msg};
			}
		}
		return {error: 0, msg: ""};
	}
	public validateTransformations(transformations: Transformations): {error: number; msg: string} {
		this.hasTransformations = true;
		if (transformations.groupBlock === undefined || !transformations.hasApply) {
			return {error: 1, msg: "group or apply are missing from transformations"};
		}
		if (this.validateGroupBlock(transformations.groupBlock).error === 1) {
			return {error: 1, msg: this.validateGroupBlock(transformations.groupBlock).msg};
		}
		if (this.validateApplyBlock(transformations.applyList).error === 1) {
			return {error: 1, msg: this.validateApplyBlock(transformations.applyList).msg};
		}
		return {error: 0, msg: ""};
	}
	public validateGroupBlock(group: GroupBlock): {error: number; msg: string} {
		if (group.keys.length === 0) {
			return {error: 1, msg: "group cannot be empty"};
		}
		for (const key of group.keys) {
			if (this.validateKey(key).error === 1) {
				return {error: 1, msg: "invalid key in group block"};
			}
			this.transformationKeys.push(key);
		}
		return {error: 0, msg: ""};
	}
	public validateKey(key: string, operator?: string): {error: number; msg: string} {
		if (key.includes("_")) {
			let dsetID = key.split("_")[0];
			let field = key.split("_")[1];
			if (dsetID === "") {
				return {error: 1, msg: "empty string instead of dataset"};
			}
			this.leafDatasets.push(dsetID);
			for (const d of this.datasets) {
				if (d.id === dsetID) {
					if (d.kind === InsightDatasetKind.Rooms) {
						if (operator !== undefined) {
							if (operator === "GT" || operator === "LT" || operator === "EQ") {
								if (!Object.values(RoomMField).includes(field as any)) {
									return {error: 1, msg: "field should be a number field"};
								}
							} else if (operator === "IS") {
								if (!Object.values(RoomSField).includes(field as any)) {
									return {error: 1, msg: "field should be a string field"};
								}
							} else {
								return {error: 1, msg: "operator is not GT/LT/EQ/IS"};
							}
						}
						if (!Object.values(RoomField).includes(field as any)) {
							return {error: 1, msg: "field is not a valid rooms field"};
						}
					} else if (d.kind === InsightDatasetKind.Sections) {
						if (operator !== undefined) {
							if (this.validateSectionField(operator, field).error === 1) {
								return this.validateSectionField(operator, field);
							}
						}
						if (!Object.values(SectionField).includes(field as any)) {
							return {error: 1, msg: "field is not a valid sections field"};
						}
					}
				}
			}
		} else {
			return {error: 1, msg: "key is not in proper format (dataset_key)"};
		}
		return {error: 0, msg: ""};
	}
	public validateSectionField(operator: string, field: string): {error: number; msg: string} {
		if (operator === "GT" || operator === "LT" || operator === "EQ") {
			if (!Object.values(SectionMField).includes(field as any)) {
				return {error: 1, msg: "field should be a number field"};
			}
		} else if (operator === "IS") {
			if (!Object.values(SectionSField).includes(field as any)) {
				return {error: 1, msg: "field should be a string field"};
			}
		} else {
			return {error: 1, msg: "operator is not GT/LT/EQ/IS"};
		}
		return {error: 0, msg: ""};
	}
	public validateApplyBlock(rule: ApplyRule[]): {error: number; msg: string} {
		let seenKeys: string[] = [];
		for (const i of rule) {
			if (i.applyKey.includes("_") || i.applyKey === "" || seenKeys.includes(i.applyKey)) {
				return {error: 1, msg: "applyKey contains underscore/empty/not unique"};
			}
			if (i.applyToken === "MAX" || i.applyToken === "MIN" || i.applyToken === "AVG" || i.applyToken === "SUM") {
				if (this.validateKey(i.key).error === 1) {
					return {error: 1, msg: "applyRule has invalid KEY"};
				}
				let field = i.key.split("_")[1];
				if (
					!Object.values(SectionMField).includes(field as any) &&
					!Object.values(RoomMField).includes(field as any)
				) {
					return {error: 1, msg: "token must be used on a numeric key"};
				}
			} else if (i.applyToken === "COUNT") {
				if (this.validateKey(i.key).error === 1) {
					return {error: 1, msg: "applyRule has invalid KEY"};
				}
			} else {
				return {error: 1, msg: "applyToken is not MAX/MIN/AVG/SUM/COUNT"};
			}
			seenKeys.push(i.applyKey);
			this.transformationKeys.push(i.applyKey);
		}
		return {error: 0, msg: ""};
	}
	public validateColumnsRefactored(columns: Columns): {error: number; msg: string} {
		// TODO: check key = columns should have been done in parsing
		// 	5. if GROUP not empty, all COL keys must be in GROUP, or be an APPLY rule
		// 	Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present
		const cols = columns.cols; // ["sections_avg", "sections_dept", "sections_pass"]
		if (cols.length < 1) {
			return {error: 1, msg: "empty columns"};
		}
		for (const key of cols) {
			// if (this.validateKey(key).error === 1) {
			// 	return {error: 1, msg: "invalid key in columns"};
			// }
			if (this.hasTransformations) {
				if (!this.transformationKeys.includes(key)) {
					return {error: 1, msg: "key not in group/applyRules"};
				}
			} else {
				if (this.validateKey(key).error === 1) {
					return {error: 1, msg: "invalid key in columns"};
				}
			}
		}

		colFields = cols;
		return {error: 0, msg: ""};
	}
	public validateOrderRefactored(order: Order): {error: number; msg: string} {
		// TODO: check key = order should have been done in parsing
		if (order.isSingleColumn()) {
			// case 1: no dir, 1 column
			for (const s of colFields) {
				if (order.keys === s) {
					return {error: 0, msg: ""};
				}
			}
			return {error: 1, msg: "order is not in columns"};
		} else {
			if (order.dir !== "UP" && order.dir !== "DOWN") {
				return {error: 1, msg: "dir is not UP or DOWN"};
			}
			for (const k of order.keys) {
				if (!colFields.includes(k)) {
					return {error: 1, msg: "order key not in columns/applyRules"};
					// && !this.transformationKeys.includes(k)
				}
			}
		}

		return {error: 0, msg: ""};
	}
	public checkDatasetValidity() {
		if (this.leafDatasets.every((element) => element === this.leafDatasets[0])) {
			for (const d of this.datasets) {
				if (this.leafDatasets[0] === d.id) {
					return 0;
				}
			}
			return 1;
		} else {
			return 1;
		}
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
