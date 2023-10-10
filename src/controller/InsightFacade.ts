import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import * as fs from "fs";
import {Dataset} from "./Dataset";
import {persistDir, isBase64Zip, validateDataset, loadDatasetsFromDirectory} from "./datasetUtils";

export default class InsightFacade implements IInsightFacade {
	private listOfDatasets: Dataset[];

	// //	access listOfDatasets for debugging
	// public getListOfDatasets(): Dataset[] {
	// 	return this.listOfDatasets;
	// }
	public async reloadDatasets(): Promise<void> {
		if (!fs.existsSync(persistDir)) {
			fs.mkdirSync(persistDir);
		}
		//	Load datasets from memory if they exist
		try {
			this.listOfDatasets = await loadDatasetsFromDirectory(persistDir);
		} catch (error) {
			console.error("Error loading datasets:", error);
		}
	}

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.listOfDatasets = [];
	}

	//	initialize to load datasets, must be called after instantiating new InsightFacade
	public async initialize(): Promise<void> {
		return this.reloadDatasets();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.listOfDatasets.some((dataset) => dataset.id === id)) {
			//	id exists
			throw new InsightError("Dataset ID already exists.");
		}

		//	check if id is valid
		if (!id || id.includes("_") || id.trim() === "") {
			throw new InsightError("Invalid ID.");
		}

		//	checks if it is a valid non-empty ZIP file
		const isZIP = await isBase64Zip(content);
		if (!isZIP) {
			throw new InsightError("Content is not a valid ZIP.");
		}

		//	check if kind is valid
		if (kind === InsightDatasetKind.Rooms) {
			//	reject if Rooms
			throw new InsightError("Invalid dataset kind.");
		}

		// check if dataset is valid, if valid add to this.listOfDatasets and write to dir
		const isValidDataset = await validateDataset(content, id);
		if (!isValidDataset.success) {
			throw new InsightError("Invalid dataset content.");
		}

		//	add dataset to disk (./data)
		if (isValidDataset.dataset instanceof Dataset) {
			this.listOfDatasets.push(isValidDataset.dataset);
		}

		//	return string array of ids of all currently added dataset (upon success)
		const datasets = await this.listDatasets();
		return datasets.map((dataset) => dataset.id);
	}

	public removeDataset(id: string): Promise<string> {
		// path for data folders
		let dirPath = persistDir + "/" + id + ".json";

		// checks for invalid id,
		if (!id || id.includes("_") || !id.trim().length) {
			return Promise.reject(new InsightError());
		}

		// checking if path exists
		if (fs.statSync(dirPath)) {
			// remove path

			fs.unlinkSync(dirPath);

			// Update the listOfDatasets array without re-reading from the filesystem
			this.listOfDatasets = this.listOfDatasets.filter((dataset) => dataset.id !== id);

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
		return new Promise((resolve, reject) => {
			try {
				const datasetsInfo = this.listOfDatasets.map((dataset) => {
					return {
						id: dataset.id,
						kind: dataset.kind,
						numRows: dataset.sections.length,
					};
				});
				resolve(datasetsInfo);
			} catch (error) {
				reject(new Error("An error occurred while listing datasets."));
			}
		});
	}
}
