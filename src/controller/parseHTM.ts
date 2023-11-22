import * as parse5 from "parse5";
import {parse} from "parse5";
import {Room} from "./Dataset";
import {getLatLong} from "./geoLocation";
import {
	processBuildingTableRow,
	getTextFromCell,
	getTextFromBuildingCell,
	getHrefFromCell,
	getHrefFromRoomCell,
} from "./parseHTMUtils";
import JSZip from "jszip";
import {Node, Element, Document} from "parse5/dist/tree-adapters/default";
import {response} from "express";

// Citation: Function(s) Structure Consulted with ChatGTP
const ROOMCLASSES: string[] = [
	"views-field views-field-field-room-number",
	"views-field views-field-field-room-capacity",
	"views-field views-field-field-room-furniture",
	"views-field views-field-field-room-type",
	"views-field views-field-nothing",
];

const BUILDINGCLASSES: string[] = [
	"views-field views-field-field-building-code",
	"views-field views-field-title",
	"views-field views-field-field-building-address",
	"views-field views-field-nothing",
];

// Function to recursively collect 'table' nodes
export function collectTableNodes(node: Node): Element[] {
	let tables: Element[] = [];

	// Helper function to traverse the nodes
	function traverseNodes(currentNode: Node) {
		// If the node is an 'Element' and its nodeName is 'table', add it to the tables array
		if (currentNode.nodeName === "table") {
			tables.push(currentNode as Element);
		}

		// If the node has child nodes, recursively traverse them
		if ("childNodes" in currentNode) {
			currentNode.childNodes.forEach(traverseNodes);
		}
	}

	// Start traversing from the root node
	traverseNodes(node);

	// Return the collected table elements
	return tables;
}

// Function to find 'table' nodes within the 'html' node
function findTablesInDocument(document: Document): Element[] {
	const htmlNode = document.childNodes.find((node) => "tagName" in node && node.tagName === "html");

	// If the 'html' node is found, start collecting 'table' nodes
	if (htmlNode) {
		return collectTableNodes(htmlNode);
	}

	return [];
}

// Function to find the building table based on certain criteria
function findTableFor(clasList: string[], tables: Element[]): Element | null {
	for (const table of tables) {
		const theadRow = (Array.from(table.childNodes) as unknown as Node[]).find(
			(node): node is Node => "nodeName" in node && node.nodeName === "thead"
		);

		if (!theadRow) {
			continue;
		}

		let headerTR: Node | undefined;

		if ("childNodes" in theadRow) {
			headerTR = (Array.from(theadRow.childNodes) as unknown as Node[]).find(
				(node): node is Node => "nodeName" in node && node.nodeName === "tr"
			);
		}

		if (!headerTR) {
			continue;
		}

		let classValues: string[] = [];
		if ("childNodes" in headerTR) {
			classValues = headerTR.childNodes
				.filter(
					(node: Node): node is Element =>
						node.nodeName === "th" && (node as Element).attrs.some((attr) => attr.name === "class")
				)
				.map((th: Element) => {
					const classAttr = th.attrs.find((attr) => attr.name === "class");
					return classAttr ? classAttr.value.trim() : "";
				});
		}

		const containsAllValues = clasList.every((value) => classValues.includes(value));

		if (containsAllValues) {
			return table;
		}
	}
	return null;
}
function findBuildingTable(tables: Element[]): Element | null {
	return findTableFor(BUILDINGCLASSES, tables);
}

function findRoomTable(tables: Element[]): Element | null {
	return findTableFor(ROOMCLASSES, tables);
}

export function htmlParseRoom(
	href: string,
	code: string,
	name: string,
	address: string,
	lat: number,
	lon: number,
	document: Document
): Room[] {
	try {
		const tableElements = findTablesInDocument(document);
		const roomsTable = findRoomTable(tableElements);
		if (!roomsTable) {
			//    console.warn(`${href} room table not found in path. Skipping.`);
			return [];
		}

		const tBody = roomsTable.childNodes.find((node) => node.nodeName === "tbody");
		if (!tBody) {
			return [];
			//	throw new Error("No tbody found in the room table");
		}

		if ("childNodes" in tBody) {
			const roomRows = Array.from(tBody.childNodes).filter((node) => node.nodeName === "tr") as Element[];

			const roomOrNull = roomRows.map(function (tableRow) {
				return processTableRow(tableRow, code, name, address, lat, lon);
			});

			//	filter out null values, then assert the type
			return roomOrNull.filter((room): room is Room => room !== null);
		}
		//	could not process row
		return [];
	} catch (error) {
		//    console.error(`Error processing ${href}:`, error);
		return [];
	}
}
function processTableRow(
	row: Element,
	buildingCode: string,
	buildingName: string,
	buildingAddress: string,
	lat: number,
	lon: number
): Room | null {
	// Extract the room number, capacity, furniture, type, and href from the row
	const roomNumber = getTextFromCell([row], "views-field-field-room-number", true);
	const capacity = parseInt(getTextFromCell([row], "views-field-field-room-capacity", false) || "0", 10);
	const furniture = getTextFromCell([row], "views-field-field-room-furniture", false);
	const roomType = getTextFromCell([row], "views-field-field-room-type", false);
	const roomHref = getTextFromCell([row], "views-field-nothing", true);

	// If all data is present, create and return a new Room object
	if (roomNumber && furniture && roomType && roomHref) {
		return new Room(
			buildingName,
			buildingCode,
			roomNumber,
			`${buildingCode}_${roomNumber}`,
			buildingAddress,
			lat,
			lon,
			capacity,
			roomType,
			furniture,
			roomHref
		);
	}

	// If any data is missing, return null
	return null;
}

export async function htmlParseBuilding(htmlContent: string, zip: JSZip): Promise<Room[]> {
	// Parse the HTML content to a DOM-like structure
	const document = parse5.parse(htmlContent);
	// Collect all table nodes from the document
	const tableElements: Element[] = findTablesInDocument(document);
	if (tableElements.length === 0) {
		return [];
	}
	// Find the building table from the collected table nodes
	const buildingTable = findBuildingTable(tableElements);

	if (!buildingTable) {
		return [];
	}
	// Extract data from the building table
	const tbodyNode = buildingTable.childNodes.find((node) => node.nodeName === "tbody") as Element;

	if (!tbodyNode) {
		return [];
	}
	const buildingRows: Element[] = tbodyNode.childNodes.filter((node) => node.nodeName === "tr") as Element[];

	let rooms: Room[] = [];
	const roomPromises = buildingRows.map(async (row) => {
		const cells = row.childNodes.filter((node) => node.nodeName === "td") as Element[];
		const code = getTextFromBuildingCell(cells, "views-field-field-building-code");
		const name = getTextFromBuildingCell(cells, "views-field-title", true);
		const address = getTextFromBuildingCell(cells, "views-field-field-building-address");
		const href = getHrefFromCell(cells, "views-field-nothing");

		if (href && code && name && address) {
			try {
				const [lat, lon] = await getLatLong(address);
				const path = href.substring(2);
				const roomFile = zip.file(path);
				if (!roomFile) {
					//    console.warn(`${href} room file not found in zip. Skipping.`);
					return [];
				}
				//    console.log(href + " found!");
				const htmlRoomContent = await roomFile.async("string");
				const documentRooms = parse(htmlRoomContent);
				return processBuildingTableRow(row, documentRooms, href, code, name, address, lat, lon);
			} catch (e) {
				return [];
			}
		} else {
			return [];
		}
	});

	rooms = (await Promise.all(roomPromises)).flat();
	return rooms;
}
