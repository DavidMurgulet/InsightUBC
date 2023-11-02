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
import {Validator} from "../../test/resources/queries/Validator";
import {Dataset, Section} from "./Dataset";
import {
	Query,
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

export default class InsightFacade implements IInsightFacade {
	private listOfDatasets: Dataset[];
	// //	access listOfDatasets for debugging
	public getListOfDatasets(): Dataset[] {
		return this.listOfDatasets;
	}
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

	public getDatasets() {
		return this.listOfDatasets;
	}

	public aDataset(dataset: Dataset) {
		this.getDatasets().push(dataset);
	}

	public removeDataset(id: string): Promise<string> {
		// path for data folders
		let dirPath = persistDir + "/" + id + ".json";

		// checks for invalid id,
		if (!id || id.includes("_") || !id.trim().length) {
			return Promise.reject(new InsightError());
		}

		try {
			fs.statSync(dirPath);
			fs.unlinkSync(dirPath);
			this.listOfDatasets = this.listOfDatasets.filter((dataset) => dataset.id !== id);

			return Promise.resolve(id);
		} catch (e) {
			if ((e as any).code === "ENOENT") {
				// 'ENOENT' stands for 'Error NO ENTry', indicating the path does not exist.
				return Promise.reject(new NotFoundError());
			}
			return Promise.reject(e); // Handle other potential errors
		}
	}

	// TODO: "NOT" in validation and querying (DONE)
	// TODO: dataset checks in validation (DONE)
	// TODO: implement ordering (DONE)
	// TODO: tiebreakers in ordering
	// TODO: double check validation WHERE validation
	// TODO: order key must be in columns (DONE)
	// TODO: wildcard handling in queryLeaf (DONE, needs testing)
	// TODO: parsing for no comparator in WHERE (DONE kinda hardcoded)
	// TODO: Semantic Checks?

	public performQuery(query: unknown): Promise<InsightResult[]> {
		const dataCollector = new Collector(this.getDatasets());
		const validator = new Validator(this.getDatasets());
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
						return Promise.reject(new InsightError());
					}
				}
			}
			if (where === undefined || options === undefined) {
				return Promise.reject(new InsightError());
			}
			let whereValidated: {error: number; msg: string};
			let optionsValidated: {error: number; msg: string};
			let transValidated: {error: number; msg: string};
			try {
				if (transformations !== undefined) {
					validator.hasTransformations = true;
					parsedQuery = new QueryRefactored(where, options, transformations);
					transValidated = validator.validateTransformations(transformations);
					if (transValidated.error === 1) {
						return Promise.reject(new InsightError(transValidated.msg));
					}
				} else {
					parsedQuery = new QueryRefactored(where, options);
				}
				whereValidated = validator.validateWhereRefactored(where);
				optionsValidated = validator.validateOptionsRefactored(options);
			} catch (e) {
				throw new InsightError();
			}
			// if (transformations !== undefined) {
			// 	validator.hasTransformations = true;
			// 	parsedQuery = new QueryRefactored(where, options, transformations);
			//
			// 	try {
			// 		transValidated = validator.validateTransformations(transformations);
			// 		if (transValidated.error === 1) {
			// 			return Promise.reject(new InsightError(transValidated.msg));
			// 		}
			// 	} catch (e) {
			// 		throw new InsightError();
			// 	}
			// } else {
			// 	parsedQuery = new QueryRefactored(where, options);
			// }
			//
			// try {
			// 	whereValidated = validator.validateWhereRefactored(where);
			// 	optionsValidated = validator.validateOptionsRefactored(options);
			// } catch (e) {
			// 	throw new InsightError("error in parsing");
			// }
			return this.validate(whereValidated, optionsValidated, validator, dataCollector, parsedQuery);
		} else {
			return Promise.reject(new InsightError("query not an object"));
		}
		return Promise.reject(new InsightError("Shouldn't reach this far"));
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

	public listDatasets(): Promise<InsightDataset[]> {
		return new Promise((resolve, reject) => {
			try {
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
