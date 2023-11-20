import {Dataset, Room, Section} from "./Dataset";
import fs from "fs";
import path from "path";
import {InsightDatasetKind} from "./IInsightFacade";

export const persistDir = "./data";
export async function loadDatasetsFromDirectory(directory: string): Promise<Dataset[]> {
	const datasets: Dataset[] = [];
	if (!fs.existsSync(directory)) {
		return Promise.reject(new Error(`Directory ${directory} does not exist.`));
	}

	try {
		const files = fs.readdirSync(directory);
		const jsonFiles = files.filter((file) => path.extname(file) === ".json");

		for (const file of jsonFiles) {
			try {
				const jsonData = fs.readFileSync(path.join(directory, file), "utf8");
				const datasetData = JSON.parse(jsonData);
				const datasetId = path.basename(file, ".json");

				// Check the kind of the dataset and create the appropriate Dataset object
				if (datasetData.kind === InsightDatasetKind.Sections) {
					datasets.push(...loadSections(datasetId, datasetData, directory, file, datasets));
				} else if (datasetData.kind === InsightDatasetKind.Rooms) {
					datasets.push(...loadRooms(datasetId, datasetData, directory, file, datasets));
				} else {
					console.error(`Unknown dataset kind for dataset ${datasetId}`);
				}
			} catch (error) {
				console.error(`Error processing file ${file}: ${error}`);
			}
		}
		return Promise.resolve(datasets);
	} catch (error) {
		console.error(`Error reading directory ${directory}: ${error}`);
		return Promise.reject(error);
	}
}

function loadSections(
	datasetId: string,
	datasetData: any,
	directory: string,
	file: string,
	datasets: Dataset[]
): Dataset[] {
	const sections = datasetData.data.map((sectionData: any) => {
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
	return datasets;
}

function loadRooms(
	datasetId: string,
	datasetData: any,
	directory: string,
	file: string,
	datasets: Dataset[]
): Dataset[] {
	const rooms = datasetData.data.map((roomData: any) => {
		return new Room(
			roomData.fullname,
			roomData.shortname,
			roomData.number,
			roomData.name,
			roomData.address,
			roomData.lat,
			roomData.lon,
			roomData.seats,
			roomData.type,
			roomData.furniture,
			roomData.href
		);
	});
	const dataset = new Dataset(datasetId, rooms.length, rooms, InsightDatasetKind.Rooms);
	datasets.push(dataset);
	return datasets;
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
