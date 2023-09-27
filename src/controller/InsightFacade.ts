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
		return Promise.reject("Not implemented.");
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
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let arr: InsightDataset[];
		return Promise.reject("Not implemented.");
	}
}
