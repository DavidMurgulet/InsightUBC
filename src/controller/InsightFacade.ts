import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import fs from "fs-extra";
import {constants} from "http2";
import {Dataset, Section} from "./Dataset";
import {Query, Filter, Comp, QueryNode, MField, SField, Field} from "./Query";
import {Suite} from "mocha";
import {subtle} from "crypto";
import {isKeyObject} from "util/types";
import {makeLeaf, parseOpts, parseWhere} from "./Parse";
import {validOpts, validWhere} from "./Validate";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}
	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject();
	}

	public removeDataset(id: string): Promise<string> {
		// path for data folders
		let path = "project_team208/data" + "/" + id;

		// checks for invalid id,
		if (!id || id.includes("_") || !id.trim().length) {
			return Promise.reject(new InsightError());
		}

		// checking if path exists
		if (fs.statSync(path)) {
			// remove path

			fs.unlinkSync(path);
			return Promise.resolve(id);
		} else {
			// throw error, (dataset not found)
			return Promise.reject(new NotFoundError());
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		if (query instanceof Object) {
			let where!: QueryNode;
			let options!: QueryNode;

			for (const k in query) {
				if (Object.prototype.hasOwnProperty.call(query, k)) {
					// let subQuery: object = (<any>query)[k];
					let subQuery: object = (query as any)[k];
					if (k === "WHERE") {
						where = parseWhere(subQuery, k);
					} else if (k === "OPTIONS") {
						options = parseOpts(subQuery, k);
						console.log("test");
					} else {
						// NO WHERE/OPTIONS KEY
						return Promise.reject(new InsightError());
					}
				}
			}

			const parsedQuery = new Query(where, options);

			// if both validWhere and validOpts return true, start querying the dataset.
			if (validOpts(options) && validWhere(where)) {
				console.log("buffer");
				// perform query
			} else {
				return Promise.reject(new InsightError());
			}
		} else {
			return Promise.reject(new InsightError());
		}

		return Promise.reject(new InsightError());
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let arr: InsightDataset[];
		return Promise.reject("Not implemented.");
	}
}
