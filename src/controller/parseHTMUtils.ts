// Helper function to process each table row
import {Element, Node, Document} from "parse5/dist/tree-adapters/default";
import JSZip from "jszip";
import {Room} from "./Dataset";
import {getLatLong} from "./geoLocation";
import {htmlParseRoom} from "./parseHTM";

export function processBuildingTableRow(
	row: Element,
	document: Document,
	href: string,
	code: string,
	name: string,
	address: string,
	lat: number,
	lon: number
): Room[] {
	// Construct Room object (adjust according to your Room constructor)
	try {
		//    console.log(`Latitude: ${lat}, Longitude: ${lon}`);
		const rooms = htmlParseRoom(href, code, name, address, lat, lon, document);
		return rooms;
	} catch (error) {
		if (error instanceof Error) {
			//    console.error(`Error: ${error.message}`);
			return [];
		} else {
			//    console.error(`Unknown error occurred: ${error}`);
			return [];
		}
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

export function getHrefFromRoomCell(rows: Element[], className: string): string | null {
	for (const row of rows) {
		// Filter to get only 'td' elements from each 'tr' row
		const tdCells = row.childNodes.filter((node) => node.nodeName === "td") as Element[];

		// Find the 'td' cell that has the specified class
		const cell = tdCells.find((c) =>
			c.attrs.some((attr) => attr.name === "class" && attr.value.includes(className))
		);

		if (cell) {
			// Find the 'a' element within the cell
			const link = cell.childNodes.find((node) => node.nodeName === "a") as Element;
			if (link) {
				// Get the 'href' attribute of the 'a' element
				const hrefAttr = link.attrs.find((attr) => attr.name === "href");
				return hrefAttr ? hrefAttr.value : null;
			}
		}
	}

	return null;
}
