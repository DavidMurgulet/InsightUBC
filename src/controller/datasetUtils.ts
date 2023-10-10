import JSZip from "jszip";
import {Dataset, Section} from "./Dataset";
import * as fs from "fs";
import * as path from "path";
import {InsightDatasetKind} from "./IInsightFacade";

const persistDir = "./data";

//	check if content string is base 64 ZIP
export async function isBase64Zip(content: string): Promise<boolean> {
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

//	citation: Structure of JSZip decode from consultation with Chat GTP
export async function validateDataset(
	content: string,
	id: string
): Promise<{success: boolean; dataset: Dataset | null}> {
	try {
		const zip = await loadZipContent(content);
		const validSections = await extractValidSectionsFromZip(zip);
		const dataset = await createDatasetFromSections(id, validSections);

		return Promise.resolve({success: !!dataset, dataset});
	} catch (error) {
		console.error("Error in validateDataset:", error);
		return Promise.resolve({success: false, dataset: null});
	}
}

async function loadZipContent(content: string): Promise<JSZip> {
	const decodedBytes: Uint8Array = new Uint8Array(Buffer.from(content, "base64"));
	const zip = new JSZip();
	await zip.loadAsync(decodedBytes);
	return zip;
}

async function extractValidSectionsFromZip(zip: JSZip): Promise<Section[]> {
	const coursesFolder = zip.folder("courses");
	if (!coursesFolder) {
		throw new Error("Courses folder not found in zip");
	}
	const jsonFiles = coursesFolder.file(/^.*$/);
	const requiredFields = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];
	const fileContents = await Promise.all(jsonFiles.map((file) => file.async("string")));
	const validSections: Section[] = [];

	for (let fileContent of fileContents) {
		let jsonContent;
		try {
			jsonContent = JSON.parse(fileContent);
		} catch (error) {
			console.error("Error parsing JSON content:", error);
			continue;
		}
		if (jsonContent.result) {
			for (let section of jsonContent.result) {
				if (requiredFields.every((field) => Object.prototype.hasOwnProperty.call(section, field))) {
					const curSection: Section = mapSectionToClass(section as any);
					validSections.push(curSection);
				}
			}
		}
	}
	return validSections;
}

async function createDatasetFromSections(id: string, sections: Section[]): Promise<Dataset | null> {
	if (sections.length > 0) {
		const dataset = new Dataset(id, sections.length, sections, InsightDatasetKind.Sections);
		await saveDatasetToDirectory(dataset);
		return dataset;
	}
	return null;
}

// mapSectionToClass function with error handling
function mapSectionToClass(section: any): Section {
	try {
		return new Section(
			String(section.id),
			section.Course,
			section.Title,
			section.Professor,
			section.Subject,
			parseInt(section.Year, 10),
			section.Avg,
			section.Pass,
			section.Fail,
			section.Audit
		);
	} catch (error) {
		console.error("Error mapping section to class:", error);
		throw error;
	}
}

// loadDatasetsFromDirectory function with enhanced error handling
export async function loadDatasetsFromDirectory(directory: string): Promise<Dataset[]> {
	try {
		const datasets: Dataset[] = [];
		if (!fs.existsSync(directory)) {
			throw new Error(`Directory ${directory} does not exist.`);
		}
		const files = fs.readdirSync(directory);
		const jsonFiles = files.filter((file) => path.extname(file) === ".json");
		for (const file of jsonFiles) {
			const jsonData = fs.readFileSync(path.join(directory, file), "utf8");
			const datasetData = JSON.parse(jsonData);
			const datasetId = path.basename(file, ".json");
			const sections = datasetData.sections.map((sectionData: any) => {
				return new Section(
					sectionData.uuid,
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
			const dataset = new Dataset(datasetId, sections.length, sections, InsightDatasetKind.Sections);
			datasets.push(dataset);
		}
		return Promise.resolve(datasets);
	} catch (error) {
		console.error("Error loading datasets from directory ${error.message}");
		return Promise.reject(error);
	}
}

//	given a Dataset Class Parse it into JSON and save in ./data folder
export async function saveDatasetToDirectory(dataset: Dataset): Promise<void> {
	// Ensure the ./data directory exists
	if (!fs.existsSync(persistDir)) {
		fs.mkdirSync(persistDir);
	}

	let datasetId = dataset.id;

	const filePath = path.join(persistDir, `${datasetId}.json`);
	const jsonData = JSON.stringify(dataset);

	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, jsonData, "utf8", (error) => {
			if (error) {
				reject(new Error("Failed to save dataset to disk."));
			} else {
				resolve();
			}
		});
	});
}
