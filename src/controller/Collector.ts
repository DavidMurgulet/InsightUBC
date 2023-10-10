import {Dataset, Section} from "./Dataset";
import {Field, MField, Query, QueryNode, SField} from "./Query";
import {Result} from "./Result";
import {resolve} from "dns";
import InsightFacade from "./InsightFacade";
import {InsightError, InsightResult} from "./IInsightFacade";

export class Collector {
	private datasets: Dataset[];
	public currDatasetID!: string;
	constructor(datasets: Dataset[]) {
		this.datasets = datasets;
	}

	public getDatasets() {
		return this.datasets;
	}

	public execQuery(query: Query): InsightResult[] {
		const where = query.where;
		const options = query.options;
		const col: QueryNode = options.getChildWithKey("COLUMNS") as QueryNode;
		const resultFields = this.extractCol(col);
		let hasComparator = false;
		let filteredSections: Section[];

		if (where.getChilds().length === 1) {
			hasComparator = true;
		}

		if (hasComparator) {
			const comp = where.getChilds()[0];
			filteredSections = this.execWhere(comp);
		} else {
			let datasetID = this.splitKey(col.getChilds()[0].getKey())[0];
			filteredSections = this.allSections(datasetID);
		}

		// apply all executed OPTIONS to it.
		const results = this.execOpts(resultFields, filteredSections);

		if (options.getChilds().length === 2) {
			const order = options.getChildWithKey("ORDER") as QueryNode;
			const orderBy = order.getChilds()[0].getKey();
			return this.orderResults(results, orderBy);
		}

		return results;
	}

	public allSections(datasetID: string): Section[] {
		let all: Section[] = [];

		for (const set of this.getDatasets()) {
			if (set.id === datasetID) {
				for (const sec of set.sections) {
					all.push(sec);
				}
			}
		}

		return all;
	}

	public orderResults(results: InsightResult[], order: string): InsightResult[] {
		let field = order;
		let orderBy = this.splitKey(order)[1];

		// CHAT GPT
		return results.sort((a, b) => {
			const valA = a[field];
			const valB = b[field];
			if (typeof valA === "number" && typeof valB === "number") {
				return valA - valB;
			} else if (typeof valA === "string" && typeof valB === "string") {
				return valA.localeCompare(valB);
			}
			// Handle cases where the field values are not directly comparable (e.g., mixed types)
			return 0;
		});
	}

	public execOpts(columns: string[], sections: Section[]) {
		const results: InsightResult[] = [];

		for (const sec of sections) {
			// for each section, make a new result
			const result = new Result();
			for (const col of columns) {
				let field = this.splitKey(col)[1];
				result[col] = sec[field];
			}
			results.push(result);
		}

		return results;
	}

	public removeDuplicates(arr: any[]): any[] {
		return Array.from(new Set(arr));
	}

	public filterDuplicates(arr: any[]): any[] {
		const duplicatedValuesArray = arr.filter((value, index, array) => {
			return array.indexOf(value) !== index;
		});

		return Array.from(new Set(duplicatedValuesArray));
	}

	public extractCol(columns: QueryNode): string[] {
		let cols: string[] = [];
		for (const c of columns.getChilds()) {
			cols.push(c.getKey());
		}
		return cols;
	}

	// returns an array of sections pertaining to the WHERE branch.
	public execWhere(node: QueryNode): any[] {
		const operator = node.getKey();
		let filtered: any[] = [];
		let notFiltered: Section[] = [];

		if (operator === "AND") {
			for (const child of node.getChilds()) {
				let returnedSec = this.execWhere(child);
				for (const s of returnedSec) {
					filtered.push(s);
				}
			}
			// filter out sections that aren't in all children arrays.
			filtered = this.filterDuplicates(filtered);
			return filtered;
		} else if (operator === "OR") {
			for (const child of node.getChilds()) {
				let returnedSec = this.execWhere(child);
				for (const s of returnedSec) {
					filtered.push(s);
				}
			}
			filtered = this.removeDuplicates(filtered);
			return filtered;
		} else if (operator === "NOT") {
			for (const child of node.getChilds()) {
				let returnedSec = this.execWhere(child);
				for (const s of returnedSec) {
					filtered.push(s);
				}
			}
			for (const d of this.datasets) {
				if (this.currDatasetID === d.id) {
					for (const s of d.sections) {
						if (!filtered.includes(s)) {
							notFiltered.push(s);
						}
					}
				}
			}
			// take all sections that aren't present in filtered and return it.
			return notFiltered;
		} else if (operator === ("GT" || "LT" || "EQ" || "IS")) {
			return this.queryLeaf(node);
		}
		return filtered;
	}

	// splits a key into "datasetID" and "key"
	public splitKey(key: string) {
		return key.split("_");
	}

	public queryLeaf(node: QueryNode): any[] {
		let filteredSections: any[] = [];
		const comparator = node.getKey(); // GT/EQ/LT/IS
		const datasetID = this.splitKey(node.getChilds()[0].getKey())[0]; // ubc
		const field = this.splitKey(node.getChilds()[0].getKey())[1]; // avg
		const leafKey = node.getChilds()[0].getChilds()[0].getKey(); // 93
		this.currDatasetID = datasetID;
		switch (comparator) {
			case "GT":
				filteredSections = this.filterSectionsByCondition("GT", datasetID, field, leafKey);
				break;
			case "LT":
				filteredSections = this.filterSectionsByCondition("LT", datasetID, field, leafKey);
				break;
			case "EQ":
				filteredSections = this.filterSectionsByCondition("EQ", datasetID, field, leafKey);
				break;
			case "IS":
				for (const set of this.getDatasets()) {
					if (set.id === datasetID) {
						for (const sec of set.sections) {
							const first = leafKey[0];
							const last = leafKey[leafKey.length - 1];
							const key = leafKey.replace(/\*/g, "");
							const matchVal: string = sec[field] as string;
							if ((first && last) === "*") {
								if (matchVal.includes(key)) {
									filteredSections.push(sec);
								}
							} else if (first === "*") {
								if (matchVal.endsWith(key)) {
									filteredSections.push(sec);
								}
							} else if (last === "*") {
								if (matchVal.startsWith(key)) {
									filteredSections.push(sec);
								}
							} else if ((first && last) !== "*") {
								if (matchVal === key) {
									filteredSections.push(sec);
								}
							}
						}
					}
				}
				break;
		}

		return filteredSections;
	}


	public filterSectionsByCondition(condition: string, datasetID: string, field: string, leafKey: any): Section[] {
		const filteredSections: Section[] = [];

		for (const set of this.getDatasets()) {
			if (set.id === datasetID) {
				for (const sec of set.sections) {
					if ((condition === "GT" && sec[field] > leafKey) ||
						(condition === "LT" && sec[field] < leafKey) ||
						(condition === "EQ" && sec[field] === leafKey)) {
						filteredSections.push(sec);
					}
				}
			}
		}

		return filteredSections;
	}

}
