import JSZip from "jszip";
import {Dataset, Room, Section} from "./Dataset";
import {InsightDatasetKind} from "./IInsightFacade";
import {extractValidSectionsFromZip, loadZipContent} from "./datasetAdditionalUtils";
import {htmlParseBuilding} from "./parseHTM";
import {saveDatasetToDirectory} from "./directoryPersistance";

//	citation: Structure of JSZip decode from consultation with Chat GTP
export async function validateCourseDataset(
	content: string,
	id: string
): Promise<{success: boolean; dataset: Dataset | null}> {
	try {
		const zip = await loadZipContent(content);
		const validSections = await extractValidSectionsFromZip(zip);
		const dataset = await createDatasetFromSections(id, validSections);

		return Promise.resolve({success: !!dataset, dataset});
	} catch (error) {
		console.error("Error in validateCourseDataset:", error);
		return Promise.resolve({success: false, dataset: null});
	}
}
export async function validateRoomDataset(
	content: string,
	id: string
): Promise<{success: boolean; dataset: Dataset | null}> {
	try {
		const zip = await loadZipContent(content);
		const validRooms = await extractValidRoomsFromZip(zip);
		const dataset = await createDatasetFromRooms(id, validRooms);

		if (dataset?.numRows === 0 || dataset === null || validRooms.length === 0) {
			return Promise.resolve({success: false, dataset: null});
		}

		return Promise.resolve({success: !!dataset, dataset});
	} catch (error) {
		// console.log(error);
		console.error("Error in validateRoomDataset:", error);
		return Promise.resolve({success: false, dataset: null});
	}
}

//	Citation: Structure Consulted with ChatGTP

async function extractValidRoomsFromZip(zip: JSZip): Promise<Room[]> {
	const indexFile = zip.file("index.htm");
	//console.log(zip.files);
	if (!indexFile) {
		throw new Error("index.htm not found in zip");
	}
	try {
		const htmlContent = await indexFile.async("string");
		const arraysOfRooms = await Promise.all(await htmlParseBuilding(htmlContent, zip));
		return arraysOfRooms.flat();
	} catch (e) {
		return Promise.reject(e + " error in extractValidRoomsFromZip");
	}
}

async function createDatasetFromSections(id: string, sections: Section[]): Promise<Dataset | null> {
	if (sections.length > 0) {
		return new Dataset(id, sections.length, sections, InsightDatasetKind.Sections);
	}
	return null;
}

async function createDatasetFromRooms(id: string, rooms: Room[]): Promise<Dataset | null> {
	if (rooms.length === 0) {
		return null;
	} else {
		return new Dataset(id, rooms.length, rooms, InsightDatasetKind.Rooms);
	}
}

// mapSectionToClass function with error handling
export function mapSectionToClass(section: any): Section {
	try {
		let year: number;

		if (section.Section === "overall") {
			year = 1900;
		} else {
			year = parseInt(section.Year, 10);
		}
		return new Section(
			String(section.id),
			section.Course,
			section.Title,
			section.Professor,
			section.Subject,
			year,
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
