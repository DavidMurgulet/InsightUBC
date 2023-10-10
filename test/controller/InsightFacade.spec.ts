import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import {Dataset, Section} from "../../src/controller/Dataset";
import InsightFacade from "../../src/controller/InsightFacade";
import {isBase64Zip, loadDatasetsFromDirectory, validateDataset} from "../../src/controller/datasetUtils";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {Query} from "../../src/controller/Query";
import {checkParsing, parseOpts, parseWhere} from "../../src/controller/Parse";

import {Collector} from "../../src/controller/Collector";
import {Validator} from "../../src/controller/Validator";
import exp from "constants";
import {folderTest} from "@ubccpsc310/folder-test";

use(chaiAsPromised);

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
			await facade.initialize();
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
			await facade.initialize();

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
			await facade.initialize();

			await facade.removeDataset("pair");
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
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
			await facade.initialize();
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
			await facade.initialize();
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

			expect(result).to.deep.equal([
				{
					id: "cs121",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
				{
					id: "cs110",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
			]);
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
	// 		await facade.initialize();
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

	describe("validationTests", function () {
		let optsEmptyCol = {
			OPTIONS: {
				COLUMNS: [],
				ORDER: "ubc_avg",
			},
		};
		let optsValid = {
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let optsOrderFirst = {
			OPTIONS: {
				ORDER: "ubc_avg",
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
			},
		};
		let optsOrderNotInCol = {
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
				ORDER: "ubc_pass",
			},
		};
		let optsInvKeyOrd = {
			OPTIONS: {
				ORDER: "ubc_aaaa",
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
			},
		};
		let optsInvKeyCol = {
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_idddd", "ubc_avg"],
				ORDER: "ubc_avg",
			},
		};
		let optsNoOrder = {
			OPTIONS: {
				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
			},
		};

		let where2Key = {
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
		let validator: Validator;
		let facade: InsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			validator = new Validator([]);
		});

		it("should validate OPTS", function () {
			const opt = Object.keys(optsValid)[0];
			const sub = optsValid.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(0);
		});

		it("should validate where2key, with the first removed", function () {
			const where = Object.keys(where2Key)[0];
			const sub = where2Key.WHERE;
			const node = parseWhere(sub, where);
			const result = validator.validWhere(node);
			expect(result).to.equal(0);
		});

		it("should validate OPTS, (ORDER FIRST)", function () {
			const opt = Object.keys(optsOrderFirst)[0];
			const sub = optsOrderFirst.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(0);
		});

		it("should validate OPTS, (ORDER NOT MATCHING COl)", function () {
			const opt = Object.keys(optsOrderNotInCol)[0];
			const sub = optsOrderNotInCol.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(1);
		});

		it("should not validate OPTS (empty COLUMNS)", function () {
			const opt = Object.keys(optsEmptyCol)[0];
			const sub = optsEmptyCol.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(1);
		});

		it("should not validate OPTS (invalid key in COLUMNS )", function () {
			const opt = Object.keys(optsInvKeyCol)[0];
			const sub = optsInvKeyOrd.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(1);
		});

		it("should not validate OPTS (invalid key in ORDER)", function () {
			const opt = Object.keys(optsInvKeyOrd)[0];
			const sub = optsInvKeyOrd.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(1);
		});

		it("should validate, (no ORDER)", function () {
			const opt = Object.keys(optsNoOrder)[0];
			const sub = optsNoOrder.OPTIONS;
			const node = parseOpts(sub, opt);
			const result = validator.validateOptions(node);
			expect(result).to.equal(0);
		});
	});

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
						LT: {
							test_fail: 5,
						},
					},
					{
						GT: {
							test_avg: 59,
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
			sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2021, 85, 49, 1, 2);
			sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2020, 60, 25, 25, 0);
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
			expect(result).to.includes(sec1);
			expect(result).to.includes(sec2);
			expect(result).to.not.includes(sec3);
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
		let pair: string;
		let sec1;
		let sec2;
		let sec3;
		let sec4;
		let sec5;
		let sec6;
		let sec7;
		let sec8;
		let sec9;
		let sections: Section[];
		let sections2: Section[];
		let dataset1: Dataset;
		let dataset2: Dataset;

		before(async function () {
			clearDisk();
			facade = new InsightFacade();
			await facade.initialize();
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
	});

	describe("performQuery", function () {
		let sections: string;
		let alt: string;
		let facade: InsightFacade;

		before(async function () {
			clearDisk();
			sections = getContentFromArchives("pair.zip");
			alt = getContentFromArchives("basic.zip");
			facade = new InsightFacade();
			await facade.initialize();
			await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			// facade.aDataset(new Dataset("sections", sections, InsightDatasetKind.Sections, sections.length));
		});

		function errorValidator(error: any): error is Error {
			return error === "InsightError" || error === "ResultTooLargeError";
		}

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: (actual, expected) => {
					// TODO add an assertion!
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					// TODO add an assertion!
				},
			}
		);
	});
});

// describe("performQuery", function () {
// 	let sections: string;
// 	let alt: string;
// 	let facade: InsightFacade;
//
// 	before(async function () {
// 		clearDisk();
// 		sections = getContentFromArchives("pair.zip");
// 		alt = getContentFromArchives("basic.zip");
// 		facade = new InsightFacade();
// 		await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
// 		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 	});
//
// 	// function errorValidator(error: any): error is Error {
// 	// 	return error === "InsightError" || error === "ResultTooLargeError";
// 	// }
// 	//
// 	// type PQErrorKind = "ResultTooLargeError" | "InsightError";
// 	//
// 	// folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 	// 	"Dynamic InsightFacade PerformQuery tests",
// 	// 	(input) => facade.performQuery(input),
// 	// 	"./test/resources/queries",
// 	// 	{
// 	// 		assertOnResult: (actual, expected) => {
// 	// 			// TODO add an assertion!
// 	// 		},
// 	// 		errorValidator: (error): error is PQErrorKind =>
// 	// 			error === "ResultTooLargeError" || error === "InsightError",
// 	// 		assertOnError: (actual, expected) => {
// 	// 			// TODO add an assertion!
// 	// 		},
// 	// 	}
// 	// );
// });
