// Helper function to process each table row
import {Element, Node} from "parse5/dist/tree-adapters/default";
import JSZip from "jszip";
import {Room} from "./Dataset";
import {getLatLong} from "./geoLocation";
import {htmlParseRoom} from "./parseHTM";

export async function processBuildingTableRow(row: Element, zip: JSZip): Promise<Room[]> {
	const cells = row.childNodes.filter((node) => node.nodeName === "td") as Element[];

	const code = getTextFromBuildingCell(cells, "views-field-field-building-code");
	const name = getTextFromBuildingCell(cells, "views-field-title", true);
	const address = getTextFromBuildingCell(cells, "views-field-field-building-address");
	const href = getHrefFromCell(cells, "views-field-nothing");

	if (!code || !name || !address || !href) {
		return [];
	}

	try {
		const [lat, lon] = await getLatLong(address);
		console.log(`Latitude: ${lat}, Longitude: ${lon}`);
		const rooms = await htmlParseRoom(href, code, name, address, lat, lon, zip);
		return rooms;
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
		} else {
			console.error(`Unknown error occurred: ${error}`);
		}
		return [] as Room[];
	}
}

// Helper functions to extract text and href from a cell based on a class value
export function getTextFromCell(rows: Element[], className: string, isLink: boolean = false): string | null {
	// Function to recursively search for text within child nodes
	function findText(node: Node): string | null {
		if (node.nodeName === "#text") {
			return (node as any).value.trim();
		}

		if ("childNodes" in node) {
			for (const child of node.childNodes) {
				const text = findText(child);
				if (text) {
					return text;
				}
			}
		}

		return null;
	}

	// Iterate over each row
	for (const row of rows) {
		// Find all 'td' elements within the row
		const cells = row.childNodes.filter((node) => node.nodeName === "td") as Element[];

		// Find the cell with the matching class name
		const cell = cells.find((c) => c.attrs.some((attr) => attr.name === "class" && attr.value.includes(className)));
		if (cell) {
			// If it's a link, find the <a> element and search its children
			if (isLink) {
				const link = cell.childNodes.find((node) => node.nodeName === "a") as Element;
				const text = link ? findText(link) : null;
				if (text) {
					return text;
				}
			} else {
				// For non-link cells, search directly within the cell's children
				const text = findText(cell);
				if (text) {
					return text;
				}
			}
		}
	}

	return null;
}

export function getTextFromBuildingCell(cells: Element[], className: string, isLink: boolean = false): string | null {
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

export function getHrefFromCell(cells: Element[], className: string): string | null {
	const cell = cells.find((c) => c.attrs.some((attr) => attr.name === "class" && attr.value.includes(className)));
	if (!cell) {
		return null;
	}

	const link = cell.childNodes.find((node) => node.nodeName === "a") as Element;
	const hrefAttr = link.attrs.find((attr) => attr.name === "href");
	return hrefAttr ? hrefAttr.value : null;
}
