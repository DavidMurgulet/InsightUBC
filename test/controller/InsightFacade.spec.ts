import {InsightDatasetKind, InsightError, InsightResult} from "../../src/controller/IInsightFacade";

import {Dataset} from "../../src/controller/Dataset";

import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";
import {Query, QueryNode} from "../../src/controller/Query";
import {checkParsing, parseOpts, parseWhere} from "../../src/controller/Parse";
import {validOpts, validWhere} from "../../src/controller/Validate";

use(chaiAsPromised);

describe("InsightFacade", function () {
	// describe("addDataset", function () {
	// 	let sections: string;
	// 	let sectionsInvalid: string;
	// 	let pair: string;
	// 	let facade: InsightFacade;
	// 	let noaudit: string;
	// 	let noavg: string;
	// 	let nopass: string;
	// 	let nofail: string;
	// 	let noid: string;
	// 	let noinst: string;
	// 	let nodept: string;
	// 	let notitle: string;
	// 	let noyear: string;
	// 	let nouuid: string;
	//
	// 	before(function () {
	// 		sections = getContentFromArchives("basic.zip");
	// 		sectionsInvalid = getContentFromArchives("invalid.zip");
	// 		pair = getContentFromArchives("pair.zip");
	//
	// 		// invalid sections
	// 		noaudit = getContentFromArchives("noAUDIT.zip");
	// 		noavg = getContentFromArchives("noAVG.zip");
	// 		nodept = getContentFromArchives("noDEPT.zip");
	// 		nofail = getContentFromArchives("noFAIL.zip");
	// 		noid = getContentFromArchives("noID.zip");
	// 		noinst = getContentFromArchives("noINSTRUCTOR.zip");
	// 		nopass = getContentFromArchives("noPASS.zip");
	// 		notitle = getContentFromArchives("noTITLE.zip");
	// 		nouuid = getContentFromArchives("noUUID.zip");
	// 		noyear = getContentFromArchives("noYEAR.zip");
	//
	//
	// 	});
	//
	// 	beforeEach(function () {
	// 		clearDisk();
	// 		facade = new InsightFacade();
	// 	});
	//
	// 	it("should successfully add a dataset (first)", function () {
	// 		const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.have.members(["ubc"]);
	// 	});
	//
	// 	it("should successfully add a dataset (second)", function () {
	// 		const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.have.members(["ubc"]);
	// 	});
	//
	// 	it("should successfully access dataset after crash", async function () {
	// 		await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
	// 		// new instance made
	// 		facade = new InsightFacade();
	// 		const result = await facade.listDatasets();
	// 		expect(result).to.deep.equal([{
	// 			id: "pair",
	// 			kind: InsightDatasetKind.Sections,
	// 			numRows: 64612
	// 		}]);
	// 	});
	//
	// 	it("should not access dataset after crash + removal", async function () {
	// 		await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
	// 		// new instance made
	// 		facade = new InsightFacade();
	//
	// 		const result = await facade.removeDataset("pair");
	// 		// const result = await facade.listDatasets();
	// 		expect(result).to.deep.equal("pair");
	// 	});
	//
	// 	it("should successfully add 2 datasets", async function () {
	// 		await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
	// 		const result = facade.addDataset("pair", pair, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.have.members(["ubc", "pair"]);
	// 	});
	//
	// 	it("should reject with an empty dataset id", function () {
	// 		const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with a whitespace id", function () {
	// 		const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with a invalid rooms kind", function () {
	// 		const result = facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	//
	// 	// INVALID SECTION TESTS
	// 	it("should reject with an invalid dataset (no valid sections)", function () {
	// 		const result = facade.addDataset("ubc", sectionsInvalid, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing avg)", function () {
	// 		const result = facade.addDataset("test", noavg, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing pass)", function () {
	// 		const result = facade.addDataset("test", nopass, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing fail)", function () {
	// 		const result = facade.addDataset("test", nofail, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing audit)", function () {
	// 		const result = facade.addDataset("test", noaudit, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing year)", function () {
	// 		const result = facade.addDataset("test", noyear, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing dept)", function () {
	// 		const result = facade.addDataset("test", nodept, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing id)", function () {
	// 		const result = facade.addDataset("test", noid, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing instructor)", function () {
	// 		const result = facade.addDataset("test", noinst, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing title)", function () {
	// 		const result = facade.addDataset("ubc", notitle, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	//
	// 	it("should reject with an invalid section (missing uuid)", function () {
	// 		const result = facade.addDataset("test", nouuid, InsightDatasetKind.Sections);
	// 		return expect(result).to.eventually.be.rejectedWith(InsightError);
	// 	});
	// });

	describe("removeDataset", function () {
		let sections: string;
		// let sectionsInvalid: string;
		let facade: InsightFacade;
		let data: Dataset;

		before(async function () {
			sections = getContentFromArchives("cs110.zip");
			// sectionsInvalid = getContentFromArchives("invalid.zip");
			// clearDisk();
			facade = new InsightFacade();
			await facade.addDataset("cs110", sections, InsightDatasetKind.Sections);
		});

		it("should successfully remove dataset", async function () {
			// added await here
			const result = await facade.removeDataset("cs110");
			expect(result).to.deep.equal("cs110");
		});

		// it("should reject with nonexistent id (already removed)", function () {
		// 	const result = facade.removeDataset("courses");
		// 	return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		// });
		//
		// it("should reject with nonexistent id (not found)", function () {
		// 	const result = facade.removeDataset("course");
		// 	return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		// });

		// it("should reject with invalid id (nothing)", function () {
		// 	const result = facade.removeDataset("");
		// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
		// });
		//
		// it("should reject with invalid id (whitespace)", function () {
		// 	const result = facade.removeDataset("    ");
		// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
		// });
		// it("should reject with invalid id (underscore)", function () {
		// 	const result = facade.removeDataset("u_bc");
		// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
		// });
	});

	// describe("listDatasets", function () {
	// 	let set1: string;
	// 	let set2: string;
	// 	let facade: InsightFacade;
	//
	// 	before(function () {
	// 		set1 = getContentFromArchives("cs110.zip");
	// 		set2 = getContentFromArchives("cs121.zip");
	// 		clearDisk();
	// 		facade = new InsightFacade();
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
					GT: {
						sections_avg: 3,
					},
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
			// const where!: QueryNode;
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

	describe("validateWhere", function () {
		let root: Query;
		let qBasicWhere: object;
		let qComplexWhere: object;
		let qBasicInvVal: object;
		let qBasicInvKey: object;

		let facade: InsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			qBasicWhere = {
				WHERE: {
					GT: {
						sections_avg: 3,
					},
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
			qBasicInvKey = {
				WHERE: {
					GT: {
						sections_avg: "string",
					},
				},
			};
			qBasicInvVal = {
				WHERE: {
					GT: {
						sections_aaaaaa: 3,
					},
				},
			};
		});

		it("should validate WHERE (basic)", function () {
			// const where!: QueryNode;
			const where = Object.keys(qBasicWhere)[0];
			const node = parseWhere(qBasicWhere, where);
			const result = validWhere(node);
			expect(result).to.equal(true);
		});

		it("should validate WHERE (complex)", function () {
			const where = Object.keys(qComplexWhere)[0];
			const node = parseWhere(qComplexWhere, where);
			const result = validWhere(node);
			expect(result).to.equal(true);
		});

		it("should not validate WHERE (basic, invalid value type)", function () {
			const where = Object.keys(qBasicInvVal)[0];
			const node = parseWhere(qBasicInvVal, where);
			const result = validWhere(node);
			expect(result).to.equal(false);
		});

		it("should not validate WHERE (basic, invalid key type)", function () {
			const where = Object.keys(qBasicInvKey)[0];
			const node = parseWhere(qBasicInvKey, where);
			const result = validWhere(node);
			expect(result).to.equal(false);
		});
	});

	describe("validOpts", function () {
		let root: Query;
		let optsEmptyCol: object;
		let optsValid: object;
		let optsInvKeyOrd: object;
		let optsInvKeyCol: object;

		let facade: InsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			optsEmptyCol = {
				OPTIONS: {
					COLUMNS: [],
					ORDER: "ubc_avg",
				},
			};
			optsValid = {
				OPTIONS: {
					COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
					ORDER: "ubc_avg",
				},
			};
			optsInvKeyOrd = {
				OPTIONS: {
					COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
					ORDER: "ubc_aaaa",
				},
			};
			optsInvKeyCol = {
				OPTIONS: {
					COLUMNS: ["ubc_dept", "ubc_idddd", "ubc_avg"],
					ORDER: "ubc_avg",
				},
			};
		});

		it("should validate OPTS", function () {
			// const where!: QueryNode;
			const opt = Object.keys(optsValid)[0];
			const node = parseOpts(optsValid, opt);
			const result = validOpts(node);
			expect(result).to.equal(true);
		});

		it("should not validate OPTS (empty COLUMNS)", function () {
			const opt = Object.keys(optsEmptyCol)[0];
			const node = parseOpts(optsEmptyCol, opt);
			const result = validOpts(node);
			expect(result).to.equal(false);
		});

		it("should not validate OPTS (invalid key in COLUMNS )", function () {
			const opt = Object.keys(optsInvKeyCol)[0];
			const node = parseOpts(optsInvKeyCol, opt);
			const result = validOpts(node);
			expect(result).to.equal(false);
		});

		it("should not validate OPTS (invalid key in ORDER)", function () {
			const opt = Object.keys(optsInvKeyOrd)[0];
			const node = parseOpts(optsInvKeyOrd, opt);
			const result = validOpts(node);
			expect(result).to.equal(false);
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
});
