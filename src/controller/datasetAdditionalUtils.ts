import JSZip from "jszip";
import {Dataset, Room, Section} from "./Dataset";
import {mapSectionToClass} from "./datasetUtils";
import * as fs from "fs";
import * as path from "path";
import {InsightDatasetKind} from "./IInsightFacade";

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

export async function loadZipContent(content: string): Promise<JSZip> {
	const decodedBytes: Uint8Array = new Uint8Array(Buffer.from(content, "base64"));
	const zip = new JSZip();
	await zip.loadAsync(decodedBytes);
	return zip;
}

export async function extractValidSectionsFromZip(zip: JSZip): Promise<Section[]> {
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
