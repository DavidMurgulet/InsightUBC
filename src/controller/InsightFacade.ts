import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";

//	check if content string is base 64 ZIP
async function isBase64Zip(content: string): Promise<boolean> {
	//	decode the string
	const decodedBytes: Uint8Array = new Uint8Array(Buffer.from(content, "base64"));

	// check first 4 bytes against ZIP signature
	const isZIP = decodedBytes[0] === 0x50 &&
		decodedBytes[1] === 0x4B &&
		decodedBytes[2] === 0x03 &&
		decodedBytes[3] === 0x04;

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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	 public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		//	check if id is valid
		if (!id || id.includes("_") || id.trim() === "") {
			return Promise.reject(InsightError);
		}

		//	check if content is valid
		const isZIP = await isBase64Zip(content);
		if (!isZIP) {
			return Promise.reject(InsightError);
		}

		//	check if kind is valid
		if (kind === InsightDatasetKind.Rooms) {
			//	reject if Rooms
			return Promise.reject(InsightError);
		}

		//	load datasets from disk

		//	check if id already on disk

		//	add dataset to disk

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
