import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
// import "" from "./datasetUtils";
import {persistDir, loadDatasetsFromDirectory, saveDatasetToDirectory} from "./directoryPersistance";
import fs from "fs-extra";
import {Validator} from "./Validator";
import {Dataset, Section} from "./Dataset";
// import {Filter, Comp, SectionMField, SectionSField, SectionField, Where, Options, QueryRefactored} from "./Query";
// import {Dataset} from "./Dataset";
import {
	Filter,
	Comp,
	QueryNode,
	SectionMField,
	SectionSField,
	SectionField,
	Where,
	Options,
	QueryRefactored,
} from "./Query";
import {Suite} from "mocha";
import {subtle} from "crypto";
import {isKeyObject} from "util/types";
import {makeLeaf, parseOptionsRefactored, parseTransformations, parseWhereRefactored} from "./Parse";
import {Collector} from "./Collector";
import {Transformations} from "./Transformations";
import {transformAsserterArgs} from "chai-as-promised";
import {isBase64Zip} from "./datasetAdditionalUtils";
import {validateCourseDataset, validateRoomDataset} from "./datasetUtils";
export default class InsightFacade implements IInsightFacade {
	public listOfDatasets: Dataset[] | null;
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
		// console.log("InsightFacadeImpl::init()");
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
			if (!id || typeof id !== "string" || id.includes("_") || id.includes(" ") || id.trim() === "") {
				throw new InsightError("Invalid ID.");
			}

			//	checks if it is a valid non-empty ZIP file
			const isZIP = await isBase64Zip(content);
			if (!isZIP) {
				throw new InsightError("Content is not a valid ZIP.");
			}

			//	check if kind is valid
			let result: string[];
			if (kind === InsightDatasetKind.Rooms) {
				result = await this.tryAddRoomKind(content, id);
			} else {
				result = await this.tryAddCourseKind(content, id);
			}

			return result;
		}
	}

	private async tryAddCourseKind(content: string, id: string) {
		if (!this.listOfDatasets) {
			throw new InsightError("no list of Datasets");
		}
		// check if dataset is valid, if valid add to this.listOfDatasets and write to dir
		const isValidCourseDataset = await validateCourseDataset(content, id);
		if (!isValidCourseDataset.success) {
			throw new InsightError("Invalid dataset content.");
		}

		//	add dataset to disk (./data)
		if (isValidCourseDataset.dataset instanceof Dataset) {
			// save to disk
			await saveDatasetToDirectory(isValidCourseDataset.dataset);
			// save to memory
			this.listOfDatasets.push(isValidCourseDataset.dataset);
		}

		//	return string array of ids of all currently added dataset (upon success)
		const datasets = this.listOfDatasets;
		return datasets.map((dataset) => dataset.id);
	}

	private async tryAddRoomKind(content: string, id: string) {
		if (!this.listOfDatasets) {
			throw new InsightError("no list of Datasets");
		}
		// check if dataset is valid, if valid add to this.listOfDatasets and write to dir
		const isValidRoomDataset = await validateRoomDataset(content, id);
		if (!isValidRoomDataset.success) {
			throw new InsightError("Invalid dataset content.");
		}

		//	add dataset to disk (./data)
		if (isValidRoomDataset.dataset instanceof Dataset) {
			// save to disk
			await saveDatasetToDirectory(isValidRoomDataset.dataset);
			// save to memory
			this.listOfDatasets.push(isValidRoomDataset.dataset);
		}

		//	return string array of ids of all currently added dataset (upon success)
		const datasets = this.listOfDatasets;
		return datasets.map((dataset) => dataset.id);
	}

	public async getDatasets() {
		await this.ensureInitialized();
		return this.listOfDatasets;
	}

	public async aDataset(dataset: Dataset) {
		let datasets = await this.getDatasets();
		if (datasets) {
			datasets.push(dataset);
		}
		throw new InsightError();
	}

	public async removeDataset(id: string): Promise<string> {
		await this.ensureInitialized();
		// Path for data folders
		let dirPath = persistDir + "/" + id + ".json";
		// Checks for invalid id
		if (!id || typeof id !== "string" || id.includes("_") || id.includes(" ") || id.trim() === "") {
			throw new InsightError("Invalid ID format");
		}
		try {
			// Check if the file exists
			await fs.promises.stat(dirPath);
		} catch (e: any) {
			if ((e as any).code === "ENOENT") {
				throw new NotFoundError(`Dataset with ID '${id}' does not exist on disk`);
			} else {
				throw new InsightError(`Error accessing dataset file: ${e.message}`);
			}
		}
		try {
			// Remove the file
			await fs.promises.unlink(dirPath);
		} catch (e: any) {
			throw new InsightError(`Error deleting dataset file: ${e.message}`);
		}
		try {
			const datasets = await this.getDatasets();
			if (!datasets) {
				throw new InsightError("Loaded datasets are null");
			}

			const datasetExists = datasets.some((dataset) => dataset.id === id);
			if (!datasetExists) {
				throw new NotFoundError(`Dataset with ID '${id}' not found in loaded datasets`);
			}
			this.listOfDatasets = datasets.filter((dataset) => dataset.id !== id);
			return id;
		} catch (e: any) {
			throw new InsightError(`Error processing dataset removal: ${e.message}`);
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		let datasets = await this.getDatasets();
		if (!datasets) {
			return Promise.reject(new InsightError());
		}
		const dataCollector = new Collector(datasets);
		const validator = new Validator(datasets);
		if (query instanceof Object) {
			let where!: Where;
			let options!: Options;
			let transformations!: Transformations;
			let parsedQuery: QueryRefactored;
			for (const k in query) {
				if (Object.prototype.hasOwnProperty.call(query, k)) {
					let subQuery: object = (query as any)[k];
					if (k === "WHERE") {
						where = parseWhereRefactored(subQuery, k);
					} else if (k === "OPTIONS") {
						options = parseOptionsRefactored(subQuery, k);
					} else if (k === "TRANSFORMATIONS") {
						transformations = parseTransformations(subQuery, k);
					} else {
						return Promise.reject(new InsightError("InsightError"));
					}
				}
			}
			if (where === undefined || options === undefined) {
				return Promise.reject(new InsightError());
			}
			try {
				if (transformations !== undefined) {
					validator.hasTransformations = true;
					parsedQuery = new QueryRefactored(where, options, transformations);
					const transValidated = validator.validateTransformations(transformations);
					if (transValidated.error === 1) {
						return Promise.reject(new InsightError(transValidated.msg));
					}
				} else {
					parsedQuery = new QueryRefactored(where, options);
				}
				const whereValidated = validator.validateWhereRefactored(where);
				const optionsValidated = validator.validateOptionsRefactored(options);
				return this.validate(whereValidated, optionsValidated, validator, dataCollector, parsedQuery);
			} catch (e) {
				throw new InsightError();
			}
		} else {
			return Promise.reject(new InsightError("query not an object"));
		}
	}

	public validate(
		where: {error: number; msg: string},
		option: {error: number; msg: string},
		validator: Validator,
		dataCollector: Collector,
		query: QueryRefactored
	): Promise<InsightResult[]> {
		if (where.error === 0 && option.error === 0) {
			if (validator.checkDatasetValidity() === 0) {
				let result = dataCollector.execQueryRefactored(query);
				if (result.length > 5000) {
					return Promise.reject(new ResultTooLargeError("result is too large"));
				} else {
					return Promise.resolve(result);
				}
			} else if (validator.checkDatasetValidity() === 1) {
				return Promise.reject(new InsightError("cannot query multiple datasets / invalid dataset queried"));
			}
		} else if (where.error === 1) {
			return Promise.reject(new InsightError(where.msg));
		} else if (option.error === 1) {
			return Promise.reject(new InsightError(option.msg));
		}
		return Promise.reject(new InsightError("nope"));
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.ensureInitialized();
		return new Promise((resolve, reject) => {
			try {
				if (!this.listOfDatasets) {
					return Promise.reject(new InsightError("InsightError listOfDatasets null"));
				}
				const datasetsInfo = this.listOfDatasets.map((dataset) => {
					return {
						id: dataset.id,
						kind: dataset.kind,
						numRows: dataset.data.length,
					};
				});
				resolve(datasetsInfo);
			} catch (error) {
				reject(new Error("An error occurred while listing datasets."));
			}
		});
	}
}
