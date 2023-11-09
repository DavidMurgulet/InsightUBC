import * as parse5 from "parse5";
import {parse, TreeAdapterTypeMap} from "parse5";
import {Room} from "./Dataset";
import {getLatLong} from "./geoLocation";
import JSZip from "jszip";
import {Node, Element, Document} from "parse5/dist/tree-adapters/default";
import stringify = Mocha.utils.stringify;
import path from "path";

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

async function htmlParseRoom(
	href: string,
	code: string,
	name: string,
	address: string,
	lat: number,
	lon: number,
	zip: JSZip
): Promise<Room[]> {

	if (zip.hasOwnProperty(href)) {
		// File exists
		const roomFile = zip.file(href);
		if (roomFile) {
			const htmlContent = await roomFile.async("string");

			// Parse the HTML content to a DOM-like structure
			const document = parse(htmlContent);

			// Collect all table nodes from the document
			const tableElements: Element[] = findTablesInDocument(document);

			// Find the room table from the collected table nodes
			const roomsTable = findRoomTable(tableElements);

			if (!roomsTable) {
				throw new Error("No room table found");
			}

			// Extract data from the room table
			const tBody = roomsTable.childNodes.find((node) => node.nodeName === "tbody") as Element | undefined;
			if (!tBody) {
				throw new Error("No tbody found in the room table");
			}

			// Convert NodeList to Array to use map
			const roomRows = Array.from(tBody.childNodes).filter((node) => node.nodeName === "tr") as Element[];

			// Create an array of promises for each room row to process
			const roomPromises = roomRows.map((tableRow) => processTableRow(tableRow, code, name, address, lat, lon));

			// Use Promise.all to process all the rows in parallel
			const rooms = await Promise.all(roomPromises);

			// Filter out any null values if processTableRow can return null
			return rooms.filter((room) => room !== null) as Room[];
		}
		console.warn(`${href} room file not found in zip. Skipping.`);
		return [];

	} else {
		// File does not exist, handle the skipping
		console.log(`File not found: ${href}`);
		console.warn(`${href} room file not found in zip. Skipping.`);
		return []; // Return an empty array to indicate no rooms were found for this file
	}
}

async function processTableRow(
	row: Element,
	buildingCode: string,
	buildingName: string,
	buildingAddress: string,
	lat: number,
	lon: number
): Promise<Room | null> {
	// Extract the room number, capacity, furniture, type, and href from the row
	const roomNumber = getTextFromCell([row], "views-field-field-room-number", true);
	const capacity = parseInt(getTextFromCell([row], "views-field-field-room-capacity") || "0", 10);
	const furniture = getTextFromCell([row], "views-field-field-room-furniture");
	const roomType = getTextFromCell([row], "views-field-field-room-type");
	const roomHref = getHrefFromCell([row], "views-field-nothing");

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
		return Promise.reject("No table elements found in the building HTML content");
	}

	// Find the building table from the collected table nodes
	const buildingTable = findBuildingTable(tableElements);

	if (!buildingTable) {
		return Promise.reject("No valid building table found");
	}

	// Extract data from the building table
	const tbodyNode = buildingTable.childNodes.find((node) => node.nodeName === "tbody") as Element;

	if (!tbodyNode) {
		return Promise.reject("No tbody found in the building table");
	}

	const buildingRows: Element[] = tbodyNode.childNodes.filter((node) => node.nodeName === "tr") as Element[];

	// Map each row to a promise using processBuildingTableRow function
	const promises = buildingRows.map((row) => processBuildingTableRow(row, zip));

	// Use Promise.all to wait for all promises to resolve
	const roomsArrays = await Promise.all(promises);

	// Flatten the array of room arrays to a single array of rooms
	const rooms: Room[] = roomsArrays.flat();

	return rooms.length > 0 ? rooms : Promise.reject("No valid rooms found");
}

// Helper function to process each table row
async function processBuildingTableRow(row: Element, zip: JSZip): Promise<Room[]> {
	const cells = row.childNodes.filter((node) => node.nodeName === "td") as Element[];

	const code = getTextFromCell(cells, "views-field-field-building-code");
	const name = getTextFromCell(cells, "views-field-title", true);
	const address = getTextFromCell(cells, "views-field-field-building-address");
	const href = getHrefFromCell(cells, "views-field-nothing");

	if (!code || !name || !address || !href) {
		return Promise.reject("Building row not found in processBuildingTableRow");
	}

	try {
		const [lat, lon] = await getLatLong(address);
		const rooms = await htmlParseRoom(href, code, name, address, lat, lon, zip);
		return rooms;
	} catch (error) {
		console.error(error);
		return Promise.reject("Error in processBuildingTableRow: " + error);
	}
}

// Helper functions to extract text and href from a cell based on a class value
function getTextFromCell(cells: Element[], className: string, isLink: boolean = false): string | null {
	const cell = cells.find((c) => c.attrs.some((attr) => attr.name === "class" && attr.value.includes(className)));
	if (!cell) {
		return null;
	}

	if (isLink) {
		const link = cell.childNodes.find((node) => node.nodeName === "a") as Element;
		// If it's a link, the text node will be the first child of the <a> element
		const textNode = link?.childNodes.find((node) => node.nodeName === "#text");
		return textNode ? (textNode as any).value.trim() : null;
	} else {
		// If it's not a link, the text content will be in the first text node child
		const textNode = cell.childNodes.find((node) => node.nodeName === "#text");
		return textNode ? (textNode as any).value.trim() : null;
	}
}

function getHrefFromCell(cells: Element[], className: string): string | null {
	const cell = cells.find((c) => c.attrs.some((attr) => attr.name === "class" && attr.value.includes(className)));
	if (!cell) {
		return null;
	}

	const link = cell.childNodes.find((node) => node.nodeName === "a") as Element;
	const hrefAttr = link.attrs.find((attr) => attr.name === "href");
	return hrefAttr ? hrefAttr.value : null;
}
