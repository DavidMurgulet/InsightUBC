import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import fs from "fs-extra";

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
		let path = "project_team208/data" + "/" + id;
		if (id.includes("_")) {
			return Promise.reject(InsightError);
		} else if (id.trim().length) {
			return Promise.reject(InsightError);
		}
		if (fs.existsSync(path)) {
			return Promise.resolve(id);
		} else {
			return Promise.reject(NotFoundError);
		}


		// first check if dataset is found in disk
		// if so delete and return id
		// else return error

		// dir = project_team208/data
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let arr: InsightDataset[];
		return Promise.reject("Not implemented.");
	}
}
