import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {persistDir, isBase64Zip, validateDataset, loadDatasetsFromDirectory} from "./datasetUtils";
import {constants} from "http2";
import fs, {remove} from "fs-extra";
import {Validator} from "./Validator";
import {Dataset, Section} from "./Dataset";
import {Query, Filter, Comp, QueryNode, MField, SField, Field} from "./Query";
import {Suite} from "mocha";
import {subtle} from "crypto";
import {isKeyObject} from "util/types";
import {makeLeaf, parseOpts, parseWhere} from "./Parse";
import {Collector} from "./Collector";

export default class InsightFacade implements IInsightFacade {
	private listOfDatasets: Dataset[] | null;
	// //	access listOfDatasets for debugging

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
		this.listOfDatasets = null;
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.listOfDatasets) {
			await this.initialize();
		}
	}

	//	initialize to load datasets, must be called after instantiating new InsightFacade
	public async initialize(): Promise<void> {
		return this.reloadDatasets();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.ensureInitialized();
		if (!this.listOfDatasets) {
			throw new InsightError("no list of Datasets");
		} else {
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
			const datasets = this.listOfDatasets;
			return datasets.map((dataset) => dataset.id);
		}
	}

	public async getDatasets() {
		await this.ensureInitialized();
		return this.listOfDatasets;
	}

	public async aDataset(dataset: Dataset) {
		let datasets = await this.getDatasets();
		if (!datasets) {
			throw new InsightError();
		}
		datasets.push(dataset);
	}

	public async removeDataset(id: string): Promise<string> {
		await this.ensureInitialized();
		// path for data folders
		let dirPath = persistDir + "/" + id + ".json";

		// checks for invalid id,
		if (!id || id.includes("_") || !id.trim().length) {
			return Promise.reject(new InsightError());
		}

		try {
			await fs.promises.stat(dirPath);
			await fs.promises.unlink(dirPath);

			const datasets = await this.getDatasets();
			if (!datasets) {
				return Promise.reject(new InsightError());
			}
			this.listOfDatasets = datasets.filter((dataset) => dataset.id !== id);

			return id;
		} catch (e) {
			if ((e as any).code === "ENOENT") {
				return Promise.reject(new NotFoundError());
			}
			return Promise.reject(e);
		}
	}

	// TODO: "NOT" in validation and querying (DONE)
	// TODO: dataset checks in validation (DONE)
	// TODO: implement ordering (DONE)
	// 		TODO: tiebreakers in ordering
	// TODO: double check validation WHERE validation
	// TODO: order key must be in columns (DONE)
	// TODO: wildcard handling in queryLeaf (DONE, needs testing)
	// TODO: parsing for no comparator in WHERE (DONE kinda hardcoded)
	// TODO: Semantic Checks

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let datasets = await this.getDatasets();
		if (!datasets) {
			return Promise.reject(new InsightError());
		}
		const dataCollector = new Collector(datasets);
		const validator = new Validator(datasets);
		if (query instanceof Object) {
			let where!: QueryNode;
			let options!: QueryNode;
			// what if WHERE, OPTIONS, WHERE
			for (const k in query) {
				if (Object.prototype.hasOwnProperty.call(query, k)) {
					let subQuery: object = (query as any)[k];
					if (k === "WHERE") {
						where = parseWhere(subQuery, k);
					} else if (k === "OPTIONS") {
						options = parseOpts(subQuery, k);
					} else {
						// NO WHERE/OPTIONS KEY
						return Promise.reject(new InsightError());
					}
				}
			}
			if (where === undefined || options === undefined) {
				return Promise.reject(new InsightError());
			}

			const parsedQuery = new Query(where, options);
			const whereValidated = validator.validWhere(where, true);
			const optionsValidated = validator.validateOptions(options);
			if (whereValidated.error === 0 && optionsValidated.error === 0) {
				if (validator.checkDatasetValidity() === 0) {
					let result = dataCollector.execQuery(parsedQuery);
					if (result.length > 5000) {
						return Promise.reject(new ResultTooLargeError("result is too large"));
					} else {
						return Promise.resolve(result);
					}
				} else if (validator.checkDatasetValidity() === 1) {
					return Promise.reject(new InsightError("cannot query multiple datasets / invalid dataset queried"));
				}
			} else if (whereValidated.error === 1) {
				return Promise.reject(new InsightError(whereValidated.msg));
			} else if (optionsValidated.error === 1) {
				return Promise.reject(new InsightError(optionsValidated.msg));
			}
		} else {
			return Promise.reject(new InsightError("query not an object"));
		}
		return Promise.reject(new InsightError("shouldn't reach this"));
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.ensureInitialized();
		return new Promise((resolve, reject) => {
			try {
				if (!this.listOfDatasets) {
					return Promise.reject(new InsightError());
				}
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
