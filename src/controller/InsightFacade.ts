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
		// stringify json
		// add to data
		let dset: Dataset;
		let sec: Section;

		sec = new Section("1248", "110", "comptn, progrmng", "kiczales, gregor", "cpsc", 2014, 71.07, 180, 38, 0);

		dset = new Dataset(id, kind, [sec], 1);
		let dsetJSON = JSON.stringify(dset);
		fs.outputFileSync("project_team208/data", dsetJSON, "utf8");

		return Promise.resolve([id]);
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
			// delete from both disk and memory
			// Dataset class with: id, num rows, section[], kind
			// Section class: with query keys
			fs.unlinkSync(path);
			return Promise.resolve(id);
		} else {
			// throw error, (dataset not found)
			return Promise.reject(new NotFoundError());
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		// parse the query, giving error cuz of unknown type
		// const jsonQuery = JSON.parse(query);

		// validate the query
		// if (this.validateQuery(jsonQuery)) {
		// 	// valid case
		// } else {
		// 	return Promise.reject(new InsightError());
		// }

		return Promise.reject("Not implemented.");
	}

	whereBlock(where: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	// checks if query is valid
	validateQuery(query: unknown): boolean {
		// also giving errors cuz of unknown
		// if (query.includes("WHERE") && query.includes("OPTIONS")) {
			// query valid
			return true;
		// }
		return false;
	}

	optionsBlock(opt: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let arr: InsightDataset[];
		return Promise.reject("Not implemented.");
	}
}
