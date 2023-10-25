import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import {Dataset, Section} from "../../src/controller/Dataset";
import InsightFacade from "../../src/controller/InsightFacade";
import {isBase64Zip, loadDatasetsFromDirectory, validateDataset} from "../../src/controller/datasetUtils";
import {assert, expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {Query} from "../../src/controller/Query";
import {checkParsing, parseOpts, parseWhere} from "../../src/controller/Parse";

import {Collector} from "../../src/controller/Collector";
import {folderTest} from "@ubccpsc310/folder-test";

use(chaiAsPromised);

describe("PQ Crash Tests", function () {
	let facade: InsightFacade;
	let qBasic = {
		WHERE: {
			GT: {
				ubc_avg: 97,
			},
		},
		OPTIONS: {
			COLUMNS: ["ubc_dept", "ubc_avg"],
			ORDER: "ubc_avg",
		},
	};

	beforeEach(async function () {
		clearDisk();
		facade = new InsightFacade();

		let pair = getContentFromArchives("pair.zip");
		await facade.addDataset("ubc", pair, InsightDatasetKind.Sections);
	});

	it("should not query after crash", async function () {
		let list = await facade.listDatasets();
		console.log("before: " + JSON.stringify(list, null, 2));

		await facade.removeDataset("ubc");
		//	simulate crash
		facade = new InsightFacade();

		let list1 = await facade.listDatasets();
		console.log("after: " + JSON.stringify(list1, null, 2));

		let result = facade.performQuery(qBasic);
		expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should query after crash", async function () {
		let list = await facade.listDatasets();
		console.log("before: " + JSON.stringify(list, null, 2));

		//	simulate crash
		facade = new InsightFacade();

		let list1 = await facade.listDatasets();
		console.log("after: " + JSON.stringify(list1, null, 2));

		let result = await facade.performQuery(qBasic);

		expect(result).to.be.length(49);
		console.log(result);
	});
});

describe("Helper Unit Tests", function () {
	describe("isBase64Zip", function () {
		it("should return True when a base 64 string from a Zip File is passed in", function () {
			let sections: string = getContentFromArchives("basic.zip");
			const result = isBase64Zip(sections);
			return expect(result).to.eventually.be.true;
		});

		it("should return False when a .txt string is passed in", function () {
			let textFile: string = getContentFromArchives("text.txt");
			const result = isBase64Zip(textFile);
			return expect(result).to.eventually.be.false;
		});

		it("should return False when Zip file with wrong signature is passed in (50 4B *02* 04)", function () {
			let wrongZipSignature: string = getContentFromArchives("basicWrongZipSignature.zip");
			const result = isBase64Zip(wrongZipSignature);
			return expect(result).to.eventually.be.false;
		});

		it("should return False when a corrupted Zip file is passed in", function () {
			let corruptedZip: string = getContentFromArchives("basicCorrupted.zip");
			const result = isBase64Zip(corruptedZip);
			return expect(result).to.eventually.be.false;
		});
	});

	//	given a valid Zip, it checks if the dataset is valid
	describe("validateDataset", function () {
		it("should return True when a valid is passed in", async function () {
			let sections: string = getContentFromArchives("basic.zip");
			const result = await validateDataset(sections, "test");
			return expect(result.success).to.be.true;
		});

		it("should return True when a valid dataset is passed in - 1 invalid section, rest valid", async function () {
			let sections: string = getContentFromArchives("validOneSectionNoAVG.zip");
			const result = await validateDataset(sections, "test");
			return expect(result.success).to.be.true;
		});

		it("should return False when a valid is passed in - no valid sections", async function () {
			let sections: string = getContentFromArchives("noAVG.zip");
			const result = await validateDataset(sections, "test");
			return expect(result.success).to.be.false;
		});
	});

	//	loads the datasets from '/data'
	describe("loadDatasetsFromDirectory", function () {
		// it("should return dataset object from disk", async function () {
		// 	let listOfDatasets = await loadDatasetsFromDirectory("./data");
		//
		// 	// Check if listOfDatasets is an array
		// 	expect(listOfDatasets).to.be.an("array");
		//
		// 	// Check if each element in the array is an instance of Dataset
		// 	listOfDatasets.forEach((dataset: Dataset) => {
		// 		expect(dataset).to.be.an.instanceOf(Dataset);
		// 	});
		// });
	});
});

describe("InsightFacade", function () {
	describe("addDataset", function () {
		let sections: string;
		let sectionsInvalid: string;
		let pair: string;
		let facade: InsightFacade;
		let noaudit: string;
		let noavg: string;
		let nopass: string;
		let nofail: string;
		let noid: string;
		let noinst: string;
		let nodept: string;
		let notitle: string;
		let noyear: string;
		let nouuid: string;

		before(function () {
			sections = getContentFromArchives("basic.zip");
			sectionsInvalid = getContentFromArchives("invalid.zip");
			pair = getContentFromArchives("pair.zip");

			// invalid sections
			noaudit = getContentFromArchives("noAUDIT.zip");
			noavg = getContentFromArchives("noAVG.zip");
			nodept = getContentFromArchives("noDEPT.zip");
			nofail = getContentFromArchives("noFAIL.zip");
			noid = getContentFromArchives("noID.zip");
			noinst = getContentFromArchives("noINSTRUCTOR.zip");
			nopass = getContentFromArchives("noPASS.zip");
			notitle = getContentFromArchives("noTITLE.zip");
			nouuid = getContentFromArchives("noUUID.zip");
			noyear = getContentFromArchives("noYEAR.zip");
		});

		beforeEach(async function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should successfully add a dataset (first)", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should successfully add a dataset (second)", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should successfully access dataset after crash", async function () {
			await facade.addDataset("basic", sections, InsightDatasetKind.Sections);
			// new instance made
			facade = new InsightFacade();

			const result = await facade.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "basic",
					kind: InsightDatasetKind.Sections,
					numRows: 119,
				},
			]);
		});

		it("should still be able to remove dataset after crash", async function () {
			await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
			// new instance made
			facade = new InsightFacade();

			await facade.removeDataset("pair");
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});

		it("should not be able to remove dataset after removal + crash", async function () {
			await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
			await facade.removeDataset("pair");
			// new instance made

			facade = new InsightFacade();

			const result = facade.removeDataset("pair");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should be able to add dataset after removal + crash", async function () {
			this.timeout(5000);
			await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
			await facade.removeDataset("pair");
			// new instance made

			facade = new InsightFacade();

			const result = await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
			expect(result).to.deep.equal(["pair"]);
		});

		it("should successfully add 2 datasets", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = facade.addDataset("pair", pair, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc", "pair"]);
		});

		it("should reject with an empty dataset id", function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a whitespace id", function () {
			const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a invalid rooms kind", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// INVALID SECTION TESTS
		it("should reject with an invalid dataset (no valid sections)", function () {
			const result = facade.addDataset("ubc", sectionsInvalid, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing avg)", function () {
			const result = facade.addDataset("test", noavg, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing pass)", function () {
			const result = facade.addDataset("test", nopass, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing fail)", function () {
			const result = facade.addDataset("test", nofail, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing audit)", function () {
			const result = facade.addDataset("test", noaudit, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing year)", function () {
			const result = facade.addDataset("test", noyear, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing dept)", function () {
			const result = facade.addDataset("test", nodept, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing id)", function () {
			const result = facade.addDataset("test", noid, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing instructor)", function () {
			const result = facade.addDataset("test", noinst, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing title)", function () {
			const result = facade.addDataset("ubc", notitle, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an invalid section (missing uuid)", function () {
			const result = facade.addDataset("test", nouuid, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("removeDataset", function () {
		let sections: string;
		// let sectionsInvalid: string;
		let facade: InsightFacade;
		let data: Dataset;
		let basic: string;
		sections = getContentFromArchives("cs110.zip");
		basic = getContentFromArchives("basic.zip");
		before(async function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should successfully remove dataset", async function () {
			// added await here
			await facade.addDataset("basic", basic, InsightDatasetKind.Sections);
			const result = await facade.removeDataset("basic");
			expect(result).to.deep.equal("basic");
		});

		it("should reject with nonexistent id (already removed)", function () {
			const result = facade.removeDataset("basic");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should reject with nonexistent id (not found)", function () {
			const result = facade.removeDataset("ubc1");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should reject with invalid id (whitespace)", function () {
			const result = facade.removeDataset("");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with invalid id (underscore)", function () {
			const result = facade.removeDataset("u_bc");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("listDatasets", function () {
		let set1: string;
		let set2: string;
		let facade: InsightFacade;

		before(async function () {
			set1 = getContentFromArchives("cs110.zip");
			set2 = getContentFromArchives("cs121.zip");
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list 0 dataset", async function () {
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});

		it("should reject with nonexistent id (already removed)", async function () {
			await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
			await facade.removeDataset("cs121");
			const result = facade.removeDataset("cs121");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should reject with nonexistent id (not found)", function () {
			const result = facade.removeDataset("1823");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should list 2 dataset", async function () {
			await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
			await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
			const result = await facade.listDatasets();

			expect(result.length).to.equal(2);
		});

		it("should list 1 dataset (after removal)", async function () {
			await facade.removeDataset("cs121");
			const result = await facade.listDatasets();

			expect(result).to.deep.equal([
				{
					id: "cs110",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
			]);
		});

		it("should list 0 dataset (after removal)", async function () {
			await facade.removeDataset("cs110");
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});

		it("should list 2 dataset (both in same test)", async function () {
			await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
			await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);

			const result = await facade.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "cs110",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
				{
					id: "cs121",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
			]);
		});

		it("should list 0 dataset (both del in same test)", async function () {
			await facade.removeDataset("cs110");
			await facade.removeDataset("cs121");

			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	// describe("PerformQuery", () => {
	// 	let facade = InsightFacade;
	// 	let alt = string;
	// 	let sections = string;
	// 	before(async function () {
	// 		console.info(`Before: ${this.test?.parent?.title}`);
	//
	// 		facade = new InsightFacade();
	//
	//
	// 		// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
	// 		// Will *fail* if there is a problem reading ANY dataset.
	// 		const loadDatasetPromises = [
	// 			facade.addDataset("sections", sections, InsightDatasetKind.Sections),
	// 		];
	//
	// 		return Promise.all(loadDatasetPromises);
	// 	});
	//
	// 	it("should list 0 dataset", async function () {
	// 		const result = await facade.listDatasets();
	// 		expect(result).to.deep.equal([]);
	// 	});
	//
	// 	it("should list 1 dataset", async function () {
	// 		await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
	// 		const result = await facade.listDatasets();
	//
	// 		expect(result).to.deep.equal([{
	// 			id: "cs110",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 1
	// 		}]);
	// 	});
	//
	// 	it("should list 2 dataset", async function () {
	// 		await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
	// 		const result = await facade.listDatasets();
	//
	// 		expect(result).to.deep.equal([{
	// 			id: "cs110",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 1
	// 		}, {
	// 			id: "cs121",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 1
	// 		}]);
	// 	});
	//
	// 	it("should list 1 dataset (after removal)", async function () {
	// 		await facade.removeDataset("cs121");
	// 		const result = await facade.listDatasets();
	//
	// 		expect(result).to.deep.equal([{
	// 			id: "cs110",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 1
	// 		}]);
	// 	});
	//
	// 	it("should list 0 dataset (after removal)", async function () {
	// 		await facade.removeDataset("cs110");
	// 		const result = await facade.listDatasets();
	// 		expect(result).to.deep.equal([]);
	// 	});
	//
	//
	// 	it("should list 2 dataset (both in same test)", async function () {
	// 		await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
	// 		await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
	//
	// 		const result = await facade.listDatasets();
	// 		expect(result).to.deep.equal([{
	// 			id: "cs110",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 1
	// 		}, {
	// 			id: "cs121",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 1
	// 		}]);
	// 	});
	//
	// 	it("should list 0 dataset (both del in same test)", async function () {
	// 		await facade.removeDataset("cs110");
	// 		await facade.removeDataset("cs121");
	//
	// 		const result = await facade.listDatasets();
	// 		expect(result).to.deep.equal([]);
	// 	});
	// });
	//
	//
	// /*
	//  * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	//  * You should not need to modify it; instead, add additional files to the queries directory.
	//  * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	//  */
	// // describe("PerformQuery", () => {
	// // 	let facade = InsightFacade;
	// // 	let alt = string;
	// // 	let sections = string;
	// // 	before(function () {
	// // 		console.info(`Before: ${this.test?.parent?.title}`);
	// //
	// // 		facade = new InsightFacade();
	// //
	// // 		// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
	// // 		// Will *fail* if there is a problem reading ANY dataset.
	// // 		const loadDatasetPromises = [
	// // 			facade.addDataset("sections", sections, InsightDatasetKind.Sections),
	// // 		];
	// //
	// // 		return Promise.all(loadDatasetPromises);
	// // 	});
	// //
	// // 	after(function () {
	// // 		console.info(`After: ${this.test?.parent?.title}`);
	// // 		clearDisk();
	// // 	});
	// //
	// //
	// // 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
	// // 		"Dynamic InsightFacade PerformQuery tests",
	// // 		(input) => facade.performQuery(input),
	// // 		"./test/resources/queries",
	// // 		{
	// // 			assertOnResult: (actual, expected) => {
	// // 				// TODO add an assertion!
	// // 			},
	// // 			errorValidator: (error): error is PQErrorKind =>
	// // 				error === "ResultTooLargeError" || error === "InsightError",
	// // 			assertOnError: (actual, expected) => {
	// // 				// TODO add an assertion!
	// // 			},
	// // 		}
	// // 	);
	// // });
	//
	//
	describe("parseWhere", function () {
		let root: Query;
		let qBasicWhere: object;
		let qComplexWhere: object;
		let facade: InsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			qBasicWhere = {
				WHERE: {
					GT: [
						{
							sections_avg: 97,
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};

			qComplexWhere = {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										ubc_year: 2015,
									},
								},
								{
									IS: {
										ubc_dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								ubc_avg: 95,
							},
						},
					],
				},
			};
		});

		it("should properly parse query WHERE (basic)", function () {
			for (const k in qBasicWhere) {
				if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
					let subQuery: object = (qBasicWhere as any)[k];
					if (k === "WHERE") {
						const where = parseWhere(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});

		it("should properly parse query WHERE (complex)", function () {
			// const where!: QueryNode;
			for (const k in qComplexWhere) {
				if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
					let subQuery: object = (qComplexWhere as any)[k];
					if (k === "WHERE") {
						const where = parseWhere(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});
	});

	describe("parseOpts", function () {
		let root: Query;
		let optsBasic = {
			OPTIONS: {
				COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
				ORDER: ["sections_avg"],
			},
		};
		let optsNoOrder = {
			OPTIONS: {
				COLUMNS: ["sections_avg"],
			},
		};
		let opts1Col = {
			OPTIONS: {
				COLUMNS: ["sections_uuid"],
				ORDER: "sections_avg",
			},
		};
		let facade: InsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should parse options", function () {
			for (const k in optsBasic) {
				if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
					let subQuery: object = (optsBasic as any)[k];
					if (k === "OPTIONS") {
						const where = parseOpts(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});

		it("should parse options 1 col", function () {
			// const where!: QueryNode;
			for (const k in opts1Col) {
				if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
					let subQuery: object = (opts1Col as any)[k];
					if (k === "OPTIONS") {
						const where = parseOpts(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});

		it("should parse options (no order)", function () {
			// const where!: QueryNode;
			for (const k in optsNoOrder) {
				if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
					let subQuery: object = (optsNoOrder as any)[k];
					if (k === "OPTIONS") {
						const where = parseOpts(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});
	});

	describe("parseOpts", function () {
		let root: Query;
		let optsBasic = {
			OPTIONS: {
				COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
				ORDER: "sections_avg",
			},
		};
		let optsNoOrder = {
			OPTIONS: {
				COLUMNS: ["sections_avg"],
			},
		};
		let opts1Col = {
			OPTIONS: {
				COLUMNS: ["sections_uuid"],
				ORDER: "sections_avg",
			},
		};
		let facade: InsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should parse options", function () {
			// const where!: QueryNode;
			for (const k in optsBasic) {
				if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
					let subQuery: object = (optsBasic as any)[k];
					if (k === "OPTIONS") {
						const where = parseOpts(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});

		it("should parse options 1 col", function () {
			// const where!: QueryNode;
			for (const k in opts1Col) {
				if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
					let subQuery: object = (opts1Col as any)[k];
					if (k === "OPTIONS") {
						const where = parseOpts(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});

		it("should parse options (no order)", function () {
			// const where!: QueryNode;
			for (const k in optsNoOrder) {
				if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
					let subQuery: object = (optsNoOrder as any)[k];
					if (k === "OPTIONS") {
						const where = parseOpts(subQuery, k);
						checkParsing(where, 0);
					}
				}
			}
		});
	});

	// describe("performQuery", function () {
	// 	let facade: InsightFacade;
	// 	let qBasic = {
	// 		WHERE: {
	// 			GT: {
	// 				test_avg: 50,
	// 			},
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["test_dept", "test_avg"],
	// 			ORDER: "test_dept",
	// 		},
	// 	};
	// 	let qComplex = {
	// 		WHERE: {
	// 			OR: [
	// 				{
	// 					AND: [
	// 						{
	// 							EQ: {
	// 								test_audit: 0,
	// 							},
	// 						},
	// 						{
	// 							IS: {
	// 								test_instructor: "*drew",
	// 							},
	// 						},
	// 					],
	// 				},
	// 				{
	// 					IS: {
	// 						test_title: "biology",
	// 					},
	// 				},
	// 			],
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["test_dept", "test_title", "test_avg", "test_pass"],
	// 			ORDER: "test_avg",
	// 		},
	// 	};
	// 	let qBasicNoComparator= {
	// 		WHERE: {
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["test_dept", "test_avg"],
	// 			ORDER: "test_dept",
	// 		},
	// 	};
	// 	let qBasicInvKey: object;
	// 	let sec1;
	// 	let sec2;
	// 	let sec3;
	// 	let sec4;
	// 	let sec5;
	// 	let sections: Section[];
	// 	let dataset: Dataset;
	//
	// 	before(function () {
	// 		clearDisk();
	// 		facade = new InsightFacade();
	// 		qBasicInvKey = {
	// 			WHERE: {
	// 				GT: {
	// 					sections_avg: "string",
	// 				},
	// 			},
	// 		};
	// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
	// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2021, 85, 49, 1, 0);
	// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2020, 60, 25, 25, 0);
	// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
	// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
	// 		sections = [sec1, sec2, sec3, sec4, sec5];
	// 		dataset = new Dataset("test", InsightDatasetKind.Sections, sections, 4);
	// 		facade.aDataset(dataset);
	// 	});
	//
	// 	it("should execQuery (basic)", function () {
	// 		const where = qBasic.WHERE;
	// 		const parsedwhere = parseWhere(where, "WHERE");
	// 		const options = qBasic.OPTIONS;
	// 		const parsedopts = parseOpts(options, "OPTIONS");
	// 		const query = new Query(parsedwhere, parsedopts);
	// 		const collector = new Collector([dataset]);
	// 		const result = collector.execQuery(query);
	// 		console.log(result);
	// 	});
	//
	// 	it("should execQuery (complex)", function () {
	// 		const where = qComplex.WHERE;
	// 		const parsedwhere = parseWhere(where, "WHERE");
	// 		const options = qComplex.OPTIONS;
	// 		const parsedopts = parseOpts(options, "OPTIONS");
	// 		const query = new Query(parsedwhere, parsedopts);
	// 		const collector = new Collector([dataset]);
	// 		const result = collector.execQuery(query);
	// 		console.log(result);
	// 	});
	//
	// 	it("should execQuery (NO COMPARATOR)", function () {
	// 		const where = qBasicNoComparator.WHERE;
	// 		const parsedwhere = parseWhere(where, "WHERE");
	// 		const options = qBasicNoComparator.OPTIONS;
	// 		const parsedopts = parseOpts(options, "OPTIONS");
	// 		const query = new Query(parsedwhere, parsedopts);
	// 		const collector = new Collector([dataset]);
	// 		const result = collector.execQuery(query);
	// 		console.log(result);
	// 	});
	// });

	// describe("validationTests", function () {
	// 	let optsEmptyCol = {
	// 		OPTIONS: {
	// 			COLUMNS: [],
	// 			ORDER: "ubc_avg",
	// 		},
	// 	};
	// 	let optsValid = {
	// 		OPTIONS: {
	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
	// 			ORDER: "ubc_avg",
	// 		},
	// 	};
	// 	let optsOrderFirst = {
	// 		OPTIONS: {
	// 			ORDER: "ubc_avg",
	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
	// 		},
	// 	};
	// 	let optsOrderNotInCol = {
	// 		OPTIONS: {
	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
	// 			ORDER: "ubc_pass",
	// 		},
	// 	};
	// 	let optsInvKeyOrd = {
	// 		OPTIONS: {
	// 			ORDER: "ubc_aaaa",
	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
	// 		},
	// 	};
	// 	let optsInvKeyCol = {
	// 		OPTIONS: {
	// 			COLUMNS: ["ubc_dept", "ubc_idddd", "ubc_avg"],
	// 			ORDER: "ubc_avg",
	// 		},
	// 	};
	// 	let optsNoOrder = {
	// 		OPTIONS: {
	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
	// 		},
	// 	};
	//
	// 	let where2Key = {
	// 		WHERE: {
	// 			GT: {
	// 				sections_avg: 97,
	// 			},
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_dept", "sections_avg"],
	// 			ORDER: "sections_avg",
	// 		},
	// 	};
	// 	let validator: Validator;
	// 	let facade: InsightFacade;
	//
	// 	before(function () {
	// 		clearDisk();
	// 		facade = new InsightFacade();
	// 		validator = new Validator([]);
	// 	});
	//
	// 	it("should validate OPTS", function () {
	// 		const opt = Object.keys(optsValid)[0];
	// 		const sub = optsValid.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(0);
	// 	});
	//
	// 	it("should validate where2key, with the first removed", function () {
	// 		const where = Object.keys(where2Key)[0];
	// 		const sub = where2Key.WHERE;
	// 		const node = parseWhere(sub, where);
	// 		const result = validator.validWhere(node);
	// 		expect(result).to.equal(0);
	// 	});
	//
	// 	it("should validate OPTS, (ORDER FIRST)", function () {
	// 		const opt = Object.keys(optsOrderFirst)[0];
	// 		const sub = optsOrderFirst.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(0);
	// 	});
	//
	// 	it("should validate OPTS, (ORDER NOT MATCHING COl)", function () {
	// 		const opt = Object.keys(optsOrderNotInCol)[0];
	// 		const sub = optsOrderNotInCol.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(1);
	// 	});
	//
	// 	it("should not validate OPTS (empty COLUMNS)", function () {
	// 		const opt = Object.keys(optsEmptyCol)[0];
	// 		const sub = optsEmptyCol.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(1);
	// 	});
	//
	// 	it("should not validate OPTS (invalid key in COLUMNS )", function () {
	// 		const opt = Object.keys(optsInvKeyCol)[0];
	// 		const sub = optsInvKeyOrd.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(1);
	// 	});
	//
	// 	it("should not validate OPTS (invalid key in ORDER)", function () {
	// 		const opt = Object.keys(optsInvKeyOrd)[0];
	// 		const sub = optsInvKeyOrd.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(1);
	// 	});
	//
	// 	it("should validate, (no ORDER)", function () {
	// 		const opt = Object.keys(optsNoOrder)[0];
	// 		const sub = optsNoOrder.OPTIONS;
	// 		const node = parseOpts(sub, opt);
	// 		const result = validator.validateOptions(node);
	// 		expect(result).to.equal(0);
	// 	});
	// });

	describe("execWhere", function () {
		let queryGT30 = {
			WHERE: {
				GT: {
					test_avg: 30,
				},
			},
		};
		let queryAND = {
			WHERE: {
				AND: [
					{
						EQ: {
							test_year: 2015,
						},
					},
					{
						GT: {
							test_avg: 45,
						},
					},
				],
			},
		};
		let queryCOMPLEX = {
			WHERE: {
				OR: [
					{
						AND: [
							{
								EQ: {
									test_year: 2020,
								},
							},
							{
								LT: {
									test_fail: 20,
								},
							},
						],
					},
					{
						IS: {
							test_id: "300",
						},
					},
				],
			},
		};
		let queryOR = {
			WHERE: {
				OR: [
					{
						GT: {
							test_fail: 19,
						},
					},
					{
						EQ: {
							test_dept: "biol",
						},
					},
				],
			},
		};
		let facade: InsightFacade;
		let dataset: Dataset;
		let sections: Section[];
		let sec1: Section;
		let sec2: Section;
		let sec3: Section;
		let sec4: Section;
		let sec5: Section;
		let collector: Collector;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
			sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
			sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
			sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
			sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
			sections = [sec1, sec2, sec3, sec4, sec5];
			dataset = new Dataset("test", 5, sections, InsightDatasetKind.Sections);
			collector = new Collector([dataset]);
			facade.aDataset(dataset);
		});

		it("executing WHERE branch (GT avg: 30)", function () {
			const subWhere = queryGT30.WHERE;
			const parsed = parseWhere(subWhere, "WHERE");
			const parsedWhere = parsed.getChilds()[0];

			const result: any[] = collector.execWhere(parsedWhere);
			expect(result).to.includes(sec1);
			expect(result).to.includes(sec2);
			expect(result).to.includes(sec3);
			expect(result).to.includes(sec4);
			expect(result).to.not.includes(sec5);
			console.log(result);
		});

		it("executing WHERE branch (avg > 59 AND fail < 5", function () {
			const subWhere = queryAND.WHERE;
			const parsed = parseWhere(subWhere, "WHERE");
			const parsedWhere = parsed.getChilds()[0];

			const result: any[] = collector.execWhere(parsedWhere);
			expect(result).to.includes(sec3);
			expect(result).to.includes(sec2);
			expect(result).to.not.includes(sec1);
			expect(result).to.not.includes(sec4);
			expect(result).to.not.includes(sec5);
		});

		it("executing WHERE branch (fail > 19 OR dept = biol)", function () {
			const subWhere = queryOR.WHERE;
			const parsed = parseWhere(subWhere, "WHERE");
			const parsedWhere = parsed.getChilds()[0];

			const result: any[] = collector.execWhere(parsedWhere);
			expect(result).to.includes(sec3);
			expect(result).to.includes(sec4);
			expect(result).to.includes(sec5);
			expect(result).to.not.includes(sec1);
			expect(result).to.not.includes(sec2);
		});

		it("executing WHERE branch (COMPLEX)", function () {
			const subWhere = queryCOMPLEX.WHERE;
			const parsed = parseWhere(subWhere, "WHERE");
			const parsedWhere = parsed.getChilds()[0];

			const result: any[] = collector.execWhere(parsedWhere);
			console.log(result);
			expect(result).to.includes(sec1);
			expect(result).to.includes(sec5);
			expect(result).to.not.includes(sec2);
			expect(result).to.not.includes(sec3);
			expect(result).to.not.includes(sec4);
		});
	});

	describe("performQueryFINAL", function () {
		let facade: InsightFacade;
		let qBasic = {
			WHERE: {
				GT: {
					ubc_avg: 97,
				},
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let qComplex = {
			WHERE: {
				OR: [
					{
						AND: [
							{
								GT: {
									ubc_avg: 90,
								},
							},
							{
								IS: {
									ubc_dept: "adhe",
								},
							},
						],
					},
					{
						EQ: {
							ubc_avg: 95,
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let qBasicNoComparator = {
			WHERE: {},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let wc = {
			WHERE: {
				IS: {
					ubc_dept: "*asc*",
				},
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let allComp = {
			WHERE: {
				OR: [
					{
						AND: [
							{
								GT: {
									ubc_avg: 50,
								},
							},
							{
								LT: {
									ubc_avg: 90,
								},
							},
							{
								EQ: {
									ubc_avg: 85,
								},
							},
							{
								IS: {
									ubc_dept: "*c",
								},
							},
						],
					},
					{
						NOT: {
							GT: {
								ubc_avg: 1,
							},
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let yr1900 = {
			WHERE: {
				EQ: {
					ubc_year: 1900,
				},
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let noWHERE = {
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let noCOL: {
			WHERE: {
				GT: {
					ubc_avg: 97;
				};
			};
			OPTIONS: {
				ORDER: "ubc_avg";
			};
		};
		let stackedNotsOr = {
			WHERE: {
				NOT: {
					OR: [
						{
							NOT: {
								LT: {
									ubc_avg: 60,
								},
							},
						},
						{
							NOT: {
								IS: {
									ubc_dept: "biol",
								},
							},
						},
					],
				},
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
			},
		};
		let lotsofnots = {
			WHERE: {
				NOT: {
					OR: [
						{
							NOT: {
								EQ: {
									ubc_avg: 95,
								},
							},
						},
						{
							NOT: {
								IS: {
									ubc_dept: "b*",
								},
							},
						},
					],
				},
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
			},
		};
		let invalid2Diffkeys = {
			WHERE: {
				GT: {
					sections_avg: 97,
					sections_fail: 99,
				},
			},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg"],
				ORDER: "sections_avg",
			},
		};
		let valid2Order = {
			WHERE: {
				GT: {
					ubc_avg: 97,
				},
			},
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let invalid2Keys = {
			WHERE: {
				AND: [
					{
						IS: {
							sections_dept: "c*",
						},
						GT: {
							sections_avg: 97,
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg"],
				ORDER: "sections_avg",
			},
		};
		let pair: string;

		beforeEach(async function () {
			clearDisk();
			facade = new InsightFacade();

			pair = getContentFromArchives("pair.zip");
			await facade.addDataset("ubc", pair, InsightDatasetKind.Sections);
		});

		it("should execQuery (basic)", function () {
			const result = facade.performQuery(qBasic);
			expect(result).to.eventually.be.length(48);
		});

		it("should execQuery (complex)", function () {
			const result = facade.performQuery(qComplex);
			expect(result).to.eventually.be.length(50);
		});

		it("should execQuery (NO COMPARATOR)", function () {
			const result = facade.performQuery(qBasicNoComparator);
			expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
		});

		it("should execQuery (wildcard contains)", function () {
			const result = facade.performQuery(wc);
			// expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
		});

		it("should fail with too large", function () {
			const result = facade.performQuery(yr1900);
			expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
		});

		it("should fail missing where", function () {
			const result = facade.performQuery(noWHERE);
			expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should fail missing col", function () {
			const result = facade.performQuery(noCOL);
			expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should return w size 8", function () {
			const result = facade.performQuery(stackedNotsOr);
			expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should return correctly", function () {
			const result = facade.performQuery(lotsofnots);
			expect(result).to.eventually.be.length(2);
		});

		it("should return correctly", function () {
			const result = facade.performQuery(valid2Order);
			expect(result).to.eventually.be.length(2);
		});

		it("should return correctly", function () {
			const result = facade.performQuery(valid2Order);
			expect(result).to.eventually.be.length(2);
		});
	});

	describe("performQueryORDER", function () {
		let sections: string;
		let alt: string;
		let facade: InsightFacade;

		before(async function () {
			clearDisk();
			sections = getContentFromArchives("pair.zip");
			alt = getContentFromArchives("basic.zip");
			facade = new InsightFacade();

			await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		});

		// beforeEach(async function () {
		// 	clearDisk();
		// 	facade = new InsightFacade();
		//
		// 	await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
		// 	await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		// });

		function errorValidator(error: any): error is Error {
			return error === "InsightError" || error === "ResultTooLargeError";
		}

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests Ordered",
			async (input) => await facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: async (actual, expected) => {
					assert.deepEqual(actual, expected);
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "InsightError") {
						assert.instanceOf(actual, InsightError);
					} else {
						assert.instanceOf(actual, ResultTooLargeError);
					}
				},
			}
		);
	});
});

describe("Test Suite", function () {
	describe("addDataset Tests", function () {
		let sections: string;
		let facade: InsightFacade;

		before(function () {
			sections = getContentFromArchives("pair.zip");
		});

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should pass with valid arguments", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);
		});

		it("should reject with null id", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset(null as any, sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with undefined id", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset(undefined as any, sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with non-string id", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset(999 as any, sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with an empty dataset id", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with whitespace in dataset id", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset("a ", sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with underscore dataset id", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset("a_", sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should successfully add two datasets with different ids", async function () {
			await facade.addDataset("ubc1", sections, InsightDatasetKind.Sections);
			const result = await facade.addDataset("ubc2", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc1", "ubc2"]);
		});

		it("should reject when adding a dataset with a duplicate id", async function () {
			let errorWasThrown = false;
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with non-zip base 64 string", async function () {
			let errorWasThrown = false;
			let textFile: string = getContentFromArchives("test.txt");
			try {
				await facade.addDataset("ubc", textFile, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with no valid sections in dataset", async function () {
			let errorWasThrown = false;
			let invalidDataset: string = getContentFromArchives("invalidDataset.zip");
			try {
				await facade.addDataset("ubc", invalidDataset, InsightDatasetKind.Sections);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should resolve with valid and invalid sections in dataset", async function () {
			let mixedDataset: string = getContentFromArchives("mixedDataset.zip");
			const result = await facade.addDataset("ubc", mixedDataset, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);
		});

		it("should reject with rooms kind", async function () {
			let errorWasThrown = false;
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});
	});

	describe("removeDataset Tests", function () {
		let sections: string;
		let facade: InsightFacade;

		before(function () {
			sections = getContentFromArchives("pair.zip");
		});

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should successfully remove a dataset after adding it", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = await facade.removeDataset("ubc");
			expect(result).to.equal("ubc");
		});

		it("should reject when removing a dataset that hasn't been added", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset("dne");
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(NotFoundError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with undefined id", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset(undefined as any);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with null id", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset(null as any);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject with non-string id", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset(999 as any);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject when removing a dataset with an id containing an underscore", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset("a_");
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject when removing a dataset with an id that has whitespace", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset("a ");
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject when removing a dataset with an id that is empty", async function () {
			let errorWasThrown = false;
			try {
				await facade.removeDataset("");
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});

		it("should reject when trying to remove a dataset twice", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("ubc");

			let errorWasThrown = false;

			try {
				await facade.removeDataset("ubc");
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(NotFoundError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected the second removeDataset to throw an error, but it did not. :(");
			}
		});

		it("should successfully remove same id after adding id and removing", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("ubc");
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = await facade.removeDataset("ubc");
			expect(result).to.equal("ubc");
		});

		it("should successfully remove same id after adding id and removing", async function () {
			const query = {
				WHERE: {
					IS: {
						sections_dept: "xyz",
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};

			let errorWasThrown = false;
			try {
				await facade.addDataset("xyz", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("xyz");
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}
			expect(errorWasThrown).to.be.true;
		});
	});

	describe("performQuery Tests", function () {
		let facade: InsightFacade;
		let sections: string;

		before(function () {
			sections = getContentFromArchives("pair.zip");
			facade = new InsightFacade();
			facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		});

		beforeEach(function () {
			//	clearDisk();


		});

		it("should reject query that is string", async function () {
			const query: string =
				'{"WHERE": {"GT": {"sections_avg": 97 }},' +
				'"OPTIONS": { "COLUMNS": ["sections_dept", "sections_avg"],"ORDER": "sections_avg"}}';
			let errorWasThrown = false;
			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error but, but it did not :(");
			}
		});

		// it("should reject query with empty WHERE", async function () {
		// 	const query = {
		// 		"": {GT: {sections_avg: 97}},
		// 		OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
		// 	};
		// 	let errorWasThrown = false;
		// 	try {
		// 		await facade.performQuery(query);
		// 	} catch (error) {
		// 		errorWasThrown = true;
		// 		expect(error).to.be.instanceOf(InsightError);
		// 	}
		// 	if (!errorWasThrown) {
		// 		throw new Error("Expected performQuery to throw error but, but it did not :(");
		// 	}
		// });

		it("should reject query with no WHERE", async function () {
			const query = {
				A: {GT: {sections_avg: 97}},
				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
			};

			let errorWasThrown = false;
			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw an error, but it did not :(");
			}
		});

		it("should reject query with no OPTIONS", async function () {
			const query = {WHERE: {GT: {sections_avg: 97}}};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw an error, but it did not :(");
			}
		});

		it("should reject query typo COLUMN", async function () {
			const query = {
				WHERE: {GT: {sections_avg: 97}},
				OPTIONS: {COLUMS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw an error, but it did not.");
			}
		});

		it("should reject query idstring not datasetID", async function () {
			const query = {
				WHERE: {GT: {xxx_avg: 97}},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
					ORDER: "sections_pass",
				},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error but, but it did not :(");
			}
		});

		it("should reject query empty FILTER list", async function () {
			const query = {
				WHERE: {OR: {}},
				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error but, but it did not :(");
			}
		});

		it("should reject query empty KEY list", async function () {
			const query = {WHERE: {OR: {}}, OPTIONS: {COLUMNS: []}};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error, but it did not :(");
			}
		});

		it("should reject query idsting with _", async function () {
			const query = {
				WHERE: {GT: {section_s_avg: 97}},
				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error, but it did not :(");
			}
		});

		it("should reject query ORDER key must be in COLUMNS", async function () {
			const query = {
				WHERE: {GT: {sections_avg: 97}},
				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_pass"},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error, but it did not :(");
			}
		});

		it("should reject query input string with *", async function () {
			const query = {
				WHERE: {GT: {"sections*_avg": 97}},
				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw error, but it did not :(");
			}
		});

		it("should resolve *input string*", async function () {
			const query = {
				WHERE: {IS: {sections_dept: "*hin*"}},
				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
			};

			try {
				const result = await facade.performQuery(query);
				expect(result).to.have.lengthOf(990);
			} catch (error) {
				console.log(error);
				throw new Error("Expected performQuery to resolve successfully, but it did not :(");
			}
		});

		it("should resolve with 2 FILTERS", async function () {
			const query = {
				WHERE: {
					AND: [
						{
							IS: {
								sections_dept: "*japn*",
							},
						},
						{
							IS: {
								sections_dept: "*japn*",
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
					ORDER: "sections_pass",
				},
			};

			try {
				const result = await facade.performQuery(query);
				expect(result).to.have.lengthOf(966);
			} catch (error) {
				throw new Error("Expected performQuery to resolve successfully, but it did not :(");
			}
		});

		it("should reject as >5000 results", async function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				console.log(error);
				errorWasThrown = true;
				expect(error).to.be.instanceOf(ResultTooLargeError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw ResultTooLargeError, but it did not :(");
			}
		});

		it("should return correct results for a simple query", async function () {
			const query = {
				WHERE: {
					GT: {
						sections_avg: 97,
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};
			const expected: InsightResult[] = [
				{sections_dept: "math", sections_avg: 97.09},

				{sections_dept: "math", sections_avg: 97.09},

				{sections_dept: "epse", sections_avg: 97.09},

				{sections_dept: "epse", sections_avg: 97.09},

				{sections_dept: "math", sections_avg: 97.25},

				{sections_dept: "math", sections_avg: 97.25},

				{sections_dept: "epse", sections_avg: 97.29},

				{sections_dept: "epse", sections_avg: 97.29},

				{sections_dept: "nurs", sections_avg: 97.33},

				{sections_dept: "nurs", sections_avg: 97.33},

				{sections_dept: "epse", sections_avg: 97.41},

				{sections_dept: "epse", sections_avg: 97.41},

				{sections_dept: "cnps", sections_avg: 97.47},

				{sections_dept: "cnps", sections_avg: 97.47},

				{sections_dept: "math", sections_avg: 97.48},

				{sections_dept: "math", sections_avg: 97.48},

				{sections_dept: "educ", sections_avg: 97.5},

				{sections_dept: "nurs", sections_avg: 97.53},

				{sections_dept: "nurs", sections_avg: 97.53},

				{sections_dept: "epse", sections_avg: 97.67},

				{sections_dept: "epse", sections_avg: 97.69},

				{sections_dept: "epse", sections_avg: 97.78},

				{sections_dept: "crwr", sections_avg: 98},

				{sections_dept: "crwr", sections_avg: 98},

				{sections_dept: "epse", sections_avg: 98.08},

				{sections_dept: "nurs", sections_avg: 98.21},

				{sections_dept: "nurs", sections_avg: 98.21},

				{sections_dept: "epse", sections_avg: 98.36},

				{sections_dept: "epse", sections_avg: 98.45},

				{sections_dept: "epse", sections_avg: 98.45},

				{sections_dept: "nurs", sections_avg: 98.5},

				{sections_dept: "nurs", sections_avg: 98.5},

				{sections_dept: "nurs", sections_avg: 98.58},

				{sections_dept: "nurs", sections_avg: 98.58},

				{sections_dept: "epse", sections_avg: 98.58},

				{sections_dept: "epse", sections_avg: 98.58},

				{sections_dept: "epse", sections_avg: 98.7},

				{sections_dept: "nurs", sections_avg: 98.71},

				{sections_dept: "nurs", sections_avg: 98.71},

				{sections_dept: "eece", sections_avg: 98.75},

				{sections_dept: "eece", sections_avg: 98.75},

				{sections_dept: "epse", sections_avg: 98.76},

				{sections_dept: "epse", sections_avg: 98.76},

				{sections_dept: "epse", sections_avg: 98.8},

				{sections_dept: "spph", sections_avg: 98.98},

				{sections_dept: "spph", sections_avg: 98.98},

				{sections_dept: "cnps", sections_avg: 99.19},

				{sections_dept: "math", sections_avg: 99.78},

				{sections_dept: "math", sections_avg: 99.78},
			];
			const result = await facade.performQuery(query);
			expect(result).to.deep.equal(expected);
		});

		it("should return correct results for a complex query", async function () {
			//	timeout if it takes too long so other tests can perform
			this.timeout(5000);
			const query = {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										ubc_avg: 90,
									},
								},
								{
									IS: {
										ubc_dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								ubc_avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
					ORDER: "ubc_avg",
				},
			};
			const expected: InsightResult[] = [
				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.02},

				{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.16},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.17},

				{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.18},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.5},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.72},

				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.82},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.85},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.29},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},

				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.48},

				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 92.54},

				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 93.33},

				{ubc_dept: "sowk", ubc_id: "570", ubc_avg: 95},

				{ubc_dept: "rhsc", ubc_id: "501", ubc_avg: 95},

				{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},

				{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},

				{ubc_dept: "obst", ubc_id: "549", ubc_avg: 95},

				{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},

				{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},

				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},

				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},

				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},

				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},

				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},

				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},

				{ubc_dept: "mtrl", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},

				{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},

				{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},

				{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},

				{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},

				{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},

				{ubc_dept: "kin", ubc_id: "499", ubc_avg: 95},

				{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},

				{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},

				{ubc_dept: "epse", ubc_id: "606", ubc_avg: 95},

				{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},

				{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},

				{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},

				{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},

				{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},

				{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},

				{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},

				{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},

				{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},

				{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},

				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 96.11},
			];
			const actualResult = await facade.performQuery(query);
			expect(actualResult).to.deep.equal(expected);
		});

		it("should reject for incorrect format for a simple query - invalid key in column", async function () {
			const query = {
				WHERE: {
					GT: {
						sections_avg: 97,
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "_avg"],
					ORDER: "sections_avg",
				},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
			}
		});

		it("should reject references dataset not added", async function () {
			const query = {
				WHERE: {
					IS: {
						ubc_dept: "*a",
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};

			let errorWasThrown = false;

			try {
				await facade.performQuery(query);
			} catch (error) {
				errorWasThrown = true;
				expect(error).to.be.instanceOf(InsightError);
			}

			if (!errorWasThrown) {
				throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
			}
		});
	});

	describe("listDatasets Tests", async function () {
		let facade: InsightFacade;
		let sections: string;
		let initialDatasetCount: number;

		before(async function () {
			sections = getContentFromArchives("pair.zip");
		});

		beforeEach(async function () {
			clearDisk();
			facade = new InsightFacade();

			// Get the initial dataset count
			const initialDatasets = await facade.listDatasets();
			initialDatasetCount = initialDatasets.length;

			// Add two datasets
			await Promise.all([
				facade.addDataset("ubc", sections, InsightDatasetKind.Sections),
				facade.addDataset("ubc2", sections, InsightDatasetKind.Rooms),
			]);
		});

		it("should return all datasets that were added", async function () {
			const datasets: InsightDataset[] = await facade.listDatasets();

			// Check if the length increased by 2
			expect(datasets)
				.to.be.an("array")
				.that.has.lengthOf(initialDatasetCount + 2);

			datasets.forEach(function (dataset) {
				expect(dataset).to.be.an("object");
				expect(dataset).to.have.property("id").that.is.a("string");
				expect(dataset.kind).to.be.oneOf([InsightDatasetKind.Sections, InsightDatasetKind.Rooms]);
				expect(dataset).to.have.property("numRows").that.is.a("number");
			});
		});
	});
});
