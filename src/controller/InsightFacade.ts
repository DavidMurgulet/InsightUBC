import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";
import {Dataset, Section} from "./Dataset";

//	check if content string is base 64 ZIP
async function isBase64Zip(content: string): Promise<boolean> {
	//	decode the string
	const decodedBytes: Uint8Array = new Uint8Array(Buffer.from(content, "base64"));

	// check first 4 bytes against ZIP signature
	const isZIP =
		decodedBytes[0] === 0x50 && decodedBytes[1] === 0x4b && decodedBytes[2] === 0x03 && decodedBytes[3] === 0x04;

	if (!isZIP) {
		return Promise.resolve(false);
	}

	// validate ZIP content
	const zip = new JSZip();
	try {
		await zip.loadAsync(decodedBytes);
		//	loaded successfully, valid ZIP
		return true;
	} catch (error) {
		//	load failed, corrupted or not ZIP
		return false;
	}
}

async function validateDataset(content: string): Promise<boolean> {
	//	unzip file

	//	iterate through folders/ files
	//	JSON file contains sections within "result" key
	//	check if at least 1 valid section
	//	valid if all Valid Query Key Fields present <idstring>_<mfield | sfield>
	/*
    +------------+--------+
    |  Dataset   | Format |
    +------------+--------+
    | uuid       | string |
    | id         | string |
    | title      | string |
    | instructor | string |
    | dept       | string |
    | year       | number |
    | avg        | number |
    | pass       | number |
    | fail       | number |
    | audit      | number |
    +------------+--------+
    */

	return Promise.resolve(false);
}

async function loadDatasetsFromDirectory(directory: string): Promise<Dataset[]> {
	const datasets: Dataset[] = [];
	const files = fs.readdirSync(directory);

	const zipPromises = files
		.filter((file) => path.extname(file) === ".zip")
		.map(async (file) => {
			const zipData = fs.readFileSync(path.join(directory, file));
			const zip = new JSZip();
			const content = await zip.loadAsync(zipData);

			const coursesFolder = content.folder("courses");
			if (!coursesFolder) {
				return;
			}

			const datasetId = path.basename(file, ".zip");
			const courseFiles = Object.values(coursesFolder.files).filter(
				(relativePath) => path.extname(relativePath.name) === ".json"
			);

			const sectionsPromises = courseFiles.map(async (courseFile) => {
				const jsonData = await courseFile.async("text");
				const courseData = JSON.parse(jsonData);
				return courseData.result.map((sectionData: any) => {
					const uuid = `${datasetId}_${sectionData.id}`;
					return new Section(
						uuid,
						sectionData.id,
						sectionData.title,
						sectionData.instructor,
						sectionData.dept,
						sectionData.year,
						sectionData.avg,
						sectionData.pass,
						sectionData.fail,
						sectionData.audit
					);
				});
			});

			const sectionsArrays = await Promise.all(sectionsPromises);
			const sections = sectionsArrays.flat();

			const dataset = new Dataset(datasetId, sections.length, sections, InsightDatasetKind.Sections);
			datasets.push(dataset);
		});
	await Promise.all(zipPromises);
	return datasets;
}

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");

		//	Load datasets from memory if they exist
		let listOfDatasets = loadDatasetsFromDirectory("./data");
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		//	load current datasets from disk
		//	check if id already exists
		//	TDOO

		//	check if id is valid
		if (!id || id.includes("_") || id.trim() === "") {
			return Promise.reject(new InsightError());
		}

		//	checks if it is a valid non-empty ZIP file
		const isZIP = await isBase64Zip(content);

		if (!isZIP) {
			return Promise.reject(new InsightError());
		}

		//	check if kind is valid
		if (kind === InsightDatasetKind.Rooms) {
			//	reject if Rooms
			return Promise.reject(new InsightError());
		}

		// check if dataset is valid
		const isValidDataset = validateDataset(content);

		//	add dataset to ./data

		//	return string array of ids of all currently added dataset (upon success)

		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
