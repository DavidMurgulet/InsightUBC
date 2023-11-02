import {Dataset, Room, Section} from "./Dataset";
import {Columns, Comparator, LogicComparator, Options, Order, QueryNode, QueryRefactored, Where} from "./Query";
import {InsightResult} from "./IInsightFacade";
import {ApplyRule, GroupBlock, orderResultsRefactored, Transformations} from "./Transformations";
import {Grouping} from "./Grouping";

export class Collector {
	public datasets: Dataset[];
	public currDatasetID!: string;
	constructor(datasets: Dataset[]) {
		this.datasets = datasets;
	}

	public getDatasets() {
		return this.datasets;
	}

	public executeOptionsRefactored(options: Options, data: any[], groups: boolean): InsightResult[] {
		const col = options.columns as Columns;
		const order = options.order;
		let results = [];
		if (groups) {
			for (const g of data) {
				const result: InsightResult = {};
				for (const c of col.cols) {
					result[c] = g[c];
				}
				results.push(result);
			}
		} else {
			for (const d of data) {
				const result: InsightResult = {};
				for (const c of col.cols) {
					let field = this.splitKey(c)[1];
					result[c] = d[field];
				}
				results.push(result);
			}
		}
		if (order !== undefined) {
			results = orderResultsRefactored(order, results);
		}
		return results;
	}

	public execQueryRefactored(query: QueryRefactored): InsightResult[] {
		const where = query.where;
		const options = query.options;
		const col = options.columns as Columns;
		const trans = query.transformations;
		const resultFields = col.cols;
		// TODO: check typing here.
		let filteredData: any[] = [];
		let hasTransformations = false;
		let hasComparator = where.hasComparator;
		if (trans !== undefined) {
			hasTransformations = true;
		}
		if (!hasComparator) {
			let dsetID = this.splitKey(col.cols[0])[0];
			filteredData = this.allSections(dsetID);
		} else {
			filteredData = this.executeWhereRefactored(where);
		}
		if (hasTransformations) {
			filteredData = this.executeTransformations(trans as Transformations, filteredData);
		}
		return this.executeOptionsRefactored(options, filteredData, hasTransformations);
	}

	public allSections(datasetID: string): Section[] {
		let all: Section[] = [];
		for (const set of this.getDatasets()) {
			if (set.id === datasetID) {
				for (const sec of set.data as Section[]) {
					all.push(sec);
				}
			}
		}
		return all;
	}

	public groupObjectsByProperties(objects: any[], propertyNames: string[]): Grouping[] {
		const groupings: {[key: string]: Grouping} = {};
		const allGroups: Grouping[] = []; // New array to store all grouping objects
		const parsedGroupBy: string[] = [];
		for (const p of propertyNames) {
			let n = this.splitKey(p)[1];
			parsedGroupBy.push(n);
		}

		for (const object of objects) {
			const groupKey = parsedGroupBy.map((propertyName) => object[propertyName]).join("-");
			if (!groupings[groupKey]) {
				// changed typing from (number | string)[]
				const groupKeyComponents: Array<number | string> = groupKey.split("-").map((component) => {
					const numValue = parseFloat(component);
					return isNaN(numValue) ? component : numValue;
				});
				groupings[groupKey] = new Grouping(propertyNames, groupKeyComponents);
				allGroups.push(groupings[groupKey]); // Add the new grouping to allGroups
			}
			groupings[groupKey].addValue(object);
		}
		return allGroups; // Return the array of all grouping objects
	}

	public executeTransformations(transformations: Transformations, filtered: any[]): any[] {
		const groupBlock = transformations.groupBlock as GroupBlock;
		const groupBy = groupBlock.keys;
		const applyRules = transformations.applyList;
		let groups = this.groupObjectsByProperties(filtered, groupBy);
		groups = this.executeApplyRules(applyRules, groups);
		const results = [];
		for (const d of groups) {
			const groupObj: InsightResult = {};
			for (let i = 0; i < d.groupKeys.length; i++) {
				groupObj[d.groupKeys[i]] = d.gKeys[i];
			}
			for (const r of d.applyKeys) {
				for (const k in r) {
					groupObj[k] = r[k];
				}
			}
			results.push(groupObj);
		}
		return results;
	}

	public executeApplyRules(rules: ApplyRule[], groups: Grouping[]): any[] {
		for (const g of groups) {
			for (const r of rules) {
				const key = this.splitKey(r.key)[1];
				if (r.applyToken === "AVG") {
					g.calculateAvg(r.applyKey, key);
				} else if (r.applyToken === "MIN") {
					g.calculateMin(r.applyKey, key);
				} else if (r.applyToken === "MAX") {
					g.calculateMax(r.applyKey, key);
				} else if (r.applyToken === "SUM") {
					g.calculateSum(r.applyKey, key);
				} else if (r.applyToken === "COUNT") {
					g.calculateCount(r.applyKey, key);
				}
			}
		}
		return groups;
	}

	public removeDuplicates(arr: any[]): any[] {
		return Array.from(new Set(arr));
	}

	public filterDuplicates(sections: any[], n: number): any[] {
		const sectionCountMap: Map<string, number> = new Map();
		// Count occurrences of each section in the original array GPT Filter sections that appear exactly 'n' times
		for (const section of sections) {
			const sectionString = JSON.stringify(section);
			sectionCountMap.set(sectionString, (sectionCountMap.get(sectionString) || 0) + 1);
		}
		const filteredSections = sections.filter((section) => {
			const sectionString = JSON.stringify(section);
			return sectionCountMap.get(sectionString) === n;
		});
		return Array.from(new Set(filteredSections));
	}

	public executeWhereRefactored(where: Where): any[] {
		let filtered: any[] = [];
		if (where.comparator instanceof LogicComparator) {
			filtered = this.executeLogic(where.comparator);
		} else if (where.comparator instanceof Comparator) {
			filtered = this.executeComparison(where.comparator);
		}
		return filtered;
	}

	public splitKey(key: string) {
		return key.split("_");
	}

	public logicOrComp(child: any): any[] {
		return child instanceof LogicComparator ? this.executeLogic(child) : this.executeComparison(child);
	}

	public executeLogic(logic: LogicComparator): any[] {
		let filtered: any[] = [];
		let notFiltered: any[] = [];
		const op = logic.operator;
		switch (op) {
			case "AND":
				for (const child of logic.children) {
					let returnedSec = this.logicOrComp(child);
					for (const s of returnedSec) {
						filtered.push(s);
					}
				}
				return this.filterDuplicates(filtered, logic.children.length);
			case "OR":
				for (const child of logic.children) {
					let returnedSec = this.logicOrComp(child);
					for (const s of returnedSec) {
						filtered.push(s);
					}
				}
				return this.removeDuplicates(filtered);
			case "NOT":
				for (const child of logic.children) {
					let returnedSec = this.logicOrComp(child);
					for (const s of returnedSec) {
						filtered.push(s);
					}
					for (const d of this.datasets) {
						if (this.currDatasetID === d.id) {
							// compare d.data, and filtered., fold theme into new array with ones that arent in both?
							const allSections: any[] = d.data as Section[] | Room[];
							notFiltered = allSections.filter((data: any) => !filtered.includes(data));
							return notFiltered;
						}
					}
				}
				return notFiltered;
		}
		return [];
	}

	public executeComparison(comp: Comparator): any[] {
		let filtered: any[] = [];
		const comparator = comp.operator; // GT/EQ/LT/IS
		const datasetID = this.splitKey(Object.keys(comp.child)[0])[0];
		const field = this.splitKey(Object.keys(comp.child)[0])[1];
		let leafKey = Object.values(comp.child)[0];
		this.currDatasetID = datasetID;
		switch (comparator) {
			case "GT":
				filtered = this.filterByCondition("GT", datasetID, field, leafKey);
				break;
			case "LT":
				filtered = this.filterByCondition("LT", datasetID, field, leafKey);
				break;
			case "EQ":
				filtered = this.filterByCondition("EQ", datasetID, field, leafKey);
				break;
			case "IS":
				for (const set of this.getDatasets()) {
					if (set.id === datasetID) {
						for (const d of set.data) {
							// TODO: possible error
							leafKey = Object.values(comp.child)[0] as string;
							const first = leafKey[0];
							const last = leafKey[leafKey.length - 1];
							const key = leafKey.replace(/\*/g, "");
							const matchVal: string = d[field] as string;
							if (first === "*" && last === "*") {
								if (matchVal.includes(key)) {
									filtered.push(d);
								}
							} else if (first === "*") {
								if (matchVal.endsWith(key)) {
									filtered.push(d);
								}
							} else if (last === "*") {
								if (matchVal.startsWith(key)) {
									filtered.push(d);
								}
							} else if (first !== "*" && last !== "*") {
								if (matchVal === key) {
									filtered.push(d);
								}
							}
						}
					}
				}
				break;
		}
		return filtered;
	}

	public filterByCondition(condition: string, datasetID: string, field: string, leafKey: any): any[] {
		const filteredSections: any[] = [];
		for (const set of this.getDatasets()) {
			if (set.id === datasetID) {
				for (const d of set.data) {
					if (
						(condition === "GT" && d[field] > leafKey) ||
						(condition === "LT" && d[field] < leafKey) ||
						(condition === "EQ" && d[field] === leafKey)
					) {
						filteredSections.push(d);
					}
				}
			}
		}
		return filteredSections;
	}
}
