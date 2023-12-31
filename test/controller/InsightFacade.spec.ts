import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import {Dataset, Room, Section} from "../../src/controller/Dataset";
import InsightFacade from "../../src/controller/InsightFacade";
import {assert, expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {parseOptionsRefactored, parseTransformations, parseWhereRefactored} from "../../src/controller/Parse";

import {Collector} from "../../src/controller/Collector";
import {Validator} from "../../src/controller/Validator";

import {folderTest} from "@ubccpsc310/folder-test";

import {emptydir} from "fs-extra";

import {isBase64Zip, loadZipContent} from "../../src/controller/datasetAdditionalUtils";
import {validateCourseDataset} from "../../src/controller/datasetUtils";
import {getLatLong} from "../../src/controller/geoLocation";
import {htmlParseBuilding} from "../../src/controller/parseHTM";
use(chaiAsPromised);

describe("Rooms Kind", function () {
	let campus: string;
	let facade: InsightFacade;

	before(function () {
		campus = getContentFromArchives("campus.zip");
	});

	beforeEach(async function () {
		clearDisk();
		facade = new InsightFacade();
	});

	it("should still be able to remove dataset after crash", async function () {
		await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		// new instance made
		facade = new InsightFacade();

		const result1 = await facade.removeDataset("campus");
		const result = await facade.listDatasets();

		expect(result1).to.equal("campus");
		expect(result).to.deep.equal([]);
	});

	it("should not be able to remove dataset after removal + crash", async function () {
		await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		await facade.removeDataset("campus");
		// new instance made

		facade = new InsightFacade();

		const result = facade.removeDataset("campus");
		return expect(result).to.eventually.be.rejectedWith(NotFoundError);
	});

	it("should be able to add dataset after removal + crash", async function () {
		this.timeout(5000);
		await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		await facade.removeDataset("campus");
		// new instance made

		facade = new InsightFacade();

		const result = await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		expect(result).to.deep.equal(["campus"]);
	});

	it("should successfully add room dataset (first)", function () {
		this.timeout(100000);
		let result = facade.addDataset("campus", campus, InsightDatasetKind.Rooms);

		return expect(result).to.eventually.have.members(["campus"]);
	});

	it("should reject with an empty dataset id", function () {
		const result = facade.addDataset("", campus, InsightDatasetKind.Rooms);
		return expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should reject with a whitespace id", function () {
		const result = facade.addDataset(" ", campus, InsightDatasetKind.Rooms);
		return expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should reject with a invalid Sections kind", function () {
		const result = facade.addDataset("campus", campus, InsightDatasetKind.Sections);
		return expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should successfully remove room dataset", async function () {
		this.timeout(10000);
		await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		const result = facade.removeDataset("campus");
		return expect(result).to.eventually.be.equal("campus");
	});

	it("Show all rooms added", async function () {
		// Set a timeout if the operation can take long
		this.timeout(2000); // 2 second timeout
		facade = new InsightFacade();

		await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);

		// Retrieve the datasets to find the newly added one
		let datasets = facade.getDatasets();
		expect(datasets).to.eventually.not.be.null; // Using Chai for assertions
		expect(datasets).to.eventually.be.an("array").that.is.not.empty;

		// // Find the 'campus' dataset
		// if (datasets !== null) {
		// 	let campusDataset = await datasets.find((dataset: { id: string; }) => dataset.id === "campus");
		// 	if (campusDataset) {
		//
		// 		expect(campusDataset).to.eventually.not.be.undefined;
		// 		expect(campusDataset.data).to.eventually.be.an('array').with.lengthOf.at.least(1);
		// 	}
		// }
		// if (datasets){
		// 	console.log(datasets[0].data);
		// }
	});
});
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

describe("validate Transformations", function () {
	let transValid = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_title", "overallAvg"],
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_title"],
			APPLY: [
				{
					overallAvg: {
						AVG: "sections_avg",
					},
				},
			],
		},
	};
	let invEmptyGroup = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_title", "overallAvg"],
		},
		TRANSFORMATIONS: {
			GROUP: [],
			APPLY: [
				{
					overallAvg: {
						AVG: "sections_avg",
					},
				},
			],
		},
	};
	let EmptyApply = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_title", "overallAvg"],
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_title"],
			APPLY: [],
		},
	};
	let invAVGnotNumeric = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_title", "overallAvg"],
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_title"],
			APPLY: [
				{
					overallDept: {
						AVG: "sections_dept",
					},
				},
			],
		},
	};
	let invEmptyApplyKey = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_title", "overallAvg"],
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_title"],
			APPLY: [
				{
					"": {
						AVG: "sections_avg",
					},
				},
			],
		},
	};
	let invGroupnotArray = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_title", "overallAvg"],
		},
		TRANSFORMATIONS: {
			GROUP: "sections_title",
			APPLY: [
				{
					overallAvg: {
						AVG: "sections_avg",
					},
				},
			],
		},
	};
	// let transValid = {
	// 	"WHERE": {},
	// 	"OPTIONS": {
	// 		"COLUMNS": ["sections_title", "overallAvg"]
	// 	},
	// 	"TRANSFORMATIONS": {
	// 		"GROUP": ["sections_title"],
	// 		"APPLY": [{
	// 			"overallAvg": {
	// 				"AVG": "sections_avg"
	// 			}
	// 		}]
	// 	}
	// };

	let sections: Section[];
	let dataset: Dataset;
	let sec1: Section;
	let sec2: Section;
	let sec3: Section;
	let sec4: Section;
	let sec5: Section;
	let validator: Validator;
	let facade: InsightFacade;

	before(function () {
		clearDisk();
		facade = new InsightFacade();
		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
		sections = [sec1, sec2, sec3, sec4, sec5];
		dataset = new Dataset("sections", 5, sections, InsightDatasetKind.Sections);
		validator = new Validator([dataset]);
	});

	it("should properly validate Transformations", function () {
		const trans = Object.keys(transValid)[2];
		const sub = transValid.TRANSFORMATIONS;
		const transObj = parseTransformations(sub, trans);
		const result = validator.validateTransformations(transObj);
		expect(result.error).to.equal(0);
	});

	it("EmptyGroup, Invalid", function () {
		const trans = Object.keys(invEmptyGroup)[2];
		const sub = invEmptyGroup.TRANSFORMATIONS;
		const transObj = parseTransformations(sub, trans);
		const result = validator.validateTransformations(transObj);
		expect(result.error).to.equal(1);
	});

	it("EmptyApply, ok", function () {
		const trans = Object.keys(EmptyApply)[2];
		const sub = EmptyApply.TRANSFORMATIONS;
		const transObj = parseTransformations(sub, trans);
		const result = validator.validateTransformations(transObj);
		expect(result.error).to.equal(0);
	});

	it("AVG w/ non-numeric, invalid", function () {
		const trans = Object.keys(invAVGnotNumeric)[2];
		const sub = invAVGnotNumeric.TRANSFORMATIONS;
		const transObj = parseTransformations(sub, trans);
		const result = validator.validateTransformations(transObj);
		expect(result.error).to.equal(1);
	});

	it("Group-non array, invalid ", function () {
		const trans = Object.keys(invGroupnotArray)[2];
		const sub = invGroupnotArray.TRANSFORMATIONS;
		try {
			const transObj = parseTransformations(sub, trans);
			const result = validator.validateTransformations(transObj);
			expect(result.error).to.equal(1);
		} catch (e) {
			expect(e).to.be.instanceOf(InsightError);
		}
	});
});

// describe("validateAll", function () {
// 	let validBasic = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["sections_title"],
// 			APPLY: [
// 				{
// 					overallAvg: {
// 						AVG: "sections_avg",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let validComplex = {
// 		WHERE: {
// 			AND: [
// 				{
// 					GT: {
// 						sections_avg: 80,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["sections_dept", "maxAvg"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxAvg"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["sections_dept"],
// 			APPLY: [
// 				{
// 					maxAvg: {
// 						MAX: "sections_avg",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invalidMissingDirSort = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: "*Tables*",
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_seats: 300,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 			ORDER: {
// 				keys: ["maxSeats"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["rooms_shortname"],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invalidEmptyGroup = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: "*Tables*",
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_seats: 300,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxSeats"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: [],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invalidColNotInGroup = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: "*Tables*",
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_seats: 300,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_fullname", "maxSeats"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxSeats"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["rooms_shortname"],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let validRooms = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: "*Tables*",
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_seats: 300,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxSeats"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["rooms_shortname"],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invalidWrongKeyIS = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: 90,
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_seats: 300,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxSeats"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["rooms_shortname"],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invalidKeyGT = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: "*Tables*",
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_fail: 90,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxSeats"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["rooms_shortname"],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let valid2Keys = {
// 		WHERE: {
// 			AND: [
// 				{
// 					IS: {
// 						rooms_furniture: "*Tables*",
// 					},
// 				},
// 				{
// 					GT: {
// 						rooms_seats: 300,
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 			ORDER: {
// 				dir: "DOWN",
// 				keys: ["maxSeats", "rooms_shortname"],
// 			},
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["rooms_shortname"],
// 			APPLY: [
// 				{
// 					maxSeats: {
// 						MAX: "rooms_seats",
// 					},
// 				},
// 			],
// 		},
// 	};
//
// 	let sections: Section[];
// 	let dataset: Dataset;
// 	let dataset2: Dataset;
// 	let sec1: Section;
// 	let sec2: Section;
// 	let sec3: Section;
// 	let sec4: Section;
// 	let sec5: Section;
// 	let validator: Validator;
// 	let facade: InsightFacade;
// 	let collector: Collector;
//
// 	before(function () {
// 		clearDisk();
// 		facade = new InsightFacade();
// 		// generated by chatGPT
// 		const rooms: Room[] = [
// 			new Room(
// 				"DMP_110",
// 				"DMP",
// 				"110",
// 				"DMP 110",
// 				"123 Main St",
// 				49.123,
// 				-123.456,
// 				400,
// 				"Classroom",
// 				"Tables",
// 				"https://example.com/room/110"
// 			),
// 			new Room(
// 				"LSK_201",
// 				"LSK",
// 				"201",
// 				"LSK 201",
// 				"456 Elm St",
// 				49.789,
// 				-123.789,
// 				350,
// 				"Classroom",
// 				"Tables",
// 				"https://example.com/room/201"
// 			),
// 			new Room(
// 				"EOSB_101",
// 				"EOSB",
// 				"101",
// 				"EOSB 101",
// 				"789 Oak St",
// 				49.456,
// 				-123.123,
// 				360,
// 				"Lecture Hall",
// 				"Tables",
// 				"https://example.com/room/101"
// 			),
// 			new Room(
// 				"WOOD_301",
// 				"WOOD",
// 				"301",
// 				"WOOD 301",
// 				"321 Pine St",
// 				49.987,
// 				-123.987,
// 				120,
// 				"Classroom",
// 				"Chair",
// 				"https://example.com/room/301"
// 			),
// 			new Room(
// 				"ICICS_005",
// 				"ICICS",
// 				"005",
// 				"ICICS 005",
// 				"555 Cedar St",
// 				49.654,
// 				-123.654,
// 				30,
// 				"Laboratory",
// 				"Chair",
// 				"https://example.com/room/005"
// 			),
// 			new Room(
// 				"ANGU_202",
// 				"ANGU",
// 				"202",
// 				"ANGU 202",
// 				"222 Birch St",
// 				49.234,
// 				-123.234,
// 				90,
// 				"Classroom",
// 				"Chair",
// 				"https://example.com/room/202"
// 			),
// 			new Room(
// 				"CHEM_401",
// 				"CHEM",
// 				"401",
// 				"CHEM 401",
// 				"456 Redwood St",
// 				49.555,
// 				-123.555,
// 				60,
// 				"Laboratory",
// 				"Desk-Chair",
// 				"https://example.com/room/401"
// 			),
// 			new Room(
// 				"PHYS_301",
// 				"PHYS",
// 				"301",
// 				"PHYS 301",
// 				"123 Sequoia St",
// 				49.888,
// 				-123.888,
// 				80,
// 				"Classroom",
// 				"Desk-Chair",
// 				"https://example.com/room/301"
// 			),
// 			new Room(
// 				"MATH_110",
// 				"MATH",
// 				"110",
// 				"MATH 110",
// 				"987 Walnut St",
// 				49.345,
// 				-123.345,
// 				40,
// 				"Classroom",
// 				"Desk-Chair",
// 				"https://example.com/room/110"
// 			),
// 			new Room(
// 				"LSC_150",
// 				"LSC",
// 				"150",
// 				"LSC 150",
// 				"111 Maple St",
// 				49.111,
// 				-123.111,
// 				55,
// 				"Classroom",
// 				"Desk-Chair",
// 				"https://example.com/room/150"
// 			),
// 		];
// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 		dataset = new Dataset("sections", 5, sections, InsightDatasetKind.Sections);
// 		dataset2 = new Dataset("rooms", 10, rooms, InsightDatasetKind.Rooms);
// 		validator = new Validator([dataset, dataset2]);
// 		collector = new Collector([dataset, dataset2]);
// 		facade.aDataset(dataset);
// 		facade.aDataset(dataset2);
// 	});
//
// 	it("should properly validate All", function () {
// 		const where = Object.keys(validBasic)[0];
// 		const opts = Object.keys(validBasic)[1];
// 		const trans = Object.keys(validBasic)[2];
// 		const subW = validBasic.WHERE;
// 		const subO = validBasic.OPTIONS;
// 		const subT = validBasic.TRANSFORMATIONS;
// 		const transObj = parseTransformations(subT, trans);
// 		const whereObj = parseWhereRefactored(subW, where);
// 		const optsObj = parseOptionsRefactored(subO, opts);
// 		const result3 = validator.validateTransformations(transObj);
// 		const result1 = validator.validateWhereRefactored(whereObj);
// 		const result2 = validator.validateOptionsRefactored(optsObj);
// 		expect(result1.error).to.equal(0);
// 		expect(result3.error).to.equal(0);
// 		expect(result2.error).to.equal(0);
// 	});
//
// 	it("validate ALL Complex", function () {
// 		const trans = Object.keys(validComplex)[2];
// 		const subT = validComplex.TRANSFORMATIONS;
// 		const where = Object.keys(validComplex)[0];
// 		const subW = validComplex.WHERE;
// 		const opts = Object.keys(validComplex)[1];
// 		const subO = validComplex.OPTIONS;
// 		const transObj = parseTransformations(subT, trans);
// 		const whereObj = parseWhereRefactored(subW, where);
// 		const optsObj = parseOptionsRefactored(subO, opts);
// 		const result3 = validator.validateTransformations(transObj);
// 		const result1 = validator.validateWhereRefactored(whereObj);
// 		const result2 = validator.validateOptionsRefactored(optsObj);
// 		expect(result1.error).to.equal(0);
// 		expect(result3.error).to.equal(0);
// 		expect(result2.error).to.equal(0);
// 	});
//
// 	it("invalid MissingDir", function () {
// 		const trans = Object.keys(invalidMissingDirSort)[2];
// 		const subT = invalidMissingDirSort.TRANSFORMATIONS;
// 		const where = Object.keys(invalidMissingDirSort)[0];
// 		const subW = invalidMissingDirSort.WHERE;
// 		const opts = Object.keys(invalidMissingDirSort)[1];
// 		const subO = invalidMissingDirSort.OPTIONS;
// 		const transObj = parseTransformations(subT, trans);
// 		const whereObj = parseWhereRefactored(subW, where);
// 		const optsObj = parseOptionsRefactored(subO, opts);
// 		const result3 = validator.validateTransformations(transObj);
// 		const result1 = validator.validateWhereRefactored(whereObj);
// 		const result2 = validator.validateOptionsRefactored(optsObj);
// 		expect(result1.error).to.equal(0);
// 		expect(result3.error).to.equal(0);
// 		expect(result2.error).to.equal(1);
// 		console.log(result2.msg);
// 	});
//
// 	it("valid", async function () {
// 		const results = await facade.performQuery(validRooms);
// 		expect(results).to.be.length(3);
// 	});
//
// 	it("invalid", async function () {
// 		const results = facade.performQuery(invalidWrongKeyIS);
// 		expect(results).to.be.eventually.rejectedWith(InsightError);
// 	});
//
// 	it("invalid2", async function () {
// 		const results = facade.performQuery(invalidKeyGT);
// 		expect(results).to.be.eventually.rejectedWith(InsightError);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "rooms_shortname"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "rooms_shortname"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "rooms_shortname"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "rooms_shortname"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "rooms_shortname"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "rooms_shortname"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 	});
//
// 	it("valid2", async function () {
// 		let valid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "Tables",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					keys: ["maxSeats"],
// 					dir: "DOWN",
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(valid2Keys);
// 		console.log(results);
// 		return expect(results).to.be.length(3);
// 	});
//
// 	it("invalidAllorderKeys must be in COL", async function () {
// 		let query = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "maxS"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = facade.performQuery(query);
// 		return expect(results).to.be.eventually.rejectedWith(InsightError);
// 	});
//
// 	it("Order Keys empty", async function () {
// 		let query = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: [],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = facade.performQuery(query);
// 		return expect(results).to.be.eventually.rejectedWith(InsightError);
// 	});
//
// 	it("Invalid key rooms_avg in AVG", async function () {
// 		let query = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["rooms_shortname", "maxSeats"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: ["rooms_shortname"],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 					{
// 						avgFail: {AVG: "rooms_avg"},
// 					},
// 				],
// 			},
// 		};
// 		const results = facade.performQuery(query);
// 		return expect(results).to.be.eventually.rejectedWith(InsightError);
// 	});
//
// 	it("only apply keys used", async function () {
// 		let query = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							rooms_furniture: "*Tables*",
// 						},
// 					},
// 					{
// 						GT: {
// 							rooms_seats: 300,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["maxSeats", "count"],
// 				ORDER: {
// 					dir: "DOWN",
// 					keys: ["maxSeats", "count"],
// 				},
// 			},
// 			TRANSFORMATIONS: {
// 				GROUP: [
// 					"rooms_shortname",
// 					"rooms_shortname",
// 					"rooms_fullname",
// 					"rooms_lat",
// 					"rooms_lon",
// 					"rooms_seats",
// 				],
// 				APPLY: [
// 					{
// 						maxSeats: {
// 							MAX: "rooms_seats",
// 						},
// 					},
// 					{
// 						count: {
// 							COUNT: "rooms_fullname",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		const results = await facade.performQuery(query);
// 		console.log(results);
// 		return expect(results).to.be.length(3);
// 	});
// });

// describe("validateWhere (refactored)", function () {
// 	let transValid = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["sections_title"],
// 			APPLY: [
// 				{
// 					overallAvg: {
// 						AVG: "sections_avg",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invEmptyGroup = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: [],
// 			APPLY: [
// 				{
// 					overallAvg: {
// 						AVG: "sections_avg",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let EmptyApply = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["sections_title"],
// 			APPLY: [],
// 		},
// 	};
// 	let invAVGnotNumeric = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["sections_title"],
// 			APPLY: [
// 				{
// 					overallDept: {
// 						AVG: "sections_dept",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invEmptyApplyKey = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: ["sections_title"],
// 			APPLY: [
// 				{
// 					"": {
// 						AVG: "sections_avg",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let invGroupnotArray = {
// 		WHERE: {},
// 		OPTIONS: {
// 			COLUMNS: ["sections_title", "overallAvg"],
// 		},
// 		TRANSFORMATIONS: {
// 			GROUP: "sections_title",
// 			APPLY: [
// 				{
// 					overallAvg: {
// 						AVG: "sections_avg",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	// let transValid = {
// 	// 	"WHERE": {},
// 	// 	"OPTIONS": {
// 	// 		"COLUMNS": ["sections_title", "overallAvg"]
// 	// 	},
// 	// 	"TRANSFORMATIONS": {
// 	// 		"GROUP": ["sections_title"],
// 	// 		"APPLY": [{
// 	// 			"overallAvg": {
// 	// 				"AVG": "sections_avg"
// 	// 			}
// 	// 		}]
// 	// 	}
// 	// };
//
// 	let sections: Section[];
// 	let dataset: Dataset;
// 	let sec1: Section;
// 	let sec2: Section;
// 	let sec3: Section;
// 	let sec4: Section;
// 	let sec5: Section;
// 	let validator: Validator;
// 	let facade: InsightFacade;
//
// 	before(function () {
// 		clearDisk();
// 		facade = new InsightFacade();
// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 		dataset = new Dataset("sections", 5, sections, InsightDatasetKind.Sections);
// 		validator = new Validator([dataset]);
// 	});
//
// 	it("should properly validate Transformations", function () {
// 		const trans = Object.keys(transValid)[2];
// 		const sub = transValid.TRANSFORMATIONS;
// 		const transObj = parseTransformations(sub, trans);
// 		const result = validator.validateTransformations(transObj);
// 		expect(result.error).to.equal(0);
// 	});
//
// 	it("EmptyGroup, Invalid", function () {
// 		const trans = Object.keys(invEmptyGroup)[2];
// 		const sub = invEmptyGroup.TRANSFORMATIONS;
// 		const transObj = parseTransformations(sub, trans);
// 		const result = validator.validateTransformations(transObj);
// 		expect(result.error).to.equal(1);
// 	});
//
// 	it("EmptyApply, ok", function () {
// 		const trans = Object.keys(EmptyApply)[2];
// 		const sub = EmptyApply.TRANSFORMATIONS;
// 		const transObj = parseTransformations(sub, trans);
// 		const result = validator.validateTransformations(transObj);
// 		expect(result.error).to.equal(0);
// 	});
//
// 	it("AVG w/ non-numeric, invalid", function () {
// 		const trans = Object.keys(invAVGnotNumeric)[2];
// 		const sub = invAVGnotNumeric.TRANSFORMATIONS;
// 		const transObj = parseTransformations(sub, trans);
// 		const result = validator.validateTransformations(transObj);
// 		expect(result.error).to.equal(1);
// 	});
//
// 	it("Group-non array, invalid ", function () {
// 		const trans = Object.keys(invGroupnotArray)[2];
// 		const sub = invGroupnotArray.TRANSFORMATIONS;
// 		try {
// 			const transObj = parseTransformations(sub, trans);
// 			const result = validator.validateTransformations(transObj);
// 			expect(result.error).to.equal(1);
// 		} catch (e) {
// 			expect(e).to.be.instanceOf(InsightError);
// 		}
// 	});
// });

// describe("execWhere", function () {
// 	let queryGT30 = {
// 		WHERE: {
// 			GT: {
// 				test_avg: 30,
// 			},
// 		},
// 	};
// 	let queryAND = {
// 		WHERE: {
// 			AND: [
// 				{
// 					EQ: {
// 						test_year: 2015,
// 					},
// 				},
// 				{
// 					GT: {
// 						test_avg: 45,
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let queryCOMPLEX = {
// 		WHERE: {
// 			OR: [
// 				{
// 					AND: [
// 						{
// 							EQ: {
// 								test_year: 2020,
// 							},
// 						},
// 						{
// 							LT: {
// 								test_fail: 20,
// 							},
// 						},
// 					],
// 				},
// 				{
// 					IS: {
// 						test_id: "300",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let queryOR = {
// 		WHERE: {
// 			OR: [
// 				{
// 					GT: {
// 						test_fail: 19,
// 					},
// 				},
// 				{
// 					EQ: {
// 						test_dept: "biol",
// 					},
// 				},
// 			],
// 		},
// 	};
// 	let facade: InsightFacade;
// 	let dataset: Dataset;
// 	let sections: Section[];
// 	let sec1: Section;
// 	let sec2: Section;
// 	let sec3: Section;
// 	let sec4: Section;
// 	let sec5: Section;
// 	let collector: Collector;
//
// 	before(function () {
// 		clearDisk();
// 		facade = new InsightFacade();
// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 		dataset = new Dataset("test", 5, sections, InsightDatasetKind.Sections);
// 		collector = new Collector([dataset]);
// 		facade.aDataset(dataset);
// 	});
//
// 	it("executing WHERE branch (GT avg: 30)", function () {
// 		const subWhere = queryGT30.WHERE;
// 		const parsed = parseWhere(subWhere, "WHERE");
// 		const parsedWhere = parsed.getChilds()[0];
//
// 		// const result: any[] = collector.execWhere(parsedWhere);
// 		// expect(result).to.includes(sec1);
// 		// expect(result).to.includes(sec2);
// 		// expect(result).to.includes(sec3);
// 		// expect(result).to.includes(sec4);
// 		// expect(result).to.not.includes(sec5);
// 		// console.log(result);
// 	});
//
// 	it("executing WHERE branch (avg > 59 AND fail < 5", function () {
// 		const subWhere = queryAND.WHERE;
// 		const parsed = parseWhere(subWhere, "WHERE");
// 		const parsedWhere = parsed.getChilds()[0];
//
// 		// const result: any[] = collector.execWhere(parsedWhere);
// 		// expect(result).to.includes(sec3);
// 		// expect(result).to.includes(sec2);
// 		// expect(result).to.not.includes(sec1);
// 		// expect(result).to.not.includes(sec4);
// 		// expect(result).to.not.includes(sec5);
// 	});
//
// 	it("executing WHERE branch (fail > 19 OR dept = biol)", function () {
// 		const subWhere = queryOR.WHERE;
// 		const parsed = parseWhere(subWhere, "WHERE");
// 		const parsedWhere = parsed.getChilds()[0];
//
// 		// const result: any[] = collector.execWhere(parsedWhere);
// 		// expect(result).to.includes(sec3);
// 		// expect(result).to.includes(sec4);
// 		// expect(result).to.includes(sec5);
// 		// expect(result).to.not.includes(sec1);
// 		// expect(result).to.not.includes(sec2);
// 	});
//
// 	it("executing WHERE branch (COMPLEX)", function () {
// 		const subWhere = queryCOMPLEX.WHERE;
// 		const parsed = parseWhere(subWhere, "WHERE");
// 		const parsedWhere = parsed.getChilds()[0];
//
// 		// const result: any[] = collector.execWhere(parsedWhere);
// 		// console.log(result);
// 		// expect(result).to.includes(sec1);
// 		// expect(result).to.includes(sec5);
// 		// expect(result).to.not.includes(sec2);
// 		// expect(result).to.not.includes(sec3);
// 		// expect(result).to.not.includes(sec4);
// 	});
// });

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

describe("listDatasets Tests", async function () {
	let facade: InsightFacade;
	let sections: string;
	let campus: string;
	let qBasic: object;

	let initialDatasetCount: number;

	before(async function () {
		sections = getContentFromArchives("pair.zip");
		campus = getContentFromArchives("campus.zip");
		qBasic = {
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
	});

	beforeEach(async function () {
		clearDisk();
		facade = new InsightFacade();
	});

	it("should successfully add room dataset (first)", function () {
		const result = facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		return expect(result).to.eventually.have.members(["campus"]);
	});

	it("should reject with an empty dataset id", function () {
		const result = facade.addDataset("", campus, InsightDatasetKind.Rooms);
		return expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should reject with a whitespace id", function () {
		const result = facade.addDataset(" ", campus, InsightDatasetKind.Rooms);
		return expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should reject with a invalid Sections kind", function () {
		const result = facade.addDataset("campus", campus, InsightDatasetKind.Sections);
		return expect(result).to.eventually.be.rejectedWith(InsightError);
	});

	it("should not query after crash", async function () {
		this.timeout(10000);
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

// describe("performQueryORDER", function () {
// 	let sections: string;
// 	let alt: string;
// 	let facade: InsightFacade;
// 	let roomSet: Dataset;
// 	// let sections: Section[];
// 	let rooms: Room[];
// 	let dataset: Dataset;
// 	let dataset2: Dataset;
// 	let sec1: Section;
// 	let sec2: Section;
// 	let sec3: Section;
// 	let sec4: Section;
// 	let sec5: Section;
// 	let validator: Validator;
// 	let collector: Collector;
//
// 	before(async function () {
// 		clearDisk();
// 		sections = getContentFromArchives("pair.zip");
// 		alt = getContentFromArchives("basic.zip");
// 		facade = new InsightFacade();
//
// 		await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
// 		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 	});
//
// 	function errorValidator(error: any): error is Error {
// 		return error === "InsightError" || error === "ResultTooLargeError";
// 	}
//
// 	type PQErrorKind = "ResultTooLargeError" | "InsightError";
//
// 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 		"Dynamic InsightFacade PerformQuery tests Ordered",
// 		async (input) => await facade.performQuery(input),
// 		"./test/resources/queries",
// 		{
// 			assertOnResult: (actual, expected) => {
// 				assert.deepEqual(actual, expected);
// 			},
// 			errorValidator: (error): error is PQErrorKind =>
// 				error === "ResultTooLargeError" || error === "InsightError",
// 			assertOnError: (actual, expected) => {
// 				if (expected === "InsightError") {
// 					assert.instanceOf(actual, InsightError);
// 				} else {
// 					assert.instanceOf(actual, ResultTooLargeError);
// 				}
// 			},
// // <<<<<<< HEAD
// 		};
// 	// 	let invEmptyGroup = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: [],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let EmptyApply = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [],
// 	// 		},
// 	// 	};
// 	// 	let invAVGnotNumeric = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallDept: {
// 	// 						AVG: "sections_dept",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invEmptyApplyKey = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					"": {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invGroupnotArray = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: "sections_title",
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	// let transValid = {
// 	// 	// 	"WHERE": {},
// 	// 	// 	"OPTIONS": {
// 	// 	// 		"COLUMNS": ["sections_title", "overallAvg"]
// 	// 	// 	},
// 	// 	// 	"TRANSFORMATIONS": {
// 	// 	// 		"GROUP": ["sections_title"],
// 	// 	// 		"APPLY": [{
// 	// 	// 			"overallAvg": {
// 	// 	// 				"AVG": "sections_avg"
// 	// 	// 			}
// 	// 	// 		}]
// 	// 	// 	}
// 	// 	// };
// 	//
// 	// 	let sections: Section[];
// 	// 	let dataset: Dataset;
// 	// 	let sec1: Section;
// 	// 	let sec2: Section;
// 	// 	let sec3: Section;
// 	// 	let sec4: Section;
// 	// 	let sec5: Section;
// 	// 	let validator: Validator;
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 	// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 	// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 	// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 	// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 	// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 	// 		dataset = new Dataset("sections", 5, sections, InsightDatasetKind.Sections);
// 	// 		validator = new Validator([dataset]);
// 	// 	});
// 	//
// 	// 	it("should properly validate Transformations", function () {
// 	// 		const trans = Object.keys(transValid)[2];
// 	// 		const sub = transValid.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("EmptyGroup, Invalid", function () {
// 	// 		const trans = Object.keys(invEmptyGroup)[2];
// 	// 		const sub = invEmptyGroup.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("EmptyApply, ok", function () {
// 	// 		const trans = Object.keys(EmptyApply)[2];
// 	// 		const sub = EmptyApply.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("AVG w/ non-numeric, invalid", function () {
// 	// 		const trans = Object.keys(invAVGnotNumeric)[2];
// 	// 		const sub = invAVGnotNumeric.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("Group-non array, invalid ", function () {
// 	// 		const trans = Object.keys(invGroupnotArray)[2];
// 	// 		const sub = invGroupnotArray.TRANSFORMATIONS;
// 	// 		try {
// 	// 			const transObj = parseTransformations(sub, trans);
// 	// 			const result = validator.validateTransformations(transObj);
// 	// 			expect(result.error).to.equal(1);
// 	// 		} catch (e) {
// 	// 			expect(e).to.be.instanceOf(InsightError);
// 	// 		}
// 	// 	});
// 	// });
// 	//
// 	// describe("validateAll", function () {
// 	// 	let validBasic = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let validComplex = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					GT: {
// 	// 						sections_avg: 80,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_dept", "maxAvg"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxAvg"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_dept"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxAvg: {
// 	// 						MAX: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invalidMissingDirSort = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: "*Tables*",
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_seats: 300,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				keys: ["maxSeats"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["rooms_shortname"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invalidEmptyGroup = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: "*Tables*",
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_seats: 300,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxSeats"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: [],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invalidColNotInGroup = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: "*Tables*",
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_seats: 300,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_fullname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxSeats"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["rooms_shortname"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let validRooms = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: "*Tables*",
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_seats: 300,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxSeats"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["rooms_shortname"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invalidWrongKeyIS = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: 90,
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_seats: 300,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxSeats"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["rooms_shortname"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invalidKeyGT = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: "*Tables*",
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_fail: 90,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxSeats"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["rooms_shortname"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let valid2Keys = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					IS: {
// 	// 						rooms_furniture: "*Tables*",
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						rooms_seats: 300,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 			ORDER: {
// 	// 				dir: "DOWN",
// 	// 				keys: ["maxSeats", "rooms_shortname"],
// 	// 			},
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["rooms_shortname"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					maxSeats: {
// 	// 						MAX: "rooms_seats",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	//
// 	// 	let sections: Section[];
// 	// 	let dataset: Dataset;
// 	// 	let dataset2: Dataset;
// 	// 	let sec1: Section;
// 	// 	let sec2: Section;
// 	// 	let sec3: Section;
// 	// 	let sec4: Section;
// 	// 	let sec5: Section;
// 	// 	let validator: Validator;
// 	// 	let facade: InsightFacade;
// 	// 	let collector: Collector;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		// generated by chatGPT
// 	// 		const rooms: Room[] = [
// 	// 			new Room(
// 	// 				"DMP_110",
// 	// 				"DMP",
// 	// 				"110",
// 	// 				"DMP 110",
// 	// 				"123 Main St",
// 	// 				49.123,
// 	// 				-123.456,
// 	// 				400,
// 	// 				"Lecture Hall",
// 	// 				"Tables",
// 	// 				"https://example.com/room/110"
// 	// 			),
// 	// 			new Room(
// 	// 				"LSK_201",
// 	// 				"LSK",
// 	// 				"201",
// 	// 				"LSK 201",
// 	// 				"456 Elm St",
// 	// 				49.789,
// 	// 				-123.789,
// 	// 				350,
// 	// 				"Lecture Hall",
// 	// 				"Tables",
// 	// 				"https://example.com/room/201"
// 	// 			),
// 	// 			new Room(
// 	// 				"EOSB_101",
// 	// 				"EOSB",
// 	// 				"101",
// 	// 				"EOSB 101",
// 	// 				"789 Oak St",
// 	// 				49.456,
// 	// 				-123.123,
// 	// 				360,
// 	// 				"Lecture Hall",
// 	// 				"Tables",
// 	// 				"https://example.com/room/101"
// 	// 			),
// 	// 			new Room(
// 	// 				"WOOD_301",
// 	// 				"WOOD",
// 	// 				"301",
// 	// 				"WOOD 301",
// 	// 				"321 Pine St",
// 	// 				49.987,
// 	// 				-123.987,
// 	// 				120,
// 	// 				"Classroom",
// 	// 				"Chair",
// 	// 				"https://example.com/room/301"
// 	// 			),
// 	// 			new Room(
// 	// 				"ICICS_005",
// 	// 				"ICICS",
// 	// 				"005",
// 	// 				"ICICS 005",
// 	// 				"555 Cedar St",
// 	// 				49.654,
// 	// 				-123.654,
// 	// 				30,
// 	// 				"Laboratory",
// 	// 				"Chair",
// 	// 				"https://example.com/room/005"
// 	// 			),
// 	// 			new Room(
// 	// 				"ANGU_202",
// 	// 				"ANGU",
// 	// 				"202",
// 	// 				"ANGU 202",
// 	// 				"222 Birch St",
// 	// 				49.234,
// 	// 				-123.234,
// 	// 				90,
// 	// 				"Classroom",
// 	// 				"Chair",
// 	// 				"https://example.com/room/202"
// 	// 			),
// 	// 			new Room(
// 	// 				"CHEM_401",
// 	// 				"CHEM",
// 	// 				"401",
// 	// 				"CHEM 401",
// 	// 				"456 Redwood St",
// 	// 				49.555,
// 	// 				-123.555,
// 	// 				55,
// 	// 				"Laboratory",
// 	// 				"Desk-Chair",
// 	// 				"https://example.com/room/401"
// 	// 			),
// 	// 			new Room(
// 	// 				"PHYS_301",
// 	// 				"PHYS",
// 	// 				"301",
// 	// 				"PHYS 301",
// 	// 				"123 Sequoia St",
// 	// 				49.888,
// 	// 				-123.888,
// 	// 				55,
// 	// 				"Classroom",
// 	// 				"Desk-Chair",
// 	// 				"https://example.com/room/301"
// 	// 			),
// 	// 			new Room(
// 	// 				"MATH_110",
// 	// 				"MATH",
// 	// 				"110",
// 	// 				"MATH 110",
// 	// 				"987 Walnut St",
// 	// 				49.345,
// 	// 				-123.345,
// 	// 				55,
// 	// 				"Classroom",
// 	// 				"Desk-Chair",
// 	// 				"https://example.com/room/110"
// 	// 			),
// 	// 			new Room(
// 	// 				"LSC_150",
// 	// 				"LSC",
// 	// 				"150",
// 	// 				"LSC 150",
// 	// 				"111 Maple St",
// 	// 				49.111,
// 	// 				-123.111,
// 	// 				55,
// 	// 				"Classroom",
// 	// 				"Desk-Chair",
// 	// 				"https://example.com/room/150"
// 	// 			),
// 	// 		];
// 	// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 	// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 	// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 	// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 	// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 	// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 	// 		dataset = new Dataset("sections", 5, sections, InsightDatasetKind.Sections);
// 	// 		dataset2 = new Dataset("rooms", 10, rooms, InsightDatasetKind.Rooms);
// 	// 		validator = new Validator([dataset, dataset2]);
// 	// 		collector = new Collector([dataset, dataset2]);
// 	// 		facade.aDataset(dataset);
// 	// 		facade.aDataset(dataset2);
// 	// 	});
// 	//
// 	// 	it("should properly validate All", function () {
// 	// 		const where = Object.keys(validBasic)[0];
// 	// 		const opts = Object.keys(validBasic)[1];
// 	// 		const trans = Object.keys(validBasic)[2];
// 	// 		const subW = validBasic.WHERE;
// 	// 		const subO = validBasic.OPTIONS;
// 	// 		const subT = validBasic.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(subT, trans);
// 	// 		const whereObj = parseWhereRefactored(subW, where);
// 	// 		const optsObj = parseOptionsRefactored(subO, opts);
// 	// 		const result3 = validator.validateTransformations(transObj);
// 	// 		const result1 = validator.validateWhereRefactored(whereObj);
// 	// 		const result2 = validator.validateOptionsRefactored(optsObj);
// 	// 		expect(result1.error).to.equal(0);
// 	// 		expect(result3.error).to.equal(0);
// 	// 		expect(result2.error).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("validate ALL Complex", function () {
// 	// 		const trans = Object.keys(validComplex)[2];
// 	// 		const subT = validComplex.TRANSFORMATIONS;
// 	// 		const where = Object.keys(validComplex)[0];
// 	// 		const subW = validComplex.WHERE;
// 	// 		const opts = Object.keys(validComplex)[1];
// 	// 		const subO = validComplex.OPTIONS;
// 	// 		const transObj = parseTransformations(subT, trans);
// 	// 		const whereObj = parseWhereRefactored(subW, where);
// 	// 		const optsObj = parseOptionsRefactored(subO, opts);
// 	// 		const result3 = validator.validateTransformations(transObj);
// 	// 		const result1 = validator.validateWhereRefactored(whereObj);
// 	// 		const result2 = validator.validateOptionsRefactored(optsObj);
// 	// 		expect(result1.error).to.equal(0);
// 	// 		expect(result3.error).to.equal(0);
// 	// 		expect(result2.error).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("invalid MissingDir", function () {
// 	// 		const trans = Object.keys(invalidMissingDirSort)[2];
// 	// 		const subT = invalidMissingDirSort.TRANSFORMATIONS;
// 	// 		const where = Object.keys(invalidMissingDirSort)[0];
// 	// 		const subW = invalidMissingDirSort.WHERE;
// 	// 		const opts = Object.keys(invalidMissingDirSort)[1];
// 	// 		const subO = invalidMissingDirSort.OPTIONS;
// 	// 		const transObj = parseTransformations(subT, trans);
// 	// 		const whereObj = parseWhereRefactored(subW, where);
// 	// 		const optsObj = parseOptionsRefactored(subO, opts);
// 	// 		const result3 = validator.validateTransformations(transObj);
// 	// 		const result1 = validator.validateWhereRefactored(whereObj);
// 	// 		const result2 = validator.validateOptionsRefactored(optsObj);
// 	// 		expect(result1.error).to.equal(0);
// 	// 		expect(result3.error).to.equal(0);
// 	// 		expect(result2.error).to.equal(1);
// 	// 		console.log(result2.msg);
// 	// 	});
// 	//
// 	// 	it("valid", async function () {
// 	// 		const results = await facade.performQuery(validRooms);
// 	// 		expect(results).to.be.length(3);
// 	// 	});
// 	//
// 	// 	it("invalid", async function () {
// 	// 		const results = facade.performQuery(invalidWrongKeyIS);
// 	// 		expect(results).to.be.eventually.rejectedWith(InsightError);
// 	// 	});
// 	//
// 	// 	it("invalid2", async function () {
// 	// 		const results = facade.performQuery(invalidKeyGT);
// 	// 		expect(results).to.be.eventually.rejectedWith(InsightError);
// 	// 	});
// 	//
// 	// 	// it("valid2", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats", "rooms_shortname"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// });
// 	// 	//
// 	// 	// it("valid2", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats", "rooms_shortname"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// });
// 	//
// 	// 	// it("valid2", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats", "rooms_shortname"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// });
// 	//
// 	// 	// it("validRoomsbasic", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_shortname: "*S*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 50,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: [
// 	// 	// 				"rooms_shortname",
// 	// 	// 				"rooms_fullname",
// 	// 	// 				"rooms_seats",
// 	// 	// 				"rooms_number",
// 	// 	// 				"rooms_lon",
// 	// 	// 				"rooms_lat",
// 	// 	// 				"rooms_furniture",
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// 	return expect(results).to.be.length(3);
// 	// 	// });
// 	//
// 	// 	// it("valid2", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats", "rooms_shortname"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// });
// 	// 	//
// 	// 	// it("discTest", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "rooms_fullname", "rooms_seats"],
// 	// 	// 			ORDER: "rooms_shortname",
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// });
// 	// 	//
// 	// 	// it("latlon testing", async function () {
// 	// 	// 	let valid2Keys = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_type", "maxSeats", "minLon", "maxLon", "minLat", "maxLat"],
// 	// 	// 			ORDER: {
// 	// 	// 				keys: ["maxSeats"],
// 	// 	// 				dir: "DOWN",
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_type"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					minLon: {
// 	// 	// 						MIN: "rooms_lon",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					maxLat: {
// 	// 	// 						MAX: "rooms_lat",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					maxLon: {
// 	// 	// 						MAX: "rooms_lon",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					minLat: {
// 	// 	// 						MIN: "rooms_lat",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(valid2Keys);
// 	// 	// 	console.log(results);
// 	// 	// 	return expect(results).to.be.length(3);
// 	// 	// });
// 	// 	//
// 	// 	// it("invalidAllorderKeys must be in COL", async function () {
// 	// 	// 	let query = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats", "maxS"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = facade.performQuery(query);
// 	// 	// 	return expect(results).to.be.eventually.rejectedWith(InsightError);
// 	// 	// });
// 	// 	//
// 	// 	// it("Order Keys empty", async function () {
// 	// 	// 	let query = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: [],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = facade.performQuery(query);
// 	// 	// 	return expect(results).to.be.eventually.rejectedWith(InsightError);
// 	// 	// });
// 	// 	//
// 	// 	// it("Invalid key rooms_avg in AVG", async function () {
// 	// 	// 	let query = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["rooms_shortname", "maxSeats"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: ["rooms_shortname"],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					avgFail: {AVG: "rooms_avg"},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = facade.performQuery(query);
// 	// 	// 	return expect(results).to.be.eventually.rejectedWith(InsightError);
// 	// 	// });
// 	// 	//
// 	// 	// it("only apply keys used", async function () {
// 	// 	// 	let query = {
// 	// 	// 		WHERE: {
// 	// 	// 			AND: [
// 	// 	// 				{
// 	// 	// 					IS: {
// 	// 	// 						rooms_furniture: "*Tables*",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					GT: {
// 	// 	// 						rooms_seats: 300,
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 		OPTIONS: {
// 	// 	// 			COLUMNS: ["maxSeats", "count"],
// 	// 	// 			ORDER: {
// 	// 	// 				dir: "DOWN",
// 	// 	// 				keys: ["maxSeats", "count"],
// 	// 	// 			},
// 	// 	// 		},
// 	// 	// 		TRANSFORMATIONS: {
// 	// 	// 			GROUP: [
// 	// 	// 				"rooms_shortname",
// 	// 	// 				"rooms_shortname",
// 	// 	// 				"rooms_fullname",
// 	// 	// 				"rooms_lat",
// 	// 	// 				"rooms_lon",
// 	// 	// 				"rooms_seats",
// 	// 	// 			],
// 	// 	// 			APPLY: [
// 	// 	// 				{
// 	// 	// 					maxSeats: {
// 	// 	// 						MAX: "rooms_seats",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 				{
// 	// 	// 					count: {
// 	// 	// 						COUNT: "rooms_fullname",
// 	// 	// 					},
// 	// 	// 				},
// 	// 	// 			],
// 	// 	// 		},
// 	// 	// 	};
// 	// 	// 	const results = await facade.performQuery(query);
// 	// 	// 	console.log(results);
// 	// 	// 	return expect(results).to.be.length(3);
// 	// 	// });
// 	// });
//
// 	// describe("validateWhere (refactored)", function () {
// 	// 	let transValid = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invEmptyGroup = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: [],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let EmptyApply = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [],
// 	// 		},
// 	// 	};
// 	// 	let invAVGnotNumeric = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallDept: {
// 	// 						AVG: "sections_dept",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invEmptyApplyKey = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: ["sections_title"],
// 	// 			APPLY: [
// 	// 				{
// 	// 					"": {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let invGroupnotArray = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_title", "overallAvg"],
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: "sections_title",
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "sections_avg",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	// let transValid = {
// 	// 	// 	"WHERE": {},
// 	// 	// 	"OPTIONS": {
// 	// 	// 		"COLUMNS": ["sections_title", "overallAvg"]
// 	// 	// 	},
// 	// 	// 	"TRANSFORMATIONS": {
// 	// 	// 		"GROUP": ["sections_title"],
// 	// 	// 		"APPLY": [{
// 	// 	// 			"overallAvg": {
// 	// 	// 				"AVG": "sections_avg"
// 	// 	// 			}
// 	// 	// 		}]
// 	// 	// 	}
// 	// 	// };
// 	//
// 	// 	let sections: Section[];
// 	// 	let dataset: Dataset;
// 	// 	let sec1: Section;
// 	// 	let sec2: Section;
// 	// 	let sec3: Section;
// 	// 	let sec4: Section;
// 	// 	let sec5: Section;
// 	// 	let validator: Validator;
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 	// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 	// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 	// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 	// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 	// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 	// 		dataset = new Dataset("sections", 5, sections, InsightDatasetKind.Sections);
// 	// 		validator = new Validator([dataset]);
// 	// 	});
// 	//
// 	// 	it("should properly validate Transformations", function () {
// 	// 		const trans = Object.keys(transValid)[2];
// 	// 		const sub = transValid.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("EmptyGroup, Invalid", function () {
// 	// 		const trans = Object.keys(invEmptyGroup)[2];
// 	// 		const sub = invEmptyGroup.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("EmptyApply, ok", function () {
// 	// 		const trans = Object.keys(EmptyApply)[2];
// 	// 		const sub = EmptyApply.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("AVG w/ non-numeric, invalid", function () {
// 	// 		const trans = Object.keys(invAVGnotNumeric)[2];
// 	// 		const sub = invAVGnotNumeric.TRANSFORMATIONS;
// 	// 		const transObj = parseTransformations(sub, trans);
// 	// 		const result = validator.validateTransformations(transObj);
// 	// 		expect(result.error).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("Group-non array, invalid ", function () {
// 	// 		const trans = Object.keys(invGroupnotArray)[2];
// 	// 		const sub = invGroupnotArray.TRANSFORMATIONS;
// 	// 		try {
// 	// 			const transObj = parseTransformations(sub, trans);
// 	// 			const result = validator.validateTransformations(transObj);
// 	// 			expect(result.error).to.equal(1);
// 	// 		} catch (e) {
// 	// 			expect(e).to.be.instanceOf(InsightError);
// 	// 		}
// 	// 	});
// 	// });
//
// 	// describe("execWhere", function () {
// 	// 	let queryGT30 = {
// 	// 		WHERE: {
// 	// 			GT: {
// 	// 				test_avg: 30,
// 	// 			},
// 	// 		},
// 	// 	};
// 	// 	let queryAND = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					EQ: {
// 	// 						test_year: 2015,
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						test_avg: 45,
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let queryCOMPLEX = {
// 	// 		WHERE: {
// 	// 			OR: [
// 	// 				{
// 	// 					AND: [
// 	// 						{
// 	// 							EQ: {
// 	// 								test_year: 2020,
// 	// 							},
// 	// 						},
// 	// 						{
// 	// 							LT: {
// 	// 								test_fail: 20,
// 	// 							},
// 	// 						},
// 	// 					],
// 	// 				},
// 	// 				{
// 	// 					IS: {
// 	// 						test_id: "300",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let queryOR = {
// 	// 		WHERE: {
// 	// 			OR: [
// 	// 				{
// 	// 					GT: {
// 	// 						test_fail: 19,
// 	// 					},
// 	// 				},
// 	// 				{
// 	// 					EQ: {
// 	// 						test_dept: "biol",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 	};
// 	// 	let facade: InsightFacade;
// 	// 	let dataset: Dataset;
// 	// 	let sections: Section[];
// 	// 	let sec1: Section;
// 	// 	let sec2: Section;
// 	// 	let sec3: Section;
// 	// 	let sec4: Section;
// 	// 	let sec5: Section;
// 	// 	let collector: Collector;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 	// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 	// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 	// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 	// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 	// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 	// 		dataset = new Dataset("test", 5, sections, InsightDatasetKind.Sections);
// 	// 		collector = new Collector([dataset]);
// 	// 		facade.aDataset(dataset);
// 	// 	});
// 	//
// 	// 	it("executing WHERE branch (GT avg: 30)", function () {
// 	// 		const subWhere = queryGT30.WHERE;
// 	// 		const parsed = parseWhere(subWhere, "WHERE");
// 	// 		const parsedWhere = parsed.getChilds()[0];
// 	//
// 	// 		// const result: any[] = collector.execWhere(parsedWhere);
// 	// 		// expect(result).to.includes(sec1);
// 	// 		// expect(result).to.includes(sec2);
// 	// 		// expect(result).to.includes(sec3);
// 	// 		// expect(result).to.includes(sec4);
// 	// 		// expect(result).to.not.includes(sec5);
// 	// 		// console.log(result);
// 	// 	});
// 	//
// 	// 	it("executing WHERE branch (avg > 59 AND fail < 5", function () {
// 	// 		const subWhere = queryAND.WHERE;
// 	// 		const parsed = parseWhere(subWhere, "WHERE");
// 	// 		const parsedWhere = parsed.getChilds()[0];
// 	//
// 	// 		// const result: any[] = collector.execWhere(parsedWhere);
// 	// 		// expect(result).to.includes(sec3);
// 	// 		// expect(result).to.includes(sec2);
// 	// 		// expect(result).to.not.includes(sec1);
// 	// 		// expect(result).to.not.includes(sec4);
// 	// 		// expect(result).to.not.includes(sec5);
// 	// 	});
// 	//
// 	// 	it("executing WHERE branch (fail > 19 OR dept = biol)", function () {
// 	// 		const subWhere = queryOR.WHERE;
// 	// 		const parsed = parseWhere(subWhere, "WHERE");
// 	// 		const parsedWhere = parsed.getChilds()[0];
// 	//
// 	// 		// const result: any[] = collector.execWhere(parsedWhere);
// 	// 		// expect(result).to.includes(sec3);
// 	// 		// expect(result).to.includes(sec4);
// 	// 		// expect(result).to.includes(sec5);
// 	// 		// expect(result).to.not.includes(sec1);
// 	// 		// expect(result).to.not.includes(sec2);
// 	// 	});
// 	//
// 	// 	it("executing WHERE branch (COMPLEX)", function () {
// 	// 		const subWhere = queryCOMPLEX.WHERE;
// 	// 		const parsed = parseWhere(subWhere, "WHERE");
// 	// 		const parsedWhere = parsed.getChilds()[0];
// 	//
// 	// 		// const result: any[] = collector.execWhere(parsedWhere);
// 	// 		// console.log(result);
// 	// 		// expect(result).to.includes(sec1);
// 	// 		// expect(result).to.includes(sec5);
// 	// 		// expect(result).to.not.includes(sec2);
// 	// 		// expect(result).to.not.includes(sec3);
// 	// 		// expect(result).to.not.includes(sec4);
// 	// 	});
// 	// });
//
// 	describe("performQueryFINAL", function () {
// 		let facade: InsightFacade;
// 		let qBasic = {
// 			WHERE: {
// 				GT: {
// 					ubc_avg: 97,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let qComplex = {
// 			WHERE: {
// 				OR: [
// 					{
// 						AND: [
// 							{
// 								GT: {
// 									ubc_avg: 90,
// 								},
// 							},
// 							{
// 								IS: {
// 									ubc_dept: "adhe",
// 								},
// 							},
// 						],
// 					},
// 					{
// 						EQ: {
// 							ubc_avg: 95,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let qBasicNoComparator = {
// 			WHERE: {},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let wc = {
// 			WHERE: {
// 				IS: {
// 					ubc_dept: "*asc*",
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let allComp = {
// 			WHERE: {
// 				OR: [
// 					{
// 						AND: [
// 							{
// 								GT: {
// 									ubc_avg: 50,
// 								},
// 							},
// 							{
// 								LT: {
// 									ubc_avg: 90,
// 								},
// 							},
// 							{
// 								EQ: {
// 									ubc_avg: 85,
// 								},
// 							},
// 							{
// 								IS: {
// 									ubc_dept: "*c",
// 								},
// 							},
// 						],
// 					},
// 					{
// 						NOT: {
// 							GT: {
// 								ubc_avg: 1,
// 							},
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let yr1900 = {
// 			WHERE: {
// 				EQ: {
// 					ubc_year: 1900,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let noWHERE = {
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let noCOL: {
// 			WHERE: {
// 				GT: {
// 					ubc_avg: 97;
// 				};
// 			};
// 			OPTIONS: {
// 				ORDER: "ubc_avg";
// 			};
// 		};
// 		let stackedNotsOr = {
// 			WHERE: {
// 				NOT: {
// 					OR: [
// 						{
// 							NOT: {
// 								LT: {
// 									ubc_avg: 60,
// 								},
// 							},
// 						},
// 						{
// 							NOT: {
// 								IS: {
// 									ubc_dept: "biol",
// 								},
// 							},
// 						},
// 					],
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 			},
// 		};
// 		let lotsofnots = {
// 			WHERE: {
// 				NOT: {
// 					OR: [
// 						{
// 							NOT: {
// 								EQ: {
// 									ubc_avg: 95,
// 								},
// 							},
// 						},
// 						{
// 							NOT: {
// 								IS: {
// 									ubc_dept: "b*",
// 								},
// 							},
// 						},
// 					],
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 			},
// 		};
// 		let invalid2Diffkeys = {
// 			WHERE: {
// 				GT: {
// 					sections_avg: 97,
// 					sections_fail: 99,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
// 		let valid2Order = {
// 			WHERE: {
// 				GT: {
// 					ubc_avg: 97,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let invalid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							sections_dept: "c*",
// 						},
// 						GT: {
// 							sections_avg: 97,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
// 		let pair: string;
//
// 		beforeEach(async function () {
// 			clearDisk();
// 			facade = new InsightFacade();
//
// 			pair = getContentFromArchives("pair.zip");
// 			await facade.addDataset("ubc", pair, InsightDatasetKind.Sections);
// 		});
//
// 		it("should execQuery (basic)", function () {
// 			const result = facade.performQuery(qBasic);
// 			expect(result).to.eventually.be.length(48);
// 		});
//
// 		it("should execQuery (complex)", function () {
// 			const result = facade.performQuery(qComplex);
// 			expect(result).to.eventually.be.length(50);
// 		});
//
// 		it("should execQuery (NO COMPARATOR)", function () {
// 			const result = facade.performQuery(qBasicNoComparator);
// 			expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 		});
//
// 		it("should execQuery (wildcard contains)", function () {
// 			const result = facade.performQuery(wc);
// 			// expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 		});
//
// 		it("should fail with too large", function () {
// 			const result = facade.performQuery(yr1900);
// 			expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 		});
//
// 		it("should fail missing where", function () {
// 			const result = facade.performQuery(noWHERE);
// 			expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail missing col", function () {
// 			const result = facade.performQuery(noCOL);
// 			expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should return w size 8", function () {
// 			const result = facade.performQuery(stackedNotsOr);
// 			expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should return correctly", function () {
// 			const result = facade.performQuery(lotsofnots);
// 			expect(result).to.eventually.be.length(2);
// 		});
//
// 		it("should return correctly", function () {
// 			const result = facade.performQuery(valid2Order);
// 			expect(result).to.eventually.be.length(2);
// 		});
//
// 		it("should return correctly", function () {
// 			const result = facade.performQuery(valid2Order);
// 			expect(result).to.eventually.be.length(2);
// 		});
// 	});
//
describe("performQueryORDER", function () {
	// performQueryOrderKeep
	let sections: string;
	let alt: string;
	let facade: InsightFacade;
	let rooms: string;

	before(async function () {
		clearDisk();
		sections = getContentFromArchives("pair.zip");
		alt = getContentFromArchives("basic.zip");
		rooms = getContentFromArchives("campus.zip");
		facade = new InsightFacade();
		await facade.initialize();
		await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
	});

	function errorValidator(error: any): error is Error {
		return error === "InsightError" || error === "ResultTooLargeError";
	}

	type PQErrorKind = "ResultTooLargeError" | "InsightError";

	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
		"Dynamic InsightFacade PerformQuery tests Ordered",
		(input) => facade.performQuery(input),
		"./test/resources/queries",
		{
			assertOnResult: (actual, expected) => {
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

// // describe("Test Suite", function () {
// // 	describe("addDataset Tests", function () {
// // 		let sections: string;
// // 		let facade: InsightFacade;
// //
// // 		before(function () {
// // 			sections = getContentFromArchives("pair.zip");
// // 		});
// //
// // 		beforeEach(function () {
// // 			clearDisk();
// // 			facade = new InsightFacade();
// // 		});
// //
// // 		it("should pass with valid arguments", async function () {
// // 			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			expect(result).to.have.members(["ubc"]);
// // 		});
// //
// // 		it("should reject with null id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset(null as any, sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with undefined id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset(undefined as any, sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with non-string id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset(999 as any, sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with an empty dataset id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset("", sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with whitespace in dataset id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset("a ", sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with underscore dataset id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset("a_", sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should successfully add two datasets with different ids", async function () {
// // 			await facade.addDataset("ubc1", sections, InsightDatasetKind.Sections);
// // 			const result = await facade.addDataset("ubc2", sections, InsightDatasetKind.Sections);
// // 			expect(result).to.have.members(["ubc1", "ubc2"]);
// // 		});
// //
// // 		it("should reject when adding a dataset with a duplicate id", async function () {
// // 			let errorWasThrown = false;
// // 			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			try {
// // 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with non-zip base 64 string", async function () {
// // 			let errorWasThrown = false;
// // 			let textFile: string = getContentFromArchives("test.txt");
// // 			try {
// // 				await facade.addDataset("ubc", textFile, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with no valid sections in dataset", async function () {
// // 			let errorWasThrown = false;
// // 			let invalidDataset: string = getContentFromArchives("invalidDataset.zip");
// // 			try {
// // 				await facade.addDataset("ubc", invalidDataset, InsightDatasetKind.Sections);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should resolve with valid and invalid sections in dataset", async function () {
// // 			let mixedDataset: string = getContentFromArchives("mixedDataset.zip");
// // 			const result = await facade.addDataset("ubc", mixedDataset, InsightDatasetKind.Sections);
// // 			expect(result).to.have.members(["ubc"]);
// // 		});
// //
// // 		it("should reject with rooms kind", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// // 	});
// //
// // 	describe("removeDataset Tests", function () {
// // 		let sections: string;
// // 		let facade: InsightFacade;
// //
// // 		before(function () {
// // 			sections = getContentFromArchives("pair.zip");
// // 		});
// //
// // 		beforeEach(function () {
// // 			clearDisk();
// // 			facade = new InsightFacade();
// // 		});
// //
// // 		it("should successfully remove a dataset after adding it", async function () {
// // 			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			const result = await facade.removeDataset("ubc");
// // 			expect(result).to.equal("ubc");
// // 		});
// //
// // 		it("should reject when removing a dataset that hasn't been added", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset("dne");
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(NotFoundError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with undefined id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset(undefined as any);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with null id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset(null as any);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject with non-string id", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset(999 as any);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject when removing a dataset with an id containing an underscore", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset("a_");
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject when removing a dataset with an id that has whitespace", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset("a ");
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject when removing a dataset with an id that is empty", async function () {
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.removeDataset("");
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// //
// // 		it("should reject when trying to remove a dataset twice", async function () {
// // 			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			await facade.removeDataset("ubc");
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.removeDataset("ubc");
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(NotFoundError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected the second removeDataset to throw an error, but it did not. :(");
// // 			}
// // 		});
// //
// // 		it("should successfully remove same id after adding id and removing", async function () {
// // 			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			await facade.removeDataset("ubc");
// // 			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// // 			const result = await facade.removeDataset("ubc");
// // 			expect(result).to.equal("ubc");
// // 		});
// //
// // 		it("should successfully remove same id after adding id and removing", async function () {
// // 			const query = {
// // 				WHERE: {
// // 					IS: {
// // 						sections_dept: "xyz",
// // 					},
// // 				},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept", "sections_avg"],
// // 				},
// // 			};
// //
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.addDataset("xyz", sections, InsightDatasetKind.Sections);
// // 				await facade.removeDataset("xyz");
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// // 			expect(errorWasThrown).to.be.true;
// // 		});
// // 	});
// //
// // 	describe("Rooms Kind", function () {
// // 		let campus: string;
// // 		let facade: InsightFacade;
// //
// // 		before(function () {
// // <<<<<<< HEAD
// // 			campus = getContentFromArchives("basic.zip");
// // =======
// // 			sections = getContentFromArchives("pair.zip");
// // 			facade = new InsightFacade();
// // 			facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// // 		});
// //
// // 		beforeEach(function () {
// // 			//	clearDisk();
// // 		});
// //
// // 		it("should reject query that is string", async function () {
// // 			const query: string =
// // 				'{"WHERE": {"GT": {"sections_avg": 97 }},' +
// // 				'"OPTIONS": { "COLUMNS": ["sections_dept", "sections_avg"],"ORDER": "sections_avg"}}';
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error but, but it did not :(");
// // 			}
// // 		});
// //
// // 		// it("should reject query with empty WHERE", async function () {
// // 		// 	const query = {
// // 		// 		"": {GT: {sections_avg: 97}},
// // 		// 		OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// // 		// 	};
// // 		// 	let errorWasThrown = false;
// // 		// 	try {
// // 		// 		await facade.performQuery(query);
// // 		// 	} catch (error) {
// // 		// 		errorWasThrown = true;
// // 		// 		expect(error).to.be.instanceOf(InsightError);
// // 		// 	}
// // 		// 	if (!errorWasThrown) {
// // 		// 		throw new Error("Expected performQuery to throw error but, but it did not :(");
// // 		// 	}
// // 		// });
// //
// // 		it("should reject query with no WHERE", async function () {
// // 			const query = {
// // 				A: {GT: {sections_avg: 97}},
// // 				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// // 			};
// //
// // 			let errorWasThrown = false;
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw an error, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query with no OPTIONS", async function () {
// // 			const query = {WHERE: {GT: {sections_avg: 97}}};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw an error, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query typo COLUMN", async function () {
// // 			const query = {
// // 				WHERE: {GT: {sections_avg: 97}},
// // 				OPTIONS: {COLUMS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw an error, but it did not.");
// // 			}
// // 		});
// //
// // 		it("should reject query idstring not datasetID", async function () {
// // 			const query = {
// // 				WHERE: {GT: {xxx_avg: 97}},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
// // 					ORDER: "sections_pass",
// // 				},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error but, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query empty FILTER list", async function () {
// // 			const query = {
// // 				WHERE: {OR: {}},
// // 				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error but, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query empty KEY list", async function () {
// // 			const query = {WHERE: {OR: {}}, OPTIONS: {COLUMNS: []}};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query idsting with _", async function () {
// // 			const query = {
// // 				WHERE: {GT: {section_s_avg: 97}},
// // 				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query ORDER key must be in COLUMNS", async function () {
// // 			const query = {
// // 				WHERE: {GT: {sections_avg: 97}},
// // 				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_pass"},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject query input string with *", async function () {
// // 			const query = {
// // 				WHERE: {GT: {"sections*_avg": 97}},
// // 				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw error, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should resolve *input string*", async function () {
// // 			const query = {
// // 				WHERE: {IS: {sections_dept: "*hin*"}},
// // 				OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// // 			};
// //
// // 			try {
// // 				const result = await facade.performQuery(query);
// // 				expect(result).to.have.lengthOf(990);
// // 			} catch (error) {
// // 				console.log(error);
// // 				throw new Error("Expected performQuery to resolve successfully, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should resolve with 2 FILTERS", async function () {
// // 			const query = {
// // 				WHERE: {
// // 					AND: [
// // 						{
// // 							IS: {
// // 								sections_dept: "*japn*",
// // 							},
// // 						},
// // 						{
// // 							IS: {
// // 								sections_dept: "*japn*",
// // 							},
// // 						},
// // 					],
// // 				},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
// // 					ORDER: "sections_pass",
// // 				},
// // 			};
// //
// // 			try {
// // 				const result = await facade.performQuery(query);
// // 				expect(result).to.have.lengthOf(966);
// // 			} catch (error) {
// // 				throw new Error("Expected performQuery to resolve successfully, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should reject as >5000 results", async function () {
// // 			const query = {
// // 				WHERE: {},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept"],
// // 				},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				console.log(error);
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(ResultTooLargeError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw ResultTooLargeError, but it did not :(");
// // 			}
// // 		});
// //
// // 		it("should return correct results for a simple query", async function () {
// // 			const query = {
// // 				WHERE: {
// // 					GT: {
// // 						sections_avg: 97,
// // 					},
// // 				},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept", "sections_avg"],
// // 					ORDER: "sections_avg",
// // 				},
// // 			};
// // 			const expected: InsightResult[] = [
// // 				{sections_dept: "math", sections_avg: 97.09},
// //
// // 				{sections_dept: "math", sections_avg: 97.09},
// //
// // 				{sections_dept: "epse", sections_avg: 97.09},
// //
// // 				{sections_dept: "epse", sections_avg: 97.09},
// //
// // 				{sections_dept: "math", sections_avg: 97.25},
// //
// // 				{sections_dept: "math", sections_avg: 97.25},
// //
// // 				{sections_dept: "epse", sections_avg: 97.29},
// //
// // 				{sections_dept: "epse", sections_avg: 97.29},
// //
// // 				{sections_dept: "nurs", sections_avg: 97.33},
// //
// // 				{sections_dept: "nurs", sections_avg: 97.33},
// //
// // 				{sections_dept: "epse", sections_avg: 97.41},
// //
// // 				{sections_dept: "epse", sections_avg: 97.41},
// //
// // 				{sections_dept: "cnps", sections_avg: 97.47},
// //
// // 				{sections_dept: "cnps", sections_avg: 97.47},
// //
// // 				{sections_dept: "math", sections_avg: 97.48},
// //
// // 				{sections_dept: "math", sections_avg: 97.48},
// //
// // 				{sections_dept: "educ", sections_avg: 97.5},
// //
// // 				{sections_dept: "nurs", sections_avg: 97.53},
// //
// // 				{sections_dept: "nurs", sections_avg: 97.53},
// //
// // 				{sections_dept: "epse", sections_avg: 97.67},
// //
// // 				{sections_dept: "epse", sections_avg: 97.69},
// //
// // 				{sections_dept: "epse", sections_avg: 97.78},
// //
// // 				{sections_dept: "crwr", sections_avg: 98},
// //
// // 				{sections_dept: "crwr", sections_avg: 98},
// //
// // 				{sections_dept: "epse", sections_avg: 98.08},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.21},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.21},
// //
// // 				{sections_dept: "epse", sections_avg: 98.36},
// //
// // 				{sections_dept: "epse", sections_avg: 98.45},
// //
// // 				{sections_dept: "epse", sections_avg: 98.45},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.5},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.5},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.58},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.58},
// //
// // 				{sections_dept: "epse", sections_avg: 98.58},
// //
// // 				{sections_dept: "epse", sections_avg: 98.58},
// //
// // 				{sections_dept: "epse", sections_avg: 98.7},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.71},
// //
// // 				{sections_dept: "nurs", sections_avg: 98.71},
// //
// // 				{sections_dept: "eece", sections_avg: 98.75},
// //
// // 				{sections_dept: "eece", sections_avg: 98.75},
// //
// // 				{sections_dept: "epse", sections_avg: 98.76},
// //
// // 				{sections_dept: "epse", sections_avg: 98.76},
// //
// // 				{sections_dept: "epse", sections_avg: 98.8},
// //
// // 				{sections_dept: "spph", sections_avg: 98.98},
// //
// // 				{sections_dept: "spph", sections_avg: 98.98},
// //
// // 				{sections_dept: "cnps", sections_avg: 99.19},
// //
// // 				{sections_dept: "math", sections_avg: 99.78},
// //
// // 				{sections_dept: "math", sections_avg: 99.78},
// // 			];
// // 			const result = await facade.performQuery(query);
// // 			expect(result).to.deep.equal(expected);
// // 		});
// //
// // 		it("should return correct results for a complex query", async function () {
// // 			//	timeout if it takes too long so other tests can perform
// // 			this.timeout(5000);
// // 			const query = {
// // 				WHERE: {
// // 					OR: [
// // 						{
// // 							AND: [
// // 								{
// // 									GT: {
// // 										ubc_avg: 90,
// // 									},
// // 								},
// // 								{
// // 									IS: {
// // 										ubc_dept: "adhe",
// // 									},
// // 								},
// // 							],
// // 						},
// // 						{
// // 							EQ: {
// // 								ubc_avg: 95,
// // 							},
// // 						},
// // 					],
// // 				},
// // 				OPTIONS: {
// // 					COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// // 					ORDER: "ubc_avg",
// // 				},
// // 			};
// // 			const expected: InsightResult[] = [
// // 				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.02},
// //
// // 				{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.16},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.17},
// //
// // 				{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.18},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.5},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.72},
// //
// // 				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.82},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.85},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.29},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},
// //
// // 				{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.48},
// //
// // 				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 92.54},
// //
// // 				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 93.33},
// //
// // 				{ubc_dept: "sowk", ubc_id: "570", ubc_avg: 95},
// //
// // 				{ubc_dept: "rhsc", ubc_id: "501", ubc_avg: 95},
// //
// // 				{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},
// //
// // 				{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},
// //
// // 				{ubc_dept: "obst", ubc_id: "549", ubc_avg: 95},
// //
// // 				{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},
// //
// // 				{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},
// //
// // 				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
// //
// // 				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
// //
// // 				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
// //
// // 				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
// //
// // 				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
// //
// // 				{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
// //
// // 				{ubc_dept: "mtrl", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},
// //
// // 				{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},
// //
// // 				{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},
// //
// // 				{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},
// //
// // 				{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},
// //
// // 				{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},
// //
// // 				{ubc_dept: "kin", ubc_id: "499", ubc_avg: 95},
// //
// // 				{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},
// //
// // 				{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},
// //
// // 				{ubc_dept: "epse", ubc_id: "606", ubc_avg: 95},
// //
// // 				{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},
// //
// // 				{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},
// //
// // 				{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},
// //
// // 				{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
// //
// // 				{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},
// //
// // 				{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},
// //
// // 				{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},
// //
// // 				{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},
// //
// // 				{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},
// //
// // 				{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},
// //
// // 				{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 96.11},
// // 			];
// // 			const actualResult = await facade.performQuery(query);
// // 			expect(actualResult).to.deep.equal(expected);
// // 		});
// //
// // 		it("should reject for incorrect format for a simple query - invalid key in column", async function () {
// // 			const query = {
// // 				WHERE: {
// // 					GT: {
// // 						sections_avg: 97,
// // 					},
// // 				},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept", "_avg"],
// // 					ORDER: "sections_avg",
// // 				},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
// // 			}
// // 		});
// //
// // 		it("should reject references dataset not added", async function () {
// // 			const query = {
// // 				WHERE: {
// // 					IS: {
// // 						ubc_dept: "*a",
// // 					},
// // 				},
// // 				OPTIONS: {
// // 					COLUMNS: ["sections_dept", "sections_avg"],
// // 					ORDER: "sections_avg",
// // 				},
// // 			};
// //
// // 			let errorWasThrown = false;
// //
// // 			try {
// // 				await facade.performQuery(query);
// // 			} catch (error) {
// // 				errorWasThrown = true;
// // 				expect(error).to.be.instanceOf(InsightError);
// // 			}
// //
// // 			if (!errorWasThrown) {
// // 				throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
// // 			}
// // 		});
// // 	});
// //

// INVALID SECTION TESTS
// it("should reject with an invalid dataset (no valid rooms)", function () {
// 	const result = facade.addDataset("campus", sectionsInvalid, InsightDatasetKind.Rooms);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing avg)", function () {
// 	const result = facade.addDataset("test", noavg, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing pass)", function () {
// 	const result = facade.addDataset("test", nopass, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing fail)", function () {
// 	const result = facade.addDataset("test", nofail, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing audit)", function () {
// 	const result = facade.addDataset("test", noaudit, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing year)", function () {
// 	const result = facade.addDataset("test", noyear, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing dept)", function () {
// 	const result = facade.addDataset("test", nodept, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing id)", function () {
// 	const result = facade.addDataset("test", noid, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing instructor)", function () {
// 	const result = facade.addDataset("test", noinst, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing title)", function () {
// 	const result = facade.addDataset("ubc", notitle, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("should reject with an invalid section (missing uuid)", function () {
// 	const result = facade.addDataset("test", nouuid, InsightDatasetKind.Sections);
// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
// });

// describe("performQuery Tests", function () {
// 	let facade: InsightFacade;
// 	let sections: string;
//
// 	before(function () {
// 		sections = getContentFromArchives("pair.zip");
// 	});
//
// 	beforeEach(function () {
// 		clearDisk();
// 		facade = new InsightFacade();
// 	});
//
// 	it("should reject query that is string", async function () {
// 		const query: string =
// 			'{"WHERE": {"GT": {"sections_avg": 97 }},' +
// 			'"OPTIONS": { "COLUMNS": ["sections_dept", "sections_avg"],"ORDER": "sections_avg"}}';
// 		let errorWasThrown = false;
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error but, but it did not :(");
// 		}
// 	});
//
// 	// it("should reject query with empty WHERE", async function () {
// 	// 	const query = {
// 	// 		"": {GT: {sections_avg: 97}},
// 	// 		OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// 	// 	};
// 	// 	let errorWasThrown = false;
// 	// 	try {
// 	// 		await facade.performQuery(query);
// 	// 	} catch (error) {
// 	// 		errorWasThrown = true;
// 	// 		expect(error).to.be.instanceOf(InsightError);
// 	// 	}
// 	// 	if (!errorWasThrown) {
// 	// 		throw new Error("Expected performQuery to throw error but, but it did not :(");
// 	// 	}
// 	// });
//
// 	it("should reject query with no WHERE", async function () {
// 		const query = {
// 			A: {GT: {sections_avg: 97}},
// 			OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// 		};
//
// 		let errorWasThrown = false;
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw an error, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query with no OPTIONS", async function () {
// 		const query = {WHERE: {GT: {sections_avg: 97}}};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw an error, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query typo COLUMN", async function () {
// 		const query = {
// 			WHERE: {GT: {sections_avg: 97}},
// 			OPTIONS: {COLUMS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw an error, but it did not.");
// 		}
// 	});
//
// 	it("should reject query idstring not datasetID", async function () {
// 		const query = {
// 			WHERE: {GT: {xxx_avg: 97}},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
// 				ORDER: "sections_pass",
// 			},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error but, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query empty FILTER list", async function () {
// 		const query = {
// 			WHERE: {OR: {}},
// 			OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error but, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query empty KEY list", async function () {
// 		const query = {WHERE: {OR: {}}, OPTIONS: {COLUMNS: []}};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query idsting with _", async function () {
// 		const query = {
// 			WHERE: {GT: {section_s_avg: 97}},
// 			OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query ORDER key must be in COLUMNS", async function () {
// 		const query = {
// 			WHERE: {GT: {sections_avg: 97}},
// 			OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_pass"},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error, but it did not :(");
// 		}
// 	});
//
// 	it("should reject query input string with *", async function () {
// 		const query = {
// 			WHERE: {GT: {"sections*_avg": 97}},
// 			OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw error, but it did not :(");
// 		}
// 	});
//
// 	it("should resolve *input string*", async function () {
// 		const query = {
// 			WHERE: {IS: {sections_dept: "*hin*"}},
// 			OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 		};
//
// 		try {
// 			const result = await facade.performQuery(query);
// 			expect(result).to.have.lengthOf(990);
// 		} catch (error) {
// 			console.log(error);
// 			throw new Error("Expected performQuery to resolve successfully, but it did not :(");
// 		}
// 	});
//
// 	it("should resolve with 2 FILTERS", async function () {
// 		const query = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							sections_dept: "*japn*",
// 						},
// 					},
// 					{
// 						IS: {
// 							sections_dept: "*japn*",
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
// 				ORDER: "sections_pass",
// 			},
// 		};
//
// 		try {
// 			const result = await facade.performQuery(query);
// 			expect(result).to.have.lengthOf(966);
// 		} catch (error) {
// 			throw new Error("Expected performQuery to resolve successfully, but it did not :(");
// 		}
// 	});
//
// 	it("should reject as >5000 results", async function () {
// 		const query = {
// 			WHERE: {},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept"],
// 			},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			console.log(error);
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(ResultTooLargeError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw ResultTooLargeError, but it did not :(");
// 		}
// 	});
//
// 	it("should return correct results for a simple query", async function () {
// 		const query = {
// 			WHERE: {
// 				GT: {
// 					sections_avg: 97,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
// 		const expected: InsightResult[] = [
// 			{sections_dept: "math", sections_avg: 97.09},
//
// 			{sections_dept: "math", sections_avg: 97.09},
//
// 			{sections_dept: "epse", sections_avg: 97.09},
//
// 			{sections_dept: "epse", sections_avg: 97.09},
//
// 			{sections_dept: "math", sections_avg: 97.25},
//
// 			{sections_dept: "math", sections_avg: 97.25},
//
// 			{sections_dept: "epse", sections_avg: 97.29},
//
// 			{sections_dept: "epse", sections_avg: 97.29},
//
// 			{sections_dept: "nurs", sections_avg: 97.33},
//
// 			{sections_dept: "nurs", sections_avg: 97.33},
//
// 			{sections_dept: "epse", sections_avg: 97.41},
//
// 			{sections_dept: "epse", sections_avg: 97.41},
//
// 			{sections_dept: "cnps", sections_avg: 97.47},
//
// 			{sections_dept: "cnps", sections_avg: 97.47},
//
// 			{sections_dept: "math", sections_avg: 97.48},
//
// 			{sections_dept: "math", sections_avg: 97.48},
//
// 			{sections_dept: "educ", sections_avg: 97.5},
//
// 			{sections_dept: "nurs", sections_avg: 97.53},
//
// 			{sections_dept: "nurs", sections_avg: 97.53},
//
// 			{sections_dept: "epse", sections_avg: 97.67},
//
// 			{sections_dept: "epse", sections_avg: 97.69},
//
// 			{sections_dept: "epse", sections_avg: 97.78},
//
// 			{sections_dept: "crwr", sections_avg: 98},
//
// 			{sections_dept: "crwr", sections_avg: 98},
//
// 			{sections_dept: "epse", sections_avg: 98.08},
//
// 			{sections_dept: "nurs", sections_avg: 98.21},
//
// 			{sections_dept: "nurs", sections_avg: 98.21},
//
// 			{sections_dept: "epse", sections_avg: 98.36},
//
// 			{sections_dept: "epse", sections_avg: 98.45},
//
// 			{sections_dept: "epse", sections_avg: 98.45},
//
// 			{sections_dept: "nurs", sections_avg: 98.5},
//
// 			{sections_dept: "nurs", sections_avg: 98.5},
//
// 			{sections_dept: "nurs", sections_avg: 98.58},
//
// 			{sections_dept: "nurs", sections_avg: 98.58},
//
// 			{sections_dept: "epse", sections_avg: 98.58},
//
// 			{sections_dept: "epse", sections_avg: 98.58},
//
// 			{sections_dept: "epse", sections_avg: 98.7},
//
// 			{sections_dept: "nurs", sections_avg: 98.71},
//
// 			{sections_dept: "nurs", sections_avg: 98.71},
//
// 			{sections_dept: "eece", sections_avg: 98.75},
//
// 			{sections_dept: "eece", sections_avg: 98.75},
//
// 			{sections_dept: "epse", sections_avg: 98.76},
//
// 			{sections_dept: "epse", sections_avg: 98.76},
//
// 			{sections_dept: "epse", sections_avg: 98.8},
//
// 			{sections_dept: "spph", sections_avg: 98.98},
//
// 			{sections_dept: "spph", sections_avg: 98.98},
//
// 			{sections_dept: "cnps", sections_avg: 99.19},
//
// 			{sections_dept: "math", sections_avg: 99.78},
//
// 			{sections_dept: "math", sections_avg: 99.78},
// 		];
// 		const result = await facade.performQuery(query);
// 		expect(result).to.deep.equal(expected);
// 	});
//
// 	it("should return correct results for a complex query", async function () {
// 		//	timeout if it takes too long so other tests can perform
// 		this.timeout(5000);
// 		const query = {
// 			WHERE: {
// 				OR: [
// 					{
// 						AND: [
// 							{
// 								GT: {
// 									ubc_avg: 90,
// 								},
// 							},
// 							{
// 								IS: {
// 									ubc_dept: "adhe",
// 								},
// 							},
// 						],
// 					},
// 					{
// 						EQ: {
// 							ubc_avg: 95,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		const expected: InsightResult[] = [
// 			{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.02},
//
// 			{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.16},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.17},
//
// 			{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.18},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.5},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.72},
//
// 			{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.82},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.85},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.29},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},
//
// 			{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.48},
//
// 			{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 92.54},
//
// 			{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 93.33},
//
// 			{ubc_dept: "sowk", ubc_id: "570", ubc_avg: 95},
//
// 			{ubc_dept: "rhsc", ubc_id: "501", ubc_avg: 95},
//
// 			{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},
//
// 			{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},
//
// 			{ubc_dept: "obst", ubc_id: "549", ubc_avg: 95},
//
// 			{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},
//
// 			{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},
//
// 			{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 			{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 			{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 			{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 			{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 			{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 			{ubc_dept: "mtrl", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},
//
// 			{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},
//
// 			{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},
//
// 			{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},
//
// 			{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},
//
// 			{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},
//
// 			{ubc_dept: "kin", ubc_id: "499", ubc_avg: 95},
//
// 			{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},
//
// 			{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},
//
// 			{ubc_dept: "epse", ubc_id: "606", ubc_avg: 95},
//
// 			{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},
//
// 			{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},
//
// 			{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},
//
// 			{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 			{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},
//
// 			{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},
//
// 			{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},
//
// 			{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},
//
// 			{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},
//
// 			{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},
//
// 			{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 96.11},
// 		];
// 		const actualResult = await facade.performQuery(query);
// 		expect(actualResult).to.deep.equal(expected);
// 	});
//
// 	it("should reject for incorrect format for a simple query - invalid key in column", async function () {
// 		const query = {
// 			WHERE: {
// 				GT: {
// 					sections_avg: 97,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
// 		}
// 	});
//
// 	it("should reject references dataset not added", async function () {
// 		const query = {
// 			WHERE: {
// 				IS: {
// 					ubc_dept: "*a",
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
//
// 		let errorWasThrown = false;
//
// 		try {
// 			await facade.performQuery(query);
// 		} catch (error) {
// 			errorWasThrown = true;
// 			expect(error).to.be.instanceOf(InsightError);
// 		}
//
// 		if (!errorWasThrown) {
// 			throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
// 		}
// 	});
// });
//
// describe("listDatasets Tests", async function () {
// 	let facade: InsightFacade;
// 	let sections: string;
// 	let initialDatasetCount: number;
//
// 	before(async function () {
// 		sections = getContentFromArchives("pair.zip");
// 	});
//
// 	beforeEach(async function () {
// 		clearDisk();
// 		facade = new InsightFacade();
//
// 		// Get the initial dataset count
// 		const initialDatasets = await facade.listDatasets();
// 		initialDatasetCount = initialDatasets.length;
//
// 		// Add two datasets
// 		await Promise.all([
// 			facade.addDataset("ubc", sections, InsightDatasetKind.Sections),
// 			facade.addDataset("ubc2", sections, InsightDatasetKind.Rooms),
// 		]);
// 	});
//
// 	it("should return all datasets that were added", async function () {
// 		const datasets: InsightDataset[] = await facade.listDatasets();
//
// 		// Check if the length increased by 2
// 		expect(datasets)
// 			.to.be.an("array")
// 			.that.has.lengthOf(initialDatasetCount + 2);
//
// 		datasets.forEach(function (dataset) {
// 			expect(dataset).to.be.an("object");
// 			expect(dataset).to.have.property("id").that.is.a("string");
// 			expect(dataset.kind).to.be.oneOf([InsightDatasetKind.Sections, InsightDatasetKind.Rooms]);
// 			expect(dataset).to.have.property("numRows").that.is.a("number");
// 		});
// 	});
// });
// // describe("PQ Crash Tests", function () {
// // 	let facade: InsightFacade;
// // 	let qBasic = {
// // 		WHERE: {
// // 			GT: {
// // 				ubc_avg: 97,
// // 			},
// // 		},
// // 		OPTIONS: {
// // 			COLUMNS: ["ubc_dept", "ubc_avg"],
// // 			ORDER: "ubc_avg",
// // 		},
// // 	};
// //
// // 	beforeEach(async function () {
// // 		clearDisk();
// // 		facade = new InsightFacade();
// //
// // 		let pair = getContentFromArchives("pair.zip");
// // 		await facade.addDataset("ubc", pair, InsightDatasetKind.Sections);
// // 	});
// //
// // 	it("should not query after crash", async function () {
// // 		let list = await facade.listDatasets();
// // 		console.log("before: " + JSON.stringify(list, null, 2));
// //
// // 		await facade.removeDataset("ubc");
// // 		//	simulate crash
// // 		facade = new InsightFacade();
// //
// // 		let list1 = await facade.listDatasets();
// // 		console.log("after: " + JSON.stringify(list1, null, 2));
// //
// // 		let result = facade.performQuery(qBasic);
// // 		expect(result).to.eventually.be.rejectedWith(InsightError);
// // 	});
// //
// // 	it("should query after crash", async function () {
// // 		let list = await facade.listDatasets();
// // 		console.log("before: " + JSON.stringify(list, null, 2));
// //
// // 		//	simulate crash
// // 		facade = new InsightFacade();
// //
// // 		let list1 = await facade.listDatasets();
// // 		console.log("after: " + JSON.stringify(list1, null, 2));
// //
// // 		let result = await facade.performQuery(qBasic);
// //
// // 		expect(result).to.be.length(49);
// // 		console.log(result);
// // 	});
// // });
// //
// describe("Helper Unit Tests", function () {
// 	describe("isBase64Zip", function () {
// 		it("should return True when a base 64 string from a Zip File is passed in", function () {
// 			let sections: string = getContentFromArchives("basic.zip");
// 			const result = isBase64Zip(sections);
// 			return expect(result).to.eventually.be.true;
// 		});
//
// 		it("should return False when a .txt string is passed in", function () {
// 			let textFile: string = getContentFromArchives("text.txt");
// 			const result = isBase64Zip(textFile);
// 			return expect(result).to.eventually.be.false;
// 		});
//
// 		it("should return False when Zip file with wrong signature is passed in (50 4B *02* 04)", function () {
// 			let wrongZipSignature: string = getContentFromArchives("basicWrongZipSignature.zip");
// 			const result = isBase64Zip(wrongZipSignature);
// 			return expect(result).to.eventually.be.false;
// 		});
//
// 		it("should return False when a corrupted Zip file is passed in", function () {
// 			let corruptedZip: string = getContentFromArchives("basicCorrupted.zip");
// 			const result = isBase64Zip(corruptedZip);
// 			return expect(result).to.eventually.be.false;
// 		});
// 	});
//
// 	//	given a valid Zip, it checks if the dataset is valid
// 	describe("validateCourseDataset", function () {
// 		it("should return True when a valid is passed in", async function () {
// 			let sections: string = getContentFromArchives("basic.zip");
// 			const result = await validateCourseDataset(sections, "test");
// 			return expect(result.success).to.be.true;
// 		});
//
// 		it("should return True when a valid dataset is passed in - 1 invalid section", async function () {
// 			let sections: string = getContentFromArchives("validOneSectionNoAVG.zip");
// 			const result = await validateCourseDataset(sections, "test");
// 			return expect(result.success).to.be.true;
// 		});
//
// 		it("should return False when a valid is passed in - no valid sections", async function () {
// 			let sections: string = getContentFromArchives("noAVG.zip");
// 			const result = await validateCourseDataset(sections, "test");
// 			return expect(result.success).to.be.false;
// 		});
// 	});
// 	//
// 	//	loads the datasets from '/data'
// 	describe("validateCourseDataset", function () {
// 		describe("getLatLongTests", function () {
// 			it("should return latitude and longitude for a valid address", async function () {
// 				const address: string = "2211 Wesbrook Mall";
// 				try {
// 					const [lat, lon] = await getLatLong(address);
// 					expect(lat).to.be.a("number");
// 					expect(lon).to.be.a("number");
// 					console.log({lat, lon});
// 				} catch (error) {
// 					expect.fail("Should not have thrown an error");
// 				}
// 			});
//
// 			it("should throw an error for an invalid address", async function () {
// 				const address: string = "Invalid Address";
// 				await expect(getLatLong(address)).to.be.rejectedWith(Error);
// 			});
//
// 			it("should throw an error for an empty address", async function () {
// 				await expect(getLatLong("")).to.be.rejectedWith(Error);
// 			});
// 		});
//
// 		describe("praseHTML tests", function () {
// 			it("should return tables", async function () {
// 				let campus = getContentFromArchives("campus.zip");
// 				const zip = await loadZipContent(campus);
// 				const indexFile = zip.file("index.htm");
// 				if (!indexFile) {
// 					throw new Error("index.htm not found in zip");
// 				}
// 				const htmlContent = await indexFile.async("string");
// 				return htmlParseBuilding(htmlContent, zip);
// 			});
// 		});
// 	});
// 	describe("loadDatasetsFromDirectory", function () {
// 		// it("should return dataset object from disk", async function () {
// 		// 	let listOfDatasets = await loadDatasetsFromDirectory("./data");
// 		//
// 		// 	// Check if listOfDatasets is an array
// 		// 	expect(listOfDatasets).to.be.an("array");
// 		//
// 		// 	// Check if each element in the array is an instance of Dataset
// 		// 	listOfDatasets.forEach((dataset: Dataset) => {
// 		// 		expect(dataset).to.be.an.instanceOf(Dataset);
// 		// 	});
// 		// });
// 	});
// });
//
// describe("InsightFacade", function () {
// 	describe("addDataset", function () {
// 		let sections: string;
// 		let sectionsInvalid: string;
// 		let pair: string;
// 		let facade: InsightFacade;
// 		let noaudit: string;
// 		let noavg: string;
// 		let nopass: string;
// 		let nofail: string;
// 		let noid: string;
// 		let noinst: string;
// 		let nodept: string;
// 		let notitle: string;
// 		let noyear: string;
// 		let nouuid: string;
//
// 		before(function () {
// 			sections = getContentFromArchives("basic.zip");
// 			sectionsInvalid = getContentFromArchives("invalid.zip");
// 			pair = getContentFromArchives("pair.zip");
//
// 			// invalid sections
// 			noaudit = getContentFromArchives("noAUDIT.zip");
// 			noavg = getContentFromArchives("noAVG.zip");
// 			nodept = getContentFromArchives("noDEPT.zip");
// 			nofail = getContentFromArchives("noFAIL.zip");
// 			noid = getContentFromArchives("noID.zip");
// 			noinst = getContentFromArchives("noINSTRUCTOR.zip");
// 			nopass = getContentFromArchives("noPASS.zip");
// 			notitle = getContentFromArchives("noTITLE.zip");
// 			nouuid = getContentFromArchives("noUUID.zip");
// 			noyear = getContentFromArchives("noYEAR.zip");
// 		});
//
// 		beforeEach(async function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 			await facade.initialize();
// 		});
//
// 		it("should successfully add a dataset (first)", function () {
// 			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.have.members(["ubc"]);
// 		});
//
// 		it("should successfully add a dataset (second)", function () {
// 			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.have.members(["ubc"]);
// 		});
//
// 		it("should successfully access dataset after crash", async function () {
// 			await facade.addDataset("basic", sections, InsightDatasetKind.Sections);
// 			// new instance made
// 			facade = new InsightFacade();
// 			await facade.initialize();
//
// 			const result = await facade.listDatasets();
// 			expect(result).to.deep.equal([
// 				{
// 					id: "basic",
// 					kind: InsightDatasetKind.Sections,
// 					numRows: 119,
// 				},
// 			]);
// 		});
//
// 		it("should still be able to remove dataset after crash", async function () {
// 			await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 			// new instance made
// 			facade = new InsightFacade();
// 			await facade.initialize();
//
// 			await facade.removeDataset("pair");
// 			const result = await facade.listDatasets();
// 			expect(result).to.deep.equal([]);
// 		});
//
// 		it("should successfully add 2 datasets", async function () {
// 			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 			const result = facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.have.members(["ubc", "pair"]);
// 		});
//
// 		it("should reject with an empty dataset id", function () {
// 			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with a whitespace id", function () {
// 			const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with a invalid rooms kind", function () {
// 			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		// INVALID SECTION TESTS
// 		it("should reject with an invalid dataset (no valid sections)", function () {
// 			const result = facade.addDataset("ubc", sectionsInvalid, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing avg)", function () {
// 			const result = facade.addDataset("test", noavg, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing pass)", function () {
// 			const result = facade.addDataset("test", nopass, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing fail)", function () {
// 			const result = facade.addDataset("test", nofail, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing audit)", function () {
// 			const result = facade.addDataset("test", noaudit, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing year)", function () {
// 			const result = facade.addDataset("test", noyear, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing dept)", function () {
// 			const result = facade.addDataset("test", nodept, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing id)", function () {
// 			const result = facade.addDataset("test", noid, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing instructor)", function () {
// 			const result = facade.addDataset("test", noinst, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing title)", function () {
// 			const result = facade.addDataset("ubc", notitle, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with an invalid section (missing uuid)", function () {
// 			const result = facade.addDataset("test", nouuid, InsightDatasetKind.Sections);
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
// 	});
//
// 	describe("removeDataset", function () {
// 		let sections: string;
// 		// let sectionsInvalid: string;
// 		let facade: InsightFacade;
// 		let data: Dataset;
// 		let basic: string;
// 		sections = getContentFromArchives("cs110.zip");
// 		basic = getContentFromArchives("basic.zip");
// 		before(async function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 			await facade.initialize();
// 		});
//
// 		it("should successfully remove dataset", async function () {
// 			// added await here
// 			await facade.addDataset("basic", basic, InsightDatasetKind.Sections);
// 			const result = await facade.removeDataset("basic");
// 			expect(result).to.deep.equal("basic");
// 		});
//
// 		it("should reject with nonexistent id (already removed)", function () {
// 			const result = facade.removeDataset("basic");
// 			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 		});
//
// 		it("should reject with nonexistent id (not found)", function () {
// 			const result = facade.removeDataset("ubc1");
// 			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 		});
//
// 		it("should reject with invalid id (whitespace)", function () {
// 			const result = facade.removeDataset("");
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with invalid id (underscore)", function () {
// 			const result = facade.removeDataset("u_bc");
// 			return expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
// 	});
//
// 	describe("listDatasets", function () {
// 		let set1: string;
// 		let set2: string;
// 		let facade: InsightFacade;
//
// 		before(async function () {
// 			set1 = getContentFromArchives("cs110.zip");
// 			set2 = getContentFromArchives("cs121.zip");
// 			clearDisk();
// 			facade = new InsightFacade();
// 			await facade.initialize();
// 		});
//
// 		it("should list 0 dataset", async function () {
// 			const result = await facade.listDatasets();
// 			expect(result).to.deep.equal([]);
// 		});
//
// 		it("should reject with nonexistent id (already removed)", async function () {
// 			await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 			await facade.removeDataset("cs121");
// 			const result = facade.removeDataset("cs121");
// 			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 		});
//
// 		it("should reject with nonexistent id (not found)", function () {
// 			const result = facade.removeDataset("1823");
// 			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 		});
//
// 		it("should list 2 dataset", async function () {
// 			await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 			await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 			const result = await facade.listDatasets();
//
// 			expect(result).to.deep.equal([
// 				{
// 					id: "cs121",
// 					kind: InsightDatasetKind.Sections,
// 					numRows: 1,
// 				},
// 				{
// 					id: "cs110",
// 					kind: InsightDatasetKind.Sections,
// 					numRows: 1,
// 				},
// 			]);
// 		});
//
// 		it("should list 1 dataset (after removal)", async function () {
// 			await facade.removeDataset("cs121");
// 			const result = await facade.listDatasets();
//
// 			expect(result).to.deep.equal([
// 				{
// 					id: "cs110",
// 					kind: InsightDatasetKind.Sections,
// 					numRows: 1,
// 				},
// 			]);
// 		});
//
// 		it("should list 0 dataset (after removal)", async function () {
// 			await facade.removeDataset("cs110");
// 			const result = await facade.listDatasets();
// 			expect(result).to.deep.equal([]);
// 		});
//
// 		it("should list 2 dataset (both in same test)", async function () {
// 			await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 			await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
//
// 			const result = await facade.listDatasets();
// 			expect(result).to.deep.equal([
// 				{
// 					id: "cs110",
// 					kind: InsightDatasetKind.Sections,
// 					numRows: 1,
// 				},
// 				{
// 					id: "cs121",
// 					kind: InsightDatasetKind.Sections,
// 					numRows: 1,
// 				},
// 			]);
// 		});
//
// 		it("should list 0 dataset (both del in same test)", async function () {
// 			await facade.removeDataset("cs110");
// 			await facade.removeDataset("cs121");
//
// 			const result = await facade.listDatasets();
// 			expect(result).to.deep.equal([]);
// 		});
// 	});
//
// 	/*
// 	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
// 	 * You should not need to modify it; instead, add additional files to the queries directory.
// 	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
// 	 */
// 	// describe("PerformQuery", () => {
// 	// 	let facade = InsightFacade;
// 	// 	let alt = string;
// 	// 	let sections = string;
// 	// 	before(async function () {
// 	// 		console.info(`Before: ${this.test?.parent?.title}`);
// 	//
// 	// 		facade = new InsightFacade();
// 	// 		await facade.initialize();
// 	//
// 	// 		// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
// 	// 		// Will *fail* if there is a problem reading ANY dataset.
// 	// 		const loadDatasetPromises = [
// 	// 			facade.addDataset("sections", sections, InsightDatasetKind.Sections),
// 	// 		];
// 	//
// 	// 		return Promise.all(loadDatasetPromises);
// 	// 	});
// 	//
// 	// 	it("should list 0 dataset", async function () {
// 	// 		const result = await facade.listDatasets();
// 	// 		expect(result).to.deep.equal([]);
// 	// 	});
// 	//
// 	// 	it("should list 1 dataset", async function () {
// 	// 		await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 	// 		const result = await facade.listDatasets();
// 	//
// 	// 		expect(result).to.deep.equal([{
// 	// 			id: "cs110",
// 	// 			kind: InsightDatasetKind.Sections,
// 	// 			numRows: 1
// 	// 		}]);
// 	// 	});
// 	//
// 	// 	it("should list 2 dataset", async function () {
// 	// 		await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 	// 		const result = await facade.listDatasets();
// 	//
// 	// 		expect(result).to.deep.equal([{
// 	// 			id: "cs110",
// 	// 			kind: InsightDatasetKind.Sections,
// 	// 			numRows: 1
// 	// 		}, {
// 	// 			id: "cs121",
// 	// 			kind: InsightDatasetKind.Sections,
// 	// 			numRows: 1
// 	// 		}]);
// 	// 	});
// 	//
// 	// 	it("should list 1 dataset (after removal)", async function () {
// 	// 		await facade.removeDataset("cs121");
// 	// 		const result = await facade.listDatasets();
// 	//
// 	// 		expect(result).to.deep.equal([{
// 	// 			id: "cs110",
// 	// 			kind: InsightDatasetKind.Sections,
// 	// 			numRows: 1
// 	// 		}]);
// 	// 	});
// 	//
// 	// 	it("should list 0 dataset (after removal)", async function () {
// 	// 		await facade.removeDataset("cs110");
// 	// 		const result = await facade.listDatasets();
// 	// 		expect(result).to.deep.equal([]);
// 	// 	});
// 	//
// 	//
// 	// 	it("should list 2 dataset (both in same test)", async function () {
// 	// 		await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 	// 		await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 	//
// 	// 		const result = await facade.listDatasets();
// 	// 		expect(result).to.deep.equal([{
// 	// 			id: "cs110",
// 	// 			kind: InsightDatasetKind.Sections,
// 	// 			numRows: 1
// 	// 		}, {
// 	// 			id: "cs121",
// 	// 			kind: InsightDatasetKind.Sections,
// 	// 			numRows: 1
// 	// 		}]);
// 	// 	});
// 	//
// 	// 	it("should list 0 dataset (both del in same test)", async function () {
// 	// 		await facade.removeDataset("cs110");
// 	// 		await facade.removeDataset("cs121");
// 	//
// 	// 		const result = await facade.listDatasets();
// 	// 		expect(result).to.deep.equal([]);
// 	// 	});
// 	// });
// 	//
// 	//
// 	// /*
// 	//  * This test suite dynamically generates tests from the JSON files in test/resources/queries.
// 	//  * You should not need to modify it; instead, add additional files to the queries directory.
// 	//  * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
// 	//  */
// 	// // describe("PerformQuery", () => {
// 	// // 	let facade = InsightFacade;
// 	// // 	let alt = string;
// 	// // 	let sections = string;
// 	// // 	before(function () {
// 	// // 		console.info(`Before: ${this.test?.parent?.title}`);
// 	// //
// 	// // 		facade = new InsightFacade();
// 	// //
// 	// // 		// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
// 	// // 		// Will *fail* if there is a problem reading ANY dataset.
// 	// // 		const loadDatasetPromises = [
// 	// // 			facade.addDataset("sections", sections, InsightDatasetKind.Sections),
// 	// // 		];
// 	// //
// 	// // 		return Promise.all(loadDatasetPromises);
// 	// // 	});
// 	// //
// 	// // 	after(function () {
// 	// // 		console.info(`After: ${this.test?.parent?.title}`);
// 	// // 		clearDisk();
// 	// // 	});
// 	// //
// 	// //
// 	// // 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 	// // 		"Dynamic InsightFacade PerformQuery tests",
// 	// // 		(input) => facade.performQuery(input),
// 	// // 		"./test/resources/queries",
// 	// // 		{
// 	// // 			assertOnResult: (actual, expected) => {
// 	// // 				// TODO add an assertion!
// 	// // 			},
// 	// // 			errorValidator: (error): error is PQErrorKind =>
// 	// // 				error === "ResultTooLargeError" || error === "InsightError",
// 	// // 			assertOnError: (actual, expected) => {
// 	// // 				// TODO add an assertion!
// 	// // 			},
// 	// // 		}
// 	// // 	);
// 	// // });
// 	//
// 	//
// 	// describe("parseWhere", function () {
// 	// 	let root: Query;
// 	// 	let qBasicWhere: object;
// 	// 	let qComplexWhere: object;
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		qBasicWhere = {
// 	// 			WHERE: {
// 	// 				GT: [
// 	// 					{
// 	// 						sections_avg: 97,
// 	// 					},
// 	// 				],
// 	// 			},
// 	// 			OPTIONS: {
// 	// 				COLUMNS: ["sections_dept", "sections_avg"],
// 	// 				ORDER: "sections_avg",
// 	// 			},
// 	// 		};
// 	//
// 	// 		qComplexWhere = {
// 	// 			WHERE: {
// 	// 				OR: [
// 	// 					{
// 	// 						AND: [
// 	// 							{
// 	// 								GT: {
// 	// 									ubc_year: 2015,
// 	// 								},
// 	// 							},
// 	// 							{
// 	// 								IS: {
// 	// 									ubc_dept: "adhe",
// 	// 								},
// 	// 							},
// 	// 						],
// 	// 					},
// 	// 					{
// 	// 						EQ: {
// 	// 							ubc_avg: 95,
// 	// 						},
// 	// 					},
// 	// 				],
// 	// 			},
// 	// 		};
// 	// 	});
// 	//
// 	// 	it("should properly parse query WHERE (basic)", function () {
// 	// 		for (const k in qBasicWhere) {
// 	// 			if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
// 	// 				let subQuery: object = (qBasicWhere as any)[k];
// 	// 				if (k === "WHERE") {
// 	// 					const where = parseWhere(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	//
// 	// 	it("should properly parse query WHERE (complex)", function () {
// 	// 		// const where!: QueryNode;
// 	// 		for (const k in qComplexWhere) {
// 	// 			if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
// 	// 				let subQuery: object = (qComplexWhere as any)[k];
// 	// 				if (k === "WHERE") {
// 	// 					const where = parseWhere(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	// });
// 	//
// 	// describe("parseOpts", function () {
// 	// 	let root: Query;
// 	// 	let optsBasic = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
// 	// 			ORDER: ["sections_avg"],
// 	// 		},
// 	// 	};
// 	// 	let optsNoOrder = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_avg"],
// 	// 		},
// 	// 	};
// 	// 	let opts1Col = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_uuid"],
// 	// 			ORDER: "sections_avg",
// 	// 		},
// 	// 	};
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 	});
// 	//
// 	// 	it("should parse options", function () {
// 	// 		for (const k in optsBasic) {
// 	// 			if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
// 	// 				let subQuery: object = (optsBasic as any)[k];
// 	// 				if (k === "OPTIONS") {
// 	// 					const where = parseOpts(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	//
// 	// 	it("should parse options 1 col", function () {
// 	// 		// const where!: QueryNode;
// 	// 		for (const k in opts1Col) {
// 	// 			if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
// 	// 				let subQuery: object = (opts1Col as any)[k];
// 	// 				if (k === "OPTIONS") {
// 	// 					const where = parseOpts(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	//
// 	// 	it("should parse options (no order)", function () {
// 	// 		// const where!: QueryNode;
// 	// 		for (const k in optsNoOrder) {
// 	// 			if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
// 	// 				let subQuery: object = (optsNoOrder as any)[k];
// 	// 				if (k === "OPTIONS") {
// 	// 					const where = parseOpts(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	// });
// 	//
// 	// describe("parseOpts", function () {
// 	// 	let root: Query;
// 	// 	let optsBasic = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
// 	// 			ORDER: "sections_avg",
// 	// 		},
// 	// 	};
// 	// 	let optsNoOrder = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_avg"],
// 	// 		},
// 	// 	};
// 	// 	let opts1Col = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_uuid"],
// 	// 			ORDER: "sections_avg",
// 	// 		},
// 	// 	};
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 	});
// 	//
// 	// 	it("should parse options", function () {
// 	// 		// const where!: QueryNode;
// 	// 		for (const k in optsBasic) {
// 	// 			if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
// 	// 				let subQuery: object = (optsBasic as any)[k];
// 	// 				if (k === "OPTIONS") {
// 	// 					const where = parseOpts(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	//
// 	// 	it("should parse options 1 col", function () {
// 	// 		// const where!: QueryNode;
// 	// 		for (const k in opts1Col) {
// 	// 			if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
// 	// 				let subQuery: object = (opts1Col as any)[k];
// 	// 				if (k === "OPTIONS") {
// 	// 					const where = parseOpts(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	//
// 	// 	it("should parse options (no order)", function () {
// 	// 		// const where!: QueryNode;
// 	// 		for (const k in optsNoOrder) {
// 	// 			if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
// 	// 				let subQuery: object = (optsNoOrder as any)[k];
// 	// 				if (k === "OPTIONS") {
// 	// 					const where = parseOpts(subQuery, k);
// 	// 					checkParsing(where, 0);
// 	// 				}
// 	// 			}
// 	// 		}
// 	// 	});
// 	// });
//
// 	// describe("performQuery", function () {
// 	// 	let facade: InsightFacade;
// 	// 	let qBasic = {
// 	// 		WHERE: {
// 	// 			GT: {
// 	// 				test_avg: 50,
// 	// 			},
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["test_dept", "test_avg"],
// 	// 			ORDER: "test_dept",
// 	// 		},
// 	// 	};
// 	// 	let qComplex = {
// 	// 		WHERE: {
// 	// 			OR: [
// 	// 				{
// 	// 					AND: [
// 	// 						{
// 	// 							EQ: {
// 	// 								test_audit: 0,
// 	// 							},
// 	// 						},
// 	// 						{
// 	// 							IS: {
// 	// 								test_instructor: "*drew",
// 	// 							},
// 	// 						},
// 	// 					],
// 	// 				},
// 	// 				{
// 	// 					IS: {
// 	// 						test_title: "biology",
// 	// 					},
// 	// 				},
// 	// 			],
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["test_dept", "test_title", "test_avg", "test_pass"],
// 	// 			ORDER: "test_avg",
// 	// 		},
// 	// 	};
// 	// 	let qBasicNoComparator= {
// 	// 		WHERE: {
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["test_dept", "test_avg"],
// 	// 			ORDER: "test_dept",
// 	// 		},
// 	// 	};
// 	// 	let qBasicInvKey: object;
// 	// 	let sec1;
// 	// 	let sec2;
// 	// 	let sec3;
// 	// 	let sec4;
// 	// 	let sec5;
// 	// 	let sections: Section[];
// 	// 	let dataset: Dataset;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		qBasicInvKey = {
// 	// 			WHERE: {
// 	// 				GT: {
// 	// 					sections_avg: "string",
// 	// 				},
// 	// 			},
// 	// 		};
// 	// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 	// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2021, 85, 49, 1, 0);
// 	// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2020, 60, 25, 25, 0);
// 	// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 	// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 	// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 	// 		dataset = new Dataset("test", InsightDatasetKind.Sections, sections, 4);
// 	// 		facade.aDataset(dataset);
// 	// 	});
// 	//
// 	// 	it("should execQuery (basic)", function () {
// 	// 		const where = qBasic.WHERE;
// 	// 		const parsedwhere = parseWhere(where, "WHERE");
// 	// 		const options = qBasic.OPTIONS;
// 	// 		const parsedopts = parseOpts(options, "OPTIONS");
// 	// 		const query = new Query(parsedwhere, parsedopts);
// 	// 		const collector = new Collector([dataset]);
// 	// 		const result = collector.execQuery(query);
// 	// 		console.log(result);
// 	// 	});
// 	//
// 	// 	it("should execQuery (complex)", function () {
// 	// 		const where = qComplex.WHERE;
// 	// 		const parsedwhere = parseWhere(where, "WHERE");
// 	// 		const options = qComplex.OPTIONS;
// 	// 		const parsedopts = parseOpts(options, "OPTIONS");
// 	// 		const query = new Query(parsedwhere, parsedopts);
// 	// 		const collector = new Collector([dataset]);
// 	// 		const result = collector.execQuery(query);
// 	// 		console.log(result);
// 	// 	});
// 	//
// 	// 	it("should execQuery (NO COMPARATOR)", function () {
// 	// 		const where = qBasicNoComparator.WHERE;
// 	// 		const parsedwhere = parseWhere(where, "WHERE");
// 	// 		const options = qBasicNoComparator.OPTIONS;
// 	// 		const parsedopts = parseOpts(options, "OPTIONS");
// 	// 		const query = new Query(parsedwhere, parsedopts);
// 	// 		const collector = new Collector([dataset]);
// 	// 		const result = collector.execQuery(query);
// 	// 		console.log(result);
// 	// 	});
// 	// });
//
// 	// describe("validationTests", function () {
// 	// 	let optsEmptyCol = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: [],
// 	// 			ORDER: "ubc_avg",
// 	// 		},
// 	// 	};
// 	// 	let optsValid = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 	// 			ORDER: "ubc_avg",
// 	// 		},
// 	// 	};
// 	// 	let optsOrderFirst = {
// 	// 		OPTIONS: {
// 	// 			ORDER: "ubc_avg",
// 	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 	// 		},
// 	// 	};
// 	// 	let optsOrderNotInCol = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 	// 			ORDER: "ubc_pass",
// 	// 		},
// 	// 	};
// 	// 	let optsInvKeyOrd = {
// 	// 		OPTIONS: {
// 	// 			ORDER: "ubc_aaaa",
// 	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 	// 		},
// 	// 	};
// 	// 	let optsInvKeyCol = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["ubc_dept", "ubc_idddd", "ubc_avg"],
// 	// 			ORDER: "ubc_avg",
// 	// 		},
// 	// 	};
// 	// 	let optsNoOrder = {
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 	// 		},
// 	// 	};
// 	//
// 	// 	let where2Key = {
// 	// 		WHERE: {
// 	// 			GT: {
// 	// 				sections_avg: 97,
// 	// 			},
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: ["sections_dept", "sections_avg"],
// 	// 			ORDER: "sections_avg",
// 	// 		},
// 	// 	};
// 	// 	let validator: Validator;
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		validator = new Validator([]);
// 	// 	});
// 	//
// 	// 	it("should validate OPTS", function () {
// 	// 		const opt = Object.keys(optsValid)[0];
// 	// 		const sub = optsValid.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("should validate where2key, with the first removed", function () {
// 	// 		const where = Object.keys(where2Key)[0];
// 	// 		const sub = where2Key.WHERE;
// 	// 		const node = parseWhere(sub, where);
// 	// 		const result = validator.validWhere(node);
// 	// 		expect(result).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("should validate OPTS, (ORDER FIRST)", function () {
// 	// 		const opt = Object.keys(optsOrderFirst)[0];
// 	// 		const sub = optsOrderFirst.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(0);
// 	// 	});
// 	//
// 	// 	it("should validate OPTS, (ORDER NOT MATCHING COl)", function () {
// 	// 		const opt = Object.keys(optsOrderNotInCol)[0];
// 	// 		const sub = optsOrderNotInCol.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("should not validate OPTS (empty COLUMNS)", function () {
// 	// 		const opt = Object.keys(optsEmptyCol)[0];
// 	// 		const sub = optsEmptyCol.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("should not validate OPTS (invalid key in COLUMNS )", function () {
// 	// 		const opt = Object.keys(optsInvKeyCol)[0];
// 	// 		const sub = optsInvKeyOrd.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("should not validate OPTS (invalid key in ORDER)", function () {
// 	// 		const opt = Object.keys(optsInvKeyOrd)[0];
// 	// 		const sub = optsInvKeyOrd.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(1);
// 	// 	});
// 	//
// 	// 	it("should validate, (no ORDER)", function () {
// 	// 		const opt = Object.keys(optsNoOrder)[0];
// 	// 		const sub = optsNoOrder.OPTIONS;
// 	// 		const node = parseOpts(sub, opt);
// 	// 		const result = validator.validateOptions(node);
// 	// 		expect(result).to.equal(0);
// 	// 	});
// 	// });
//
// 	describe("execWhere", function () {
// 		let queryGT30 = {
// 			WHERE: {
// 				GT: {
// 					test_avg: 30,
// 				},
// 			},
// 		};
// 		let queryAND = {
// 			WHERE: {
// 				AND: [
// 					{
// 						EQ: {
// 							test_year: 2015,
// 						},
// 					},
// 					{
// 						GT: {
// 							test_avg: 45,
// 						},
// 					},
// 				],
// 			},
// 		};
// 		let queryCOMPLEX = {
// 			WHERE: {
// 				OR: [
// 					{
// 						AND: [
// 							{
// 								EQ: {
// 									test_year: 2020,
// 								},
// 							},
// 							{
// 								LT: {
// 									test_fail: 20,
// 								},
// 							},
// 						],
// 					},
// 					{
// 						IS: {
// 							test_id: "300",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		let queryOR = {
// 			WHERE: {
// 				OR: [
// 					{
// 						GT: {
// 							test_fail: 19,
// 						},
// 					},
// 					{
// 						EQ: {
// 							test_dept: "biol",
// 						},
// 					},
// 				],
// 			},
// 		};
// 		let facade: InsightFacade;
// 		let dataset: Dataset;
// 		let sections: Section[];
// 		let sec1: Section;
// 		let sec2: Section;
// 		let sec3: Section;
// 		let sec4: Section;
// 		let sec5: Section;
// 		let collector: Collector;
//
// 		before(function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 			sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 			sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 			sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 			sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 			sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 			sections = [sec1, sec2, sec3, sec4, sec5];
// 			dataset = new Dataset("test", 5, sections, InsightDatasetKind.Sections);
// 			collector = new Collector([dataset]);
// 			facade.aDataset(dataset);
// 		});
//
// 		// it("executing WHERE branch (GT avg: 30)", function () {
// 		// 	const subWhere = queryGT30.WHERE;
// 		// 	const parsed = parseWhere(subWhere, "WHERE");
// 		// 	const parsedWhere = parsed.getChilds()[0];
// 		//
// 		// 	const result: any[] = collector.execWhere(parsedWhere);
// 		// 	expect(result).to.includes(sec1);
// 		// 	expect(result).to.includes(sec2);
// 		// 	expect(result).to.includes(sec3);
// 		// 	expect(result).to.includes(sec4);
// 		// 	expect(result).to.not.includes(sec5);
// 		// 	console.log(result);
// 		// });
// 		//
// 		// it("executing WHERE branch (avg > 59 AND fail < 5", function () {
// 		// 	const subWhere = queryAND.WHERE;
// 		// 	const parsed = parseWhere(subWhere, "WHERE");
// 		// 	const parsedWhere = parsed.getChilds()[0];
// 		//
// 		// 	const result: any[] = collector.execWhere(parsedWhere);
// 		// 	expect(result).to.includes(sec3);
// 		// 	expect(result).to.includes(sec2);
// 		// 	expect(result).to.not.includes(sec1);
// 		// 	expect(result).to.not.includes(sec4);
// 		// 	expect(result).to.not.includes(sec5);
// 		// });
// 		//
// 		// it("executing WHERE branch (fail > 19 OR dept = biol)", function () {
// 		// 	const subWhere = queryOR.WHERE;
// 		// 	const parsed = parseWhere(subWhere, "WHERE");
// 		// 	const parsedWhere = parsed.getChilds()[0];
// 		//
// 		// 	const result: any[] = collector.execWhere(parsedWhere);
// 		// 	expect(result).to.includes(sec3);
// 		// 	expect(result).to.includes(sec4);
// 		// 	expect(result).to.includes(sec5);
// 		// 	expect(result).to.not.includes(sec1);
// 		// 	expect(result).to.not.includes(sec2);
// 		// });
// 		//
// 		// it("executing WHERE branch (COMPLEX)", function () {
// 		// 	const subWhere = queryCOMPLEX.WHERE;
// 		// 	const parsed = parseWhere(subWhere, "WHERE");
// 		// 	const parsedWhere = parsed.getChilds()[0];
// 		//
// 		// 	const result: any[] = collector.execWhere(parsedWhere);
// 		// 	console.log(result);
// 		// 	expect(result).to.includes(sec1);
// 		// 	expect(result).to.includes(sec5);
// 		// 	expect(result).to.not.includes(sec2);
// 		// 	expect(result).to.not.includes(sec3);
// 		// 	expect(result).to.not.includes(sec4);
// 		// });
// 	});
//
// 	describe("performQueryFINAL", function () {
// 		let facade: InsightFacade;
// 		let qBasic = {
// 			WHERE: {
// 				GT: {
// 					ubc_avg: 97,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let qComplex = {
// 			WHERE: {
// 				OR: [
// 					{
// 						AND: [
// 							{
// 								GT: {
// 									ubc_avg: 90,
// 								},
// 							},
// 							{
// 								IS: {
// 									ubc_dept: "adhe",
// 								},
// 							},
// 						],
// 					},
// 					{
// 						EQ: {
// 							ubc_avg: 95,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let qBasicNoComparator = {
// 			WHERE: {},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let wc = {
// 			WHERE: {
// 				IS: {
// 					ubc_dept: "*asc*",
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let allComp = {
// 			WHERE: {
// 				OR: [
// 					{
// 						AND: [
// 							{
// 								GT: {
// 									ubc_avg: 50,
// 								},
// 							},
// 							{
// 								LT: {
// 									ubc_avg: 90,
// 								},
// 							},
// 							{
// 								EQ: {
// 									ubc_avg: 85,
// 								},
// 							},
// 							{
// 								IS: {
// 									ubc_dept: "*c",
// 								},
// 							},
// 						],
// 					},
// 					{
// 						NOT: {
// 							GT: {
// 								ubc_avg: 1,
// 							},
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let yr1900 = {
// 			WHERE: {
// 				EQ: {
// 					ubc_year: 1900,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let noWHERE = {
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 				ORDER: "ubc_avg",
// 			},
// 		};
// 		let noCOL: {
// 			WHERE: {
// 				GT: {
// 					ubc_avg: 97;
// 				};
// 			};
// 			OPTIONS: {
// 				ORDER: "ubc_avg";
// 			};
// 		};
// 		let stackedNotsOr = {
// 			WHERE: {
// 				NOT: {
// 					OR: [
// 						{
// 							NOT: {
// 								LT: {
// 									ubc_avg: 60,
// 								},
// 							},
// 						},
// 						{
// 							NOT: {
// 								IS: {
// 									ubc_dept: "biol",
// 								},
// 							},
// 						},
// 					],
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 			},
// 		};
// 		let lotsofnots = {
// 			WHERE: {
// 				NOT: {
// 					OR: [
// 						{
// 							NOT: {
// 								EQ: {
// 									ubc_avg: 95,
// 								},
// 							},
// 						},
// 						{
// 							NOT: {
// 								IS: {
// 									ubc_dept: "b*",
// 								},
// 							},
// 						},
// 					],
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["ubc_dept", "ubc_avg"],
// 			},
// 		};
// 		let invalid2Diffkeys = {
// 			WHERE: {
// 				GT: {
// 					sections_avg: 97,
// 					sections_fail: 99,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
// 		let valid2Order = {
// 			WHERE: {
// 				GT: {
// 					sections_avg: 97,
// 				},
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg"
// 			},
// 		};
// 		let invalid2Keys = {
// 			WHERE: {
// 				AND: [
// 					{
// 						IS: {
// 							sections_dept: "c*",
// 						},
// 						GT: {
// 							sections_avg: 97,
// 						},
// 					},
// 				],
// 			},
// 			OPTIONS: {
// 				COLUMNS: ["sections_dept", "sections_avg"],
// 				ORDER: "sections_avg",
// 			},
// 		};
// 		let pair: string;
//
// 		beforeEach(async function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 			await facade.initialize();
// 			pair = getContentFromArchives("pair.zip");
// 			await facade.addDataset("ubc", pair, InsightDatasetKind.Sections);
// 		});
//
// 		it("should execQuery (basic)", function () {
// 			const result = facade.performQuery(qBasic);
// 			expect(result).to.eventually.be.length(48);
// 		});
//
// 		it("should execQuery (complex)", function () {
// 			const result = facade.performQuery(qComplex);
// 			expect(result).to.eventually.be.length(50);
// 		});
//
// 		it("should execQuery (NO COMPARATOR)", function () {
// 			const result = facade.performQuery(qBasicNoComparator);
// 			expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 		});
//
// 		it("should execQuery (wildcard contains)", function () {
// 			const result = facade.performQuery(wc);
// 			// expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 		});
//
// 		it("should fail with too large", function () {
// 			const result = facade.performQuery(yr1900);
// 			expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 		});
//
// 		it("should fail missing where", function () {
// 			const result = facade.performQuery(noWHERE);
// 			expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail missing col", function () {
// 			const result = facade.performQuery(noCOL);
// 			expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should return w size 8", function () {
// 			const result = facade.performQuery(stackedNotsOr);
// 			expect(result).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should return correctly", function () {
// 			const result = facade.performQuery(lotsofnots);
// 			expect(result).to.eventually.be.length(2);
// 		});
//
// 		it("should return correctly", function () {
// 			const result = facade.performQuery(valid2Order);
// 			expect(result).to.eventually.be.length(2);
// 		});
//
// 		it("should return correctly", function () {
// 			const result = facade.performQuery(valid2Order);
// 			expect(result).to.eventually.be.length(2);
// 		});
// 	});
//
// 	describe("performQueryORDER", function () {
// 		let sections: string;
// 		let alt: string;
// 		let facade: InsightFacade;
//
// 		before(async function () {
// 			clearDisk();
// 			sections = getContentFromArchives("pair.zip");
// 			alt = getContentFromArchives("basic.zip");
// 			facade = new InsightFacade();
// 			await facade.initialize();
// 			await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
// 			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 		});
//
// 		function errorValidator(error: any): error is Error {
// 			return error === "InsightError" || error === "ResultTooLargeError";
// 		}
//
// 		type PQErrorKind = "ResultTooLargeError" | "InsightError";
//
// 		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 			"Dynamic InsightFacade PerformQuery tests Ordered",
// 			(input) => facade.performQuery(input),
// 			"./test/resources/queries",
// 			{
// 				assertOnResult: async (actual, expected) => {
// 					expect(actual).to.have.deep.members(await expected);
// 				},
// 				errorValidator: (error): error is PQErrorKind =>
// 					error === "ResultTooLargeError" || error === "InsightError",
// 				assertOnError: (actual, expected) => {
// 					if (expected === "InsightError") {
// 						assert.instanceOf(actual, InsightError);
// 					} else {
// 						assert.instanceOf(actual, ResultTooLargeError);
// 					}
// 				},
// 			}
// 		);
// 	});
//
// 	// describe("performQueryNoORDER", function () {
// 	// 	let sections: string;
// 	// 	let alt: string;
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(async function () {
// 	// 		clearDisk();
// 	// 		sections = getContentFromArchives("pair.zip");
// 	// 		alt = getContentFromArchives("basic.zip");
// 	// 		facade = new InsightFacade();
// 	// 		await facade.initialize();
// 	// 		await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
// 	// 		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 	// 		// facade.aDataset(new Dataset("sections", sections, InsightDatasetKind.Sections, sections.length));
// 	// 	});
// 	//
// 	// 	function errorValidator(error: any): error is Error {
// 	// 		return error === "InsightError" || error === "ResultTooLargeError";
// 	// 	}
// 	//
// 	// 	type PQErrorKind = "ResultTooLargeError" | "InsightError";
// 	//
// 	// 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 	// 		"Dynamic InsightFacade PerformQuery tests without Ordering",
// 	// 		(input) => facade.performQuery(input),
// 	// 		"./test/resources/queriesNoORDER",
// 	// 		{
// 	// 			assertOnResult: async (actual, expected) => {
// 	// 				// TODO add an assertion!
// 	// 				assert.equal(actual, expected);
// 	// 			},
// 	// 			errorValidator: (error): error is PQErrorKind =>
// 	// 				error === "ResultTooLargeError" || error === "InsightError",
// 	// 			assertOnError: (actual, expected) => {
// 	// 				if (expected === "InsightError") {
// 	// 					assert.instanceOf(actual, InsightError);
// 	// 				} else {
// 	// 					assert.instanceOf(actual, ResultTooLargeError);
// 	// 				}
// 	// 			},
// 	// 		}
// 	// 	);
// 	// });
// });
// });
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
	describe("validateCourseDataset", function () {
		it("should return True when a valid is passed in", async function () {
			let sections: string = getContentFromArchives("basic.zip");
			const result = await validateCourseDataset(sections, "test");
			return expect(result.success).to.be.true;
		});

		it("should return True when a valid dataset is passed in - 1 invalid section", async function () {
			let sections: string = getContentFromArchives("validOneSectionNoAVG.zip");
			const result = await validateCourseDataset(sections, "test");
			return expect(result.success).to.be.true;
		});

		it("should return False when a valid is passed in - no valid sections", async function () {
			let sections: string = getContentFromArchives("noAVG.zip");
			const result = await validateCourseDataset(sections, "test");
			return expect(result.success).to.be.false;
		});
	});
	//
	//	loads the datasets from '/data'
	describe("validateCourseDataset", function () {
		describe("getLatLongTests", function () {
			it("should return latitude and longitude for a valid address", async function () {
				const address: string = "2211 Wesbrook Mall";
				try {
					const [lat, lon] = await getLatLong(address);
					expect(lat).to.be.a("number");
					expect(lon).to.be.a("number");
					console.log({lat, lon});
				} catch (error) {
					expect.fail("Should not have thrown an error");
				}
			});

			it("should throw an error for an invalid address", async function () {
				const address: string = "Invalid Address";
				await expect(getLatLong(address)).to.be.rejectedWith(Error);
			});

			it("should throw an error for an empty address", async function () {
				await expect(getLatLong("")).to.be.rejectedWith(Error);
			});
		});

		describe("praseHTML tests", function () {
			it("should return tables", async function () {
				let campus = getContentFromArchives("campus.zip");
				const zip = await loadZipContent(campus);
				const indexFile = zip.file("index.htm");
				if (!indexFile) {
					throw new Error("index.htm not found in zip");
				}
				const htmlContent = await indexFile.async("string");
				return htmlParseBuilding(htmlContent, zip);
			});
		});
	});
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
	// describe("parseWhere", function () {
	// 	let root: Query;
	// 	let qBasicWhere: object;
	// 	let qComplexWhere: object;
	// 	let facade: InsightFacade;
	//
	// 	before(function () {
	// 		clearDisk();
	// 		facade = new InsightFacade();
	// 		qBasicWhere = {
	// 			WHERE: {
	// 				GT: [
	// 					{
	// 						sections_avg: 97,
	// 					},
	// 				],
	// 			},
	// 			OPTIONS: {
	// 				COLUMNS: ["sections_dept", "sections_avg"],
	// 				ORDER: "sections_avg",
	// 			},
	// 		};
	//
	// 		qComplexWhere = {
	// 			WHERE: {
	// 				OR: [
	// 					{
	// 						AND: [
	// 							{
	// 								GT: {
	// 									ubc_year: 2015,
	// 								},
	// 							},
	// 							{
	// 								IS: {
	// 									ubc_dept: "adhe",
	// 								},
	// 							},
	// 						],
	// 					},
	// 					{
	// 						EQ: {
	// 							ubc_avg: 95,
	// 						},
	// 					},
	// 				],
	// 			},
	// 		};
	// 	});
	//
	// 	it("should properly parse query WHERE (basic)", function () {
	// 		for (const k in qBasicWhere) {
	// 			if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
	// 				let subQuery: object = (qBasicWhere as any)[k];
	// 				if (k === "WHERE") {
	// 					const where = parseWhere(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	//
	// 	it("should properly parse query WHERE (complex)", function () {
	// 		// const where!: QueryNode;
	// 		for (const k in qComplexWhere) {
	// 			if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
	// 				let subQuery: object = (qComplexWhere as any)[k];
	// 				if (k === "WHERE") {
	// 					const where = parseWhere(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	// });
	//
	// describe("parseOpts", function () {
	// 	let root: Query;
	// 	let optsBasic = {
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
	// 			ORDER: ["sections_avg"],
	// 		},
	// 	};
	// 	let optsNoOrder = {
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_avg"],
	// 		},
	// 	};
	// 	let opts1Col = {
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_uuid"],
	// 			ORDER: "sections_avg",
	// 		},
	// 	};
	// 	let facade: InsightFacade;
	//
	// 	before(function () {
	// 		clearDisk();
	// 		facade = new InsightFacade();
	// 	});
	//
	// 	it("should parse options", function () {
	// 		for (const k in optsBasic) {
	// 			if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
	// 				let subQuery: object = (optsBasic as any)[k];
	// 				if (k === "OPTIONS") {
	// 					const where = parseOpts(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	//
	// 	it("should parse options 1 col", function () {
	// 		// const where!: QueryNode;
	// 		for (const k in opts1Col) {
	// 			if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
	// 				let subQuery: object = (opts1Col as any)[k];
	// 				if (k === "OPTIONS") {
	// 					const where = parseOpts(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	//
	// 	it("should parse options (no order)", function () {
	// 		// const where!: QueryNode;
	// 		for (const k in optsNoOrder) {
	// 			if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
	// 				let subQuery: object = (optsNoOrder as any)[k];
	// 				if (k === "OPTIONS") {
	// 					const where = parseOpts(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	// });
	//
	// describe("parseOpts", function () {
	// 	let root: Query;
	// 	let optsBasic = {
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
	// 			ORDER: "sections_avg",
	// 		},
	// 	};
	// 	let optsNoOrder = {
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_avg"],
	// 		},
	// 	};
	// 	let opts1Col = {
	// 		OPTIONS: {
	// 			COLUMNS: ["sections_uuid"],
	// 			ORDER: "sections_avg",
	// 		},
	// 	};
	// 	let facade: InsightFacade;
	//
	// 	before(function () {
	// 		clearDisk();
	// 		facade = new InsightFacade();
	// 	});
	//
	// 	it("should parse options", function () {
	// 		// const where!: QueryNode;
	// 		for (const k in optsBasic) {
	// 			if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
	// 				let subQuery: object = (optsBasic as any)[k];
	// 				if (k === "OPTIONS") {
	// 					const where = parseOpts(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	//
	// 	it("should parse options 1 col", function () {
	// 		// const where!: QueryNode;
	// 		for (const k in opts1Col) {
	// 			if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
	// 				let subQuery: object = (opts1Col as any)[k];
	// 				if (k === "OPTIONS") {
	// 					const where = parseOpts(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	//
	// 	it("should parse options (no order)", function () {
	// 		// const where!: QueryNode;
	// 		for (const k in optsNoOrder) {
	// 			if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
	// 				let subQuery: object = (optsNoOrder as any)[k];
	// 				if (k === "OPTIONS") {
	// 					const where = parseOpts(subQuery, k);
	// 					checkParsing(where, 0);
	// 				}
	// 			}
	// 		}
	// 	});
	// });

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

		// it("executing WHERE branch (GT avg: 30)", function () {
		// 	const subWhere = queryGT30.WHERE;
		// 	const parsed = parseWhere(subWhere, "WHERE");
		// 	const parsedWhere = parsed.getChilds()[0];
		//
		// 	const result: any[] = collector.execWhere(parsedWhere);
		// 	expect(result).to.includes(sec1);
		// 	expect(result).to.includes(sec2);
		// 	expect(result).to.includes(sec3);
		// 	expect(result).to.includes(sec4);
		// 	expect(result).to.not.includes(sec5);
		// 	console.log(result);
		// });
		//
		// it("executing WHERE branch (avg > 59 AND fail < 5", function () {
		// 	const subWhere = queryAND.WHERE;
		// 	const parsed = parseWhere(subWhere, "WHERE");
		// 	const parsedWhere = parsed.getChilds()[0];
		//
		// 	const result: any[] = collector.execWhere(parsedWhere);
		// 	expect(result).to.includes(sec3);
		// 	expect(result).to.includes(sec2);
		// 	expect(result).to.not.includes(sec1);
		// 	expect(result).to.not.includes(sec4);
		// 	expect(result).to.not.includes(sec5);
		// });
		//
		// it("executing WHERE branch (fail > 19 OR dept = biol)", function () {
		// 	const subWhere = queryOR.WHERE;
		// 	const parsed = parseWhere(subWhere, "WHERE");
		// 	const parsedWhere = parsed.getChilds()[0];
		//
		// 	const result: any[] = collector.execWhere(parsedWhere);
		// 	expect(result).to.includes(sec3);
		// 	expect(result).to.includes(sec4);
		// 	expect(result).to.includes(sec5);
		// 	expect(result).to.not.includes(sec1);
		// 	expect(result).to.not.includes(sec2);
		// });
		//
		// it("executing WHERE branch (COMPLEX)", function () {
		// 	const subWhere = queryCOMPLEX.WHERE;
		// 	const parsed = parseWhere(subWhere, "WHERE");
		// 	const parsedWhere = parsed.getChilds()[0];
		//
		// 	const result: any[] = collector.execWhere(parsedWhere);
		// 	console.log(result);
		// 	expect(result).to.includes(sec1);
		// 	expect(result).to.includes(sec5);
		// 	expect(result).to.not.includes(sec2);
		// 	expect(result).to.not.includes(sec3);
		// 	expect(result).to.not.includes(sec4);
		// });
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
					sections_avg: 97,
				},
			},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg"],
				ORDER: "sections_avg",
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

	// describe("performQueryORDER", function () {
	// 	let sections: string;
	// 	let alt: string;
	// 	let rooms: string;
	// 	let facade: InsightFacade;
	//
	// 	before(async function () {
	// 		clearDisk();
	// 		sections = getContentFromArchives("pair.zip");
	// 		alt = getContentFromArchives("basic.zip");
	// 		rooms = getContentFromArchives("campus.zip");
	// 		facade = new InsightFacade();
	// 		await facade.initialize();
	// 		await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
	// 		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
	// 		await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
	// 	});
	//
	// 	function errorValidator(error: any): error is Error {
	// 		return error === "InsightError" || error === "ResultTooLargeError";
	// 	}
	//
	// 	type PQErrorKind = "ResultTooLargeError" | "InsightError";
	//
	// 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
	// 		"Dynamic InsightFacade PerformQuery tests Ordered",
	// 		(input) => facade.performQuery(input),
	// 		"./test/resources/queries",
	// 		{
	// 			assertOnResult: async (actual, expected) => {
	// 				expect(actual).to.have.deep.members(await expected);
	// 			},
	// 			errorValidator: (error): error is PQErrorKind =>
	// 				error === "ResultTooLargeError" || error === "InsightError",
	// 			assertOnError: (actual, expected) => {
	// 				if (expected === "InsightError") {
	// 					assert.instanceOf(actual, InsightError);
	// 				} else {
	// 					assert.instanceOf(actual, ResultTooLargeError);
	// 				}
	// 			},
	// 		}
	// 	);
	// });

	// describe("performQueryNoORDER", function () {
	// 	let sections: string;
	// 	let alt: string;
	// 	let facade: InsightFacade;
	//
	// 	before(async function () {
	// 		clearDisk();
	// 		sections = getContentFromArchives("pair.zip");
	// 		alt = getContentFromArchives("basic.zip");
	// 		facade = new InsightFacade();
	// 		await facade.initialize();
	// 		await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
	// 		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
	// 		// facade.aDataset(new Dataset("sections", sections, InsightDatasetKind.Sections, sections.length));
	// 	});
	//
	// 	function errorValidator(error: any): error is Error {
	// 		return error === "InsightError" || error === "ResultTooLargeError";
	// 	}
	//
	// 	type PQErrorKind = "ResultTooLargeError" | "InsightError";
	//
	// 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
	// 		"Dynamic InsightFacade PerformQuery tests without Ordering",
	// 		(input) => facade.performQuery(input),
	// 		"./test/resources/queriesNoORDER",
	// 		{
	// 			assertOnResult: async (actual, expected) => {
	// 				// TODO add an assertion!
	// 				assert.equal(actual, expected);
	// 			},
	// 			errorValidator: (error): error is PQErrorKind =>
	// 				error === "ResultTooLargeError" || error === "InsightError",
	// 			assertOnError: (actual, expected) => {
	// 				if (expected === "InsightError") {
	// 					assert.instanceOf(actual, InsightError);
	// 				} else {
	// 					assert.instanceOf(actual, ResultTooLargeError);
	// 				}
	// 			},
	// 		}
	// 	);
	// });
});
//
// 	describe("InsightFacade", function () {
//
// 		describe("addDataset", function () {
// 			let sections: string;
// 			let sectionsInvalid: string;
// 			let pair: string;
// 			let facade: InsightFacade;
// 			let noaudit: string;
// 			let noavg: string;
// 			let nopass: string;
// 			let nofail: string;
// 			let noid: string;
// 			let noinst: string;
// 			let nodept: string;
// 			let notitle: string;
// 			let noyear: string;
// 			let nouuid: string;
//
// 			before(function () {
// 				sections = getContentFromArchives("basic.zip");
// 				sectionsInvalid = getContentFromArchives("invalid.zip");
// 				pair = getContentFromArchives("pair.zip");
//
// 				// invalid sections
// 				noaudit = getContentFromArchives("noAUDIT.zip");
// 				noavg = getContentFromArchives("noAVG.zip");
// 				nodept = getContentFromArchives("noDEPT.zip");
// 				nofail = getContentFromArchives("noFAIL.zip");
// 				noid = getContentFromArchives("noID.zip");
// 				noinst = getContentFromArchives("noINSTRUCTOR.zip");
// 				nopass = getContentFromArchives("noPASS.zip");
// 				notitle = getContentFromArchives("noTITLE.zip");
// 				nouuid = getContentFromArchives("noUUID.zip");
// 				noyear = getContentFromArchives("noYEAR.zip");
// 			});
//
// 			beforeEach(async function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should successfully add a dataset (first)", function () {
// 				const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.have.members(["ubc"]);
// 			});
//
// 			it("should successfully add a dataset (second)", function () {
// 				const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.have.members(["ubc"]);
// 			});
//
// 			it("should successfully access dataset after crash", async function () {
// 				await facade.addDataset("basic", sections, InsightDatasetKind.Sections);
// 				// new instance made
// 				facade = new InsightFacade();
//
// 				const result = await facade.listDatasets();
// 				expect(result).to.deep.equal([
// 					{
// 						id: "basic",
// 						kind: InsightDatasetKind.Sections,
// 						numRows: 119,
// 					},
// 				]);
// 			});
//
// 			it("should still be able to remove dataset after crash", async function () {
// 				await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 				// new instance made
// 				facade = new InsightFacade();
//
// 				await facade.removeDataset("pair");
// 				const result = await facade.listDatasets();
// 				expect(result).to.deep.equal([]);
// 			});
//
// 			it("should not be able to remove dataset after removal + crash", async function () {
// 				await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 				await facade.removeDataset("pair");
// 				// new instance made
//
// 				facade = new InsightFacade();
//
// 				const result = facade.removeDataset("pair");
// 				return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 			});
//
// 			it("should be able to add dataset after removal + crash", async function () {
// 				this.timeout(5000);
// 				await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 				await facade.removeDataset("pair");
// 				// new instance made
//
// 				facade = new InsightFacade();
//
// 				const result = await facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 				expect(result).to.deep.equal(["pair"]);
// 			});
//
// 			it("should successfully add 2 datasets", async function () {
// 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				const result = facade.addDataset("pair", pair, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.have.members(["ubc", "pair"]);
// 			});
//
// 			it("should reject with an empty dataset id", function () {
// 				const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with a whitespace id", function () {
// 				const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with a invalid rooms kind", function () {
// 				const result = facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			// INVALID SECTION TESTS
// 			it("should reject with an invalid dataset (no valid sections)", function () {
// 				const result = facade.addDataset("ubc", sectionsInvalid, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing avg)", function () {
// 				const result = facade.addDataset("test", noavg, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing pass)", function () {
// 				const result = facade.addDataset("test", nopass, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing fail)", function () {
// 				const result = facade.addDataset("test", nofail, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing audit)", function () {
// 				const result = facade.addDataset("test", noaudit, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing year)", function () {
// 				const result = facade.addDataset("test", noyear, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing dept)", function () {
// 				const result = facade.addDataset("test", nodept, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing id)", function () {
// 				const result = facade.addDataset("test", noid, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing instructor)", function () {
// 				const result = facade.addDataset("test", noinst, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing title)", function () {
// 				const result = facade.addDataset("ubc", notitle, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with an invalid section (missing uuid)", function () {
// 				const result = facade.addDataset("test", nouuid, InsightDatasetKind.Sections);
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
// 		});
//
// 		describe("removeDataset", function () {
// 			let sections: string;
// 			// let sectionsInvalid: string;
// 			let facade: InsightFacade;
// 			let data: Dataset;
// 			let basic: string;
// 			sections = getContentFromArchives("cs110.zip");
// 			basic = getContentFromArchives("basic.zip");
// 			before(async function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should successfully remove dataset", async function () {
// 				// added await here
// 				await facade.addDataset("basic", basic, InsightDatasetKind.Sections);
// 				const result = await facade.removeDataset("basic");
// 				expect(result).to.deep.equal("basic");
// 			});
//
// 			it("should reject with nonexistent id (already removed)", function () {
// 				const result = facade.removeDataset("basic");
// 				return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 			});
//
// 			it("should reject with nonexistent id (not found)", function () {
// 				const result = facade.removeDataset("ubc1");
// 				return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 			});
//
// 			it("should reject with invalid id (whitespace)", function () {
// 				const result = facade.removeDataset("");
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should reject with invalid id (underscore)", function () {
// 				const result = facade.removeDataset("u_bc");
// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
// 		});
//
// 		describe("listDatasets", function () {
// 			let set1: string;
// 			let set2: string;
// 			let facade: InsightFacade;
//
// 			before(async function () {
// 				set1 = getContentFromArchives("cs110.zip");
// 				set2 = getContentFromArchives("cs121.zip");
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should list 0 dataset", async function () {
// 				const result = await facade.listDatasets();
// 				expect(result).to.deep.equal([]);
// 			});
//
// 			it("should reject with nonexistent id (already removed)", async function () {
// 				await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 				await facade.removeDataset("cs121");
// 				const result = facade.removeDataset("cs121");
// 				return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 			});
//
// 			it("should reject with nonexistent id (not found)", function () {
// 				const result = facade.removeDataset("1823");
// 				return expect(result).to.eventually.be.rejectedWith(NotFoundError);
// 			});
//
// 			it("should list 2 dataset", async function () {
// 				await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 				await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 				const result = await facade.listDatasets();
//
// 				expect(result.length).to.equal(2);
// 			});
//
// 			it("should list 1 dataset (after removal)", async function () {
// 				await facade.removeDataset("cs121");
// 				const result = await facade.listDatasets();
//
// 				expect(result).to.deep.equal([
// 					{
// 						id: "cs110",
// 						kind: InsightDatasetKind.Sections,
// 						numRows: 1,
// 					},
// 				]);
// 			});
//
// 			it("should list 0 dataset (after removal)", async function () {
// 				await facade.removeDataset("cs110");
// 				const result = await facade.listDatasets();
// 				expect(result).to.deep.equal([]);
// 			});
//
// 			it("should list 2 dataset (both in same test)", async function () {
// 				await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 				await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
//
// 				const result = await facade.listDatasets();
// 				expect(result).to.deep.equal([
// 					{
// 						id: "cs110",
// 						kind: InsightDatasetKind.Sections,
// 						numRows: 1,
// 					},
// 					{
// 						id: "cs121",
// 						kind: InsightDatasetKind.Sections,
// 						numRows: 1,
// 					},
// 				]);
// 			});
//
// 			it("should list 0 dataset (both del in same test)", async function () {
// 				await facade.removeDataset("cs110");
// 				await facade.removeDataset("cs121");
//
// 				const result = await facade.listDatasets();
// 				expect(result).to.deep.equal([]);
// 			});
// 		});
//
// 		/*
// 		 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
// 		 * You should not need to modify it; instead, add additional files to the queries directory.
// 		 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
// 		 */
// 		// describe("PerformQuery", () => {
// 		// 	let facade = InsightFacade;
// 		// 	let alt = string;
// 		// 	let sections = string;
// 		// 	before(async function () {
// 		// 		console.info(`Before: ${this.test?.parent?.title}`);
// 		//
// 		// 		facade = new InsightFacade();
// 		//
// 		//
// 		// 		// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
// 		// 		// Will *fail* if there is a problem reading ANY dataset.
// 		// 		const loadDatasetPromises = [
// 		// 			facade.addDataset("sections", sections, InsightDatasetKind.Sections),
// 		// 		];
// 		//
// 		// 		return Promise.all(loadDatasetPromises);
// 		// 	});
// 		//
// 		// 	it("should list 0 dataset", async function () {
// 		// 		const result = await facade.listDatasets();
// 		// 		expect(result).to.deep.equal([]);
// 		// 	});
// 		//
// 		// 	it("should list 1 dataset", async function () {
// 		// 		await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 		// 		const result = await facade.listDatasets();
// 		//
// 		// 		expect(result).to.deep.equal([{
// 		// 			id: "cs110",
// 		// 			kind: InsightDatasetKind.Sections,
// 		// 			numRows: 1
// 		// 		}]);
// 		// 	});
// 		//
// 		// 	it("should list 2 dataset", async function () {
// 		// 		await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 		// 		const result = await facade.listDatasets();
// 		//
// 		// 		expect(result).to.deep.equal([{
// 		// 			id: "cs110",
// 		// 			kind: InsightDatasetKind.Sections,
// 		// 			numRows: 1
// 		// 		}, {
// 		// 			id: "cs121",
// 		// 			kind: InsightDatasetKind.Sections,
// 		// 			numRows: 1
// 		// 		}]);
// 		// 	});
// 		//
// 		// 	it("should list 1 dataset (after removal)", async function () {
// 		// 		await facade.removeDataset("cs121");
// 		// 		const result = await facade.listDatasets();
// 		//
// 		// 		expect(result).to.deep.equal([{
// 		// 			id: "cs110",
// 		// 			kind: InsightDatasetKind.Sections,
// 		// 			numRows: 1
// 		// 		}]);
// 		// 	});
// 		//
// 		// 	it("should list 0 dataset (after removal)", async function () {
// 		// 		await facade.removeDataset("cs110");
// 		// 		const result = await facade.listDatasets();
// 		// 		expect(result).to.deep.equal([]);
// 		// 	});
// 		//
// 		//
// 		// 	it("should list 2 dataset (both in same test)", async function () {
// 		// 		await facade.addDataset("cs110", set1, InsightDatasetKind.Sections);
// 		// 		await facade.addDataset("cs121", set2, InsightDatasetKind.Sections);
// 		//
// 		// 		const result = await facade.listDatasets();
// 		// 		expect(result).to.deep.equal([{
// 		// 			id: "cs110",
// 		// 			kind: InsightDatasetKind.Sections,
// 		// 			numRows: 1
// 		// 		}, {
// 		// 			id: "cs121",
// 		// 			kind: InsightDatasetKind.Sections,
// 		// 			numRows: 1
// 		// 		}]);
// 		// 	});
// 		//
// 		// 	it("should list 0 dataset (both del in same test)", async function () {
// 		// 		await facade.removeDataset("cs110");
// 		// 		await facade.removeDataset("cs121");
// 		//
// 		// 		const result = await facade.listDatasets();
// 		// 		expect(result).to.deep.equal([]);
// 		// 	});
// 		// });
// 		//
// 		//
// 		// /*
// 		//  * This test suite dynamically generates tests from the JSON files in test/resources/queries.
// 		//  * You should not need to modify it; instead, add additional files to the queries directory.
// 		//  * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
// 		//  */
// 		// // describe("PerformQuery", () => {
// 		// // 	let facade = InsightFacade;
// 		// // 	let alt = string;
// 		// // 	let sections = string;
// 		// // 	before(function () {
// 		// // 		console.info(`Before: ${this.test?.parent?.title}`);
// 		// //
// 		// // 		facade = new InsightFacade();
// 		// //
// 		// // 		// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
// 		// // 		// Will *fail* if there is a problem reading ANY dataset.
// 		// // 		const loadDatasetPromises = [
// 		// // 			facade.addDataset("sections", sections, InsightDatasetKind.Sections),
// 		// // 		];
// 		// //
// 		// // 		return Promise.all(loadDatasetPromises);
// 		// // 	});
// 		// //
// 		// // 	after(function () {
// 		// // 		console.info(`After: ${this.test?.parent?.title}`);
// 		// // 		clearDisk();
// 		// // 	});
// 		// //
// 		// //
// 		// // 	folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 		// // 		"Dynamic InsightFacade PerformQuery tests",
// 		// // 		(input) => facade.performQuery(input),
// 		// // 		"./test/resources/queries",
// 		// // 		{
// 		// // 			assertOnResult: (actual, expected) => {
// 		// // 				// TODO add an assertion!
// 		// // 			},
// 		// // 			errorValidator: (error): error is PQErrorKind =>
// 		// // 				error === "ResultTooLargeError" || error === "InsightError",
// 		// // 			assertOnError: (actual, expected) => {
// 		// // 				// TODO add an assertion!
// 		// // 			},
// 		// // 		}
// 		// // 	);
// 		// // });
// 		//
// 		//
// 		describe("parseWhere", function () {
// 			let root: Query;
// 			let qBasicWhere: object;
// 			let qComplexWhere: object;
// 			let facade: InsightFacade;
//
// 			before(function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 				qBasicWhere = {
// 					WHERE: {
// 						GT: [
// 							{
// 								sections_avg: 97,
// 							},
// 						],
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "sections_avg"],
// 						ORDER: "sections_avg",
// 					},
// 				};
//
// 				qComplexWhere = {
// 					WHERE: {
// 						OR: [
// 							{
// 								AND: [
// 									{
// 										GT: {
// 											ubc_year: 2015,
// 										},
// 									},
// 									{
// 										IS: {
// 											ubc_dept: "adhe",
// 										},
// 									},
// 								],
// 							},
// 							{
// 								EQ: {
// 									ubc_avg: 95,
// 								},
// 							},
// 						],
// 					},
// 				};
// 			});
//
// 			it("should properly parse query WHERE (basic)", function () {
// 				for (const k in qBasicWhere) {
// 					if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
// 						let subQuery: object = (qBasicWhere as any)[k];
// 						if (k === "WHERE") {
// 							const where = parseWhere(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
//
// 			it("should properly parse query WHERE (complex)", function () {
// 				// const where!: QueryNode;
// 				for (const k in qComplexWhere) {
// 					if (Object.prototype.hasOwnProperty.call(qBasicWhere, k)) {
// 						let subQuery: object = (qComplexWhere as any)[k];
// 						if (k === "WHERE") {
// 							const where = parseWhere(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
// 		});
//
// 		describe("parseOpts", function () {
// 			let root: Query;
// 			let optsBasic = {
// 				OPTIONS: {
// 					COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
// 					ORDER: ["sections_avg"],
// 				},
// 			};
// 			let optsNoOrder = {
// 				OPTIONS: {
// 					COLUMNS: ["sections_avg"],
// 				},
// 			};
// 			let opts1Col = {
// 				OPTIONS: {
// 					COLUMNS: ["sections_uuid"],
// 					ORDER: "sections_avg",
// 				},
// 			};
// 			let facade: InsightFacade;
//
// 			before(function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should parse options", function () {
// 				for (const k in optsBasic) {
// 					if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
// 						let subQuery: object = (optsBasic as any)[k];
// 						if (k === "OPTIONS") {
// 							const where = parseOpts(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
//
// 			it("should parse options 1 col", function () {
// 				// const where!: QueryNode;
// 				for (const k in opts1Col) {
// 					if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
// 						let subQuery: object = (opts1Col as any)[k];
// 						if (k === "OPTIONS") {
// 							const where = parseOpts(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
//
// 			it("should parse options (no order)", function () {
// 				// const where!: QueryNode;
// 				for (const k in optsNoOrder) {
// 					if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
// 						let subQuery: object = (optsNoOrder as any)[k];
// 						if (k === "OPTIONS") {
// 							const where = parseOpts(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
// 		});
//
// 		describe("parseOpts", function () {
// 			let root: Query;
// 			let optsBasic = {
// 				OPTIONS: {
// 					COLUMNS: ["sections_avg", "sections_dept", "sections_id"],
// 					ORDER: "sections_avg",
// 				},
// 			};
// 			let optsNoOrder = {
// 				OPTIONS: {
// 					COLUMNS: ["sections_avg"],
// 				},
// 			};
// 			let opts1Col = {
// 				OPTIONS: {
// 					COLUMNS: ["sections_uuid"],
// 					ORDER: "sections_avg",
// 				},
// 			};
// 			let facade: InsightFacade;
//
// 			before(function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should parse options", function () {
// 				// const where!: QueryNode;
// 				for (const k in optsBasic) {
// 					if (Object.prototype.hasOwnProperty.call(optsBasic, k)) {
// 						let subQuery: object = (optsBasic as any)[k];
// 						if (k === "OPTIONS") {
// 							const where = parseOpts(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
//
// 			it("should parse options 1 col", function () {
// 				// const where!: QueryNode;
// 				for (const k in opts1Col) {
// 					if (Object.prototype.hasOwnProperty.call(opts1Col, k)) {
// 						let subQuery: object = (opts1Col as any)[k];
// 						if (k === "OPTIONS") {
// 							const where = parseOpts(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
//
// 			it("should parse options (no order)", function () {
// 				// const where!: QueryNode;
// 				for (const k in optsNoOrder) {
// 					if (Object.prototype.hasOwnProperty.call(optsNoOrder, k)) {
// 						let subQuery: object = (optsNoOrder as any)[k];
// 						if (k === "OPTIONS") {
// 							const where = parseOpts(subQuery, k);
// 							checkParsing(where, 0);
// 						}
// 					}
// 				}
// 			});
// 		});
//
// 		// describe("performQuery", function () {
// 		// 	let facade: InsightFacade;
// 		// 	let qBasic = {
// 		// 		WHERE: {
// 		// 			GT: {
// 		// 				test_avg: 50,
// 		// 			},
// 		// 		},
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["test_dept", "test_avg"],
// 		// 			ORDER: "test_dept",
// 		// 		},
// 		// 	};
// 		// 	let qComplex = {
// 		// 		WHERE: {
// 		// 			OR: [
// 		// 				{
// 		// 					AND: [
// 		// 						{
// 		// 							EQ: {
// 		// 								test_audit: 0,
// 		// 							},
// 		// 						},
// 		// 						{
// 		// 							IS: {
// 		// 								test_instructor: "*drew",
// 		// 							},
// 		// 						},
// 		// 					],
// 		// 				},
// 		// 				{
// 		// 					IS: {
// 		// 						test_title: "biology",
// 		// 					},
// 		// 				},
// 		// 			],
// 		// 		},
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["test_dept", "test_title", "test_avg", "test_pass"],
// 		// 			ORDER: "test_avg",
// 		// 		},
// 		// 	};
// 		// 	let qBasicNoComparator= {
// 		// 		WHERE: {
// 		// 		},
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["test_dept", "test_avg"],
// 		// 			ORDER: "test_dept",
// 		// 		},
// 		// 	};
// 		// 	let qBasicInvKey: object;
// 		// 	let sec1;
// 		// 	let sec2;
// 		// 	let sec3;
// 		// 	let sec4;
// 		// 	let sec5;
// 		// 	let sections: Section[];
// 		// 	let dataset: Dataset;
// 		//
// 		// 	before(function () {
// 		// 		clearDisk();
// 		// 		facade = new InsightFacade();
// 		// 		qBasicInvKey = {
// 		// 			WHERE: {
// 		// 				GT: {
// 		// 					sections_avg: "string",
// 		// 				},
// 		// 			},
// 		// 		};
// 		// 		sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 		// 		sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2021, 85, 49, 1, 0);
// 		// 		sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2020, 60, 25, 25, 0);
// 		// 		sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 		// 		sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 		// 		sections = [sec1, sec2, sec3, sec4, sec5];
// 		// 		dataset = new Dataset("test", InsightDatasetKind.Sections, sections, 4);
// 		// 		facade.aDataset(dataset);
// 		// 	});
// 		//
// 		// 	it("should execQuery (basic)", function () {
// 		// 		const where = qBasic.WHERE;
// 		// 		const parsedwhere = parseWhere(where, "WHERE");
// 		// 		const options = qBasic.OPTIONS;
// 		// 		const parsedopts = parseOpts(options, "OPTIONS");
// 		// 		const query = new Query(parsedwhere, parsedopts);
// 		// 		const collector = new Collector([dataset]);
// 		// 		const result = collector.execQuery(query);
// 		// 		console.log(result);
// 		// 	});
// 		//
// 		// 	it("should execQuery (complex)", function () {
// 		// 		const where = qComplex.WHERE;
// 		// 		const parsedwhere = parseWhere(where, "WHERE");
// 		// 		const options = qComplex.OPTIONS;
// 		// 		const parsedopts = parseOpts(options, "OPTIONS");
// 		// 		const query = new Query(parsedwhere, parsedopts);
// 		// 		const collector = new Collector([dataset]);
// 		// 		const result = collector.execQuery(query);
// 		// 		console.log(result);
// 		// 	});
// 		//
// 		// 	it("should execQuery (NO COMPARATOR)", function () {
// 		// 		const where = qBasicNoComparator.WHERE;
// 		// 		const parsedwhere = parseWhere(where, "WHERE");
// 		// 		const options = qBasicNoComparator.OPTIONS;
// 		// 		const parsedopts = parseOpts(options, "OPTIONS");
// 		// 		const query = new Query(parsedwhere, parsedopts);
// 		// 		const collector = new Collector([dataset]);
// 		// 		const result = collector.execQuery(query);
// 		// 		console.log(result);
// 		// 	});
// 		// });
//
// 		// describe("validationTests", function () {
// 		// 	let optsEmptyCol = {
// 		// 		OPTIONS: {
// 		// 			COLUMNS: [],
// 		// 			ORDER: "ubc_avg",
// 		// 		},
// 		// 	};
// 		// 	let optsValid = {
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 		// 			ORDER: "ubc_avg",
// 		// 		},
// 		// 	};
// 		// 	let optsOrderFirst = {
// 		// 		OPTIONS: {
// 		// 			ORDER: "ubc_avg",
// 		// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 		// 		},
// 		// 	};
// 		// 	let optsOrderNotInCol = {
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 		// 			ORDER: "ubc_pass",
// 		// 		},
// 		// 	};
// 		// 	let optsInvKeyOrd = {
// 		// 		OPTIONS: {
// 		// 			ORDER: "ubc_aaaa",
// 		// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 		// 		},
// 		// 	};
// 		// 	let optsInvKeyCol = {
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["ubc_dept", "ubc_idddd", "ubc_avg"],
// 		// 			ORDER: "ubc_avg",
// 		// 		},
// 		// 	};
// 		// 	let optsNoOrder = {
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 		// 		},
// 		// 	};
// 		//
// 		// 	let where2Key = {
// 		// 		WHERE: {
// 		// 			GT: {
// 		// 				sections_avg: 97,
// 		// 			},
// 		// 		},
// 		// 		OPTIONS: {
// 		// 			COLUMNS: ["sections_dept", "sections_avg"],
// 		// 			ORDER: "sections_avg",
// 		// 		},
// 		// 	};
// 		// 	let validator: Validator;
// 		// 	let facade: InsightFacade;
// 		//
// 		// 	before(function () {
// 		// 		clearDisk();
// 		// 		facade = new InsightFacade();
// 		// 		validator = new Validator([]);
// 		// 	});
// 		//
// 		// 	it("should validate OPTS", function () {
// 		// 		const opt = Object.keys(optsValid)[0];
// 		// 		const sub = optsValid.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(0);
// 		// 	});
// 		//
// 		// 	it("should validate where2key, with the first removed", function () {
// 		// 		const where = Object.keys(where2Key)[0];
// 		// 		const sub = where2Key.WHERE;
// 		// 		const node = parseWhere(sub, where);
// 		// 		const result = validator.validWhere(node);
// 		// 		expect(result).to.equal(0);
// 		// 	});
// 		//
// 		// 	it("should validate OPTS, (ORDER FIRST)", function () {
// 		// 		const opt = Object.keys(optsOrderFirst)[0];
// 		// 		const sub = optsOrderFirst.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(0);
// 		// 	});
// 		//
// 		// 	it("should validate OPTS, (ORDER NOT MATCHING COl)", function () {
// 		// 		const opt = Object.keys(optsOrderNotInCol)[0];
// 		// 		const sub = optsOrderNotInCol.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(1);
// 		// 	});
// 		//
// 		// 	it("should not validate OPTS (empty COLUMNS)", function () {
// 		// 		const opt = Object.keys(optsEmptyCol)[0];
// 		// 		const sub = optsEmptyCol.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(1);
// 		// 	});
// 		//
// 		// 	it("should not validate OPTS (invalid key in COLUMNS )", function () {
// 		// 		const opt = Object.keys(optsInvKeyCol)[0];
// 		// 		const sub = optsInvKeyOrd.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(1);
// 		// 	});
// 		//
// 		// 	it("should not validate OPTS (invalid key in ORDER)", function () {
// 		// 		const opt = Object.keys(optsInvKeyOrd)[0];
// 		// 		const sub = optsInvKeyOrd.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(1);
// 		// 	});
// 		//
// 		// 	it("should validate, (no ORDER)", function () {
// 		// 		const opt = Object.keys(optsNoOrder)[0];
// 		// 		const sub = optsNoOrder.OPTIONS;
// 		// 		const node = parseOpts(sub, opt);
// 		// 		const result = validator.validateOptions(node);
// 		// 		expect(result).to.equal(0);
// 		// 	});
// 		// });
//
// 		describe("execWhere", function () {
// 			let queryGT30 = {
// 				WHERE: {
// 					GT: {
// 						test_avg: 30,
// 					},
// 				},
// 			};
// 			let queryAND = {
// 				WHERE: {
// 					AND: [
// 						{
// 							EQ: {
// 								test_year: 2015,
// 							},
// 						},
// 						{
// 							GT: {
// 								test_avg: 45,
// 							},
// 						},
// 					],
// 				},
// 			};
// 			let queryCOMPLEX = {
// 				WHERE: {
// 					OR: [
// 						{
// 							AND: [
// 								{
// 									EQ: {
// 										test_year: 2020,
// 									},
// 								},
// 								{
// 									LT: {
// 										test_fail: 20,
// 									},
// 								},
// 							],
// 						},
// 						{
// 							IS: {
// 								test_id: "300",
// 							},
// 						},
// 					],
// 				},
// 			};
// 			let queryOR = {
// 				WHERE: {
// 					OR: [
// 						{
// 							GT: {
// 								test_fail: 19,
// 							},
// 						},
// 						{
// 							EQ: {
// 								test_dept: "biol",
// 							},
// 						},
// 					],
// 				},
// 			};
// 			let facade: InsightFacade;
// 			let dataset: Dataset;
// 			let sections: Section[];
// 			let sec1: Section;
// 			let sec2: Section;
// 			let sec3: Section;
// 			let sec4: Section;
// 			let sec5: Section;
// 			let collector: Collector;
//
// 			before(function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 				sec1 = new Section("01", "110", "comptn, progrmng", "david", "math", 2020, 80, 46, 4, 4);
// 				sec2 = new Section("02", "110", "comptn, progrmng", "david", "chem", 2015, 85, 49, 1, 2);
// 				sec3 = new Section("03", "121", "comptn, progrmng", "andrew", "cpsc", 2015, 60, 25, 25, 0);
// 				sec4 = new Section("04", "121", "comptn, progrmng", "andrew", "cpsc", 2021, 70, 30, 20, 1);
// 				sec5 = new Section("05", "300", "biology", "andrew", "biol", 2000, 20, 3, 1, 1);
// 				sections = [sec1, sec2, sec3, sec4, sec5];
// 				dataset = new Dataset("test", 5, sections, InsightDatasetKind.Sections);
// 				collector = new Collector([dataset]);
// 				facade.aDataset(dataset);
// 			});
//
// 			it("executing WHERE branch (GT avg: 30)", function () {
// 				const subWhere = queryGT30.WHERE;
// 				const parsed = parseWhere(subWhere, "WHERE");
// 				const parsedWhere = parsed.getChilds()[0];
//
// 				const result: any[] = collector.execWhere(parsedWhere);
// 				expect(result).to.includes(sec1);
// 				expect(result).to.includes(sec2);
// 				expect(result).to.includes(sec3);
// 				expect(result).to.includes(sec4);
// 				expect(result).to.not.includes(sec5);
// 				console.log(result);
// 			});
//
// 			it("executing WHERE branch (avg > 59 AND fail < 5", function () {
// 				const subWhere = queryAND.WHERE;
// 				const parsed = parseWhere(subWhere, "WHERE");
// 				const parsedWhere = parsed.getChilds()[0];
//
// 				const result: any[] = collector.execWhere(parsedWhere);
// 				expect(result).to.includes(sec3);
// 				expect(result).to.includes(sec2);
// 				expect(result).to.not.includes(sec1);
// 				expect(result).to.not.includes(sec4);
// 				expect(result).to.not.includes(sec5);
// 			});
//
// 			it("executing WHERE branch (fail > 19 OR dept = biol)", function () {
// 				const subWhere = queryOR.WHERE;
// 				const parsed = parseWhere(subWhere, "WHERE");
// 				const parsedWhere = parsed.getChilds()[0];
//
// 				const result: any[] = collector.execWhere(parsedWhere);
// 				expect(result).to.includes(sec3);
// 				expect(result).to.includes(sec4);
// 				expect(result).to.includes(sec5);
// 				expect(result).to.not.includes(sec1);
// 				expect(result).to.not.includes(sec2);
// 			});
//
// 			it("executing WHERE branch (COMPLEX)", function () {
// 				const subWhere = queryCOMPLEX.WHERE;
// 				const parsed = parseWhere(subWhere, "WHERE");
// 				const parsedWhere = parsed.getChilds()[0];
//
// 				const result: any[] = collector.execWhere(parsedWhere);
// 				console.log(result);
// 				expect(result).to.includes(sec1);
// 				expect(result).to.includes(sec5);
// 				expect(result).to.not.includes(sec2);
// 				expect(result).to.not.includes(sec3);
// 				expect(result).to.not.includes(sec4);
// 			});
// 		});
//
// 		describe("performQueryFINAL", function () {
// 			let facade: InsightFacade;
// 			let qBasic = {
// 				WHERE: {
// 					GT: {
// 						ubc_avg: 97,
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let qComplex = {
// 				WHERE: {
// 					OR: [
// 						{
// 							AND: [
// 								{
// 									GT: {
// 										ubc_avg: 90,
// 									},
// 								},
// 								{
// 									IS: {
// 										ubc_dept: "adhe",
// 									},
// 								},
// 							],
// 						},
// 						{
// 							EQ: {
// 								ubc_avg: 95,
// 							},
// 						},
// 					],
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let qBasicNoComparator = {
// 				WHERE: {},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let wc = {
// 				WHERE: {
// 					IS: {
// 						ubc_dept: "*asc*",
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let allComp = {
// 				WHERE: {
// 					OR: [
// 						{
// 							AND: [
// 								{
// 									GT: {
// 										ubc_avg: 50,
// 									},
// 								},
// 								{
// 									LT: {
// 										ubc_avg: 90,
// 									},
// 								},
// 								{
// 									EQ: {
// 										ubc_avg: 85,
// 									},
// 								},
// 								{
// 									IS: {
// 										ubc_dept: "*c",
// 									},
// 								},
// 							],
// 						},
// 						{
// 							NOT: {
// 								GT: {
// 									ubc_avg: 1,
// 								},
// 							},
// 						},
// 					],
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let yr1900 = {
// 				WHERE: {
// 					EQ: {
// 						ubc_year: 1900,
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let noWHERE = {
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let noCOL: {
// 				WHERE: {
// 					GT: {
// 						ubc_avg: 97;
// 					};
// 				};
// 				OPTIONS: {
// 					ORDER: "ubc_avg";
// 				};
// 			};
// 			let stackedNotsOr = {
// 				WHERE: {
// 					NOT: {
// 						OR: [
// 							{
// 								NOT: {
// 									LT: {
// 										ubc_avg: 60,
// 									},
// 								},
// 							},
// 							{
// 								NOT: {
// 									IS: {
// 										ubc_dept: "biol",
// 									},
// 								},
// 							},
// 						],
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 				},
// 			};
// 			let lotsofnots = {
// 				WHERE: {
// 					NOT: {
// 						OR: [
// 							{
// 								NOT: {
// 									EQ: {
// 										ubc_avg: 95,
// 									},
// 								},
// 							},
// 							{
// 								NOT: {
// 									IS: {
// 										ubc_dept: "b*",
// 									},
// 								},
// 							},
// 						],
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 				},
// 			};
// 			let invalid2Diffkeys = {
// 				WHERE: {
// 					GT: {
// 						sections_avg: 97,
// 						sections_fail: 99,
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["sections_dept", "sections_avg"],
// 					ORDER: "sections_avg",
// 				},
// 			};
// 			let valid2Order = {
// 				WHERE: {
// 					GT: {
// 						ubc_avg: 97,
// 					},
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["ubc_dept", "ubc_avg"],
// 					ORDER: "ubc_avg",
// 				},
// 			};
// 			let invalid2Keys = {
// 				WHERE: {
// 					AND: [
// 						{
// 							IS: {
// 								sections_dept: "c*",
// 							},
// 							GT: {
// 								sections_avg: 97,
// 							},
// 						},
// 					],
// 				},
// 				OPTIONS: {
// 					COLUMNS: ["sections_dept", "sections_avg"],
// 					ORDER: "sections_avg",
// 				},
// 			};
// 			let pair: string;
//
// 			beforeEach(async function () {
// 				clearDisk();
// 				facade = new InsightFacade();
//
// 				pair = getContentFromArchives("pair.zip");
// 				await facade.addDataset("ubc", pair, InsightDatasetKind.Sections);
// 			});
//
// 			it("should execQuery (basic)", function () {
// 				const result = facade.performQuery(qBasic);
// 				expect(result).to.eventually.be.length(48);
// 			});
//
// 			it("should execQuery (complex)", function () {
// 				const result = facade.performQuery(qComplex);
// 				expect(result).to.eventually.be.length(50);
// 			});
//
// 			it("should execQuery (NO COMPARATOR)", function () {
// 				const result = facade.performQuery(qBasicNoComparator);
// 				expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 			});
//
// 			it("should execQuery (wildcard contains)", function () {
// 				const result = facade.performQuery(wc);
// 				// expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 			});
//
// 			it("should fail with too large", function () {
// 				const result = facade.performQuery(yr1900);
// 				expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
// 			});
//
// 			it("should fail missing where", function () {
// 				const result = facade.performQuery(noWHERE);
// 				expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should fail missing col", function () {
// 				const result = facade.performQuery(noCOL);
// 				expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should return w size 8", function () {
// 				const result = facade.performQuery(stackedNotsOr);
// 				expect(result).to.eventually.be.rejectedWith(InsightError);
// 			});
//
// 			it("should return correctly", function () {
// 				const result = facade.performQuery(lotsofnots);
// 				expect(result).to.eventually.be.length(2);
// 			});
//
// 			it("should return correctly", function () {
// 				const result = facade.performQuery(valid2Order);
// 				expect(result).to.eventually.be.length(2);
// 			});
//
// 			it("should return correctly", function () {
// 				const result = facade.performQuery(valid2Order);
// 				expect(result).to.eventually.be.length(2);
// 			});
// 		});
//
// 		describe("performQueryORDER", function () {
// 			let sections: string;
// 			let alt: string;
// 			let facade: InsightFacade;
//
// 			before(async function () {
// 				clearDisk();
// 				sections = getContentFromArchives("pair.zip");
// 				alt = getContentFromArchives("basic.zip");
// 				facade = new InsightFacade();
//
// 				await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
// 				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 			});
//
// 			// beforeEach(async function () {
// 			// 	clearDisk();
// 			// 	facade = new InsightFacade();
// 			//
// 			// 	await facade.addDataset("alt", alt, InsightDatasetKind.Sections);
// 			// 	await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 			// });
//
// 			function errorValidator(error: any): error is Error {
// 				return error === "InsightError" || error === "ResultTooLargeError";
// 			}
//
// 			type PQErrorKind = "ResultTooLargeError" | "InsightError";
//
// 			folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
// 				"Dynamic InsightFacade PerformQuery tests Ordered",
// 				async (input) => await facade.performQuery(input),
// 				"./test/resources/queries",
// 				{
// 					assertOnResult: async (actual, expected) => {
// 						assert.deepEqual(actual, expected);
// 					},
// 					errorValidator: (error): error is PQErrorKind =>
// 						error === "ResultTooLargeError" || error === "InsightError",
// 					assertOnError: (actual, expected) => {
// 						if (expected === "InsightError") {
// 							assert.instanceOf(actual, InsightError);
// 						} else {
// 							assert.instanceOf(actual, ResultTooLargeError);
// 						}
// 					},
// 				}
// 			);
// 		});
// 	});
//
// 	describe("Test Suite", function () {
// 		describe("addDataset Tests", function () {
// 			let sections: string;
// 			let facade: InsightFacade;
//
// 			before(function () {
// 				sections = getContentFromArchives("pair.zip");
// 			});
//
// 			beforeEach(function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should pass with valid arguments", async function () {
// 				const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				expect(result).to.have.members(["ubc"]);
// 			});
//
// 			it("should reject with null id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset(null as any, sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with undefined id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset(undefined as any, sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with non-string id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset(999 as any, sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with an empty dataset id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset("", sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with whitespace in dataset id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset("a ", sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with underscore dataset id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset("a_", sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should successfully add two datasets with different ids", async function () {
// 				await facade.addDataset("ubc1", sections, InsightDatasetKind.Sections);
// 				const result = await facade.addDataset("ubc2", sections, InsightDatasetKind.Sections);
// 				expect(result).to.have.members(["ubc1", "ubc2"]);
// 			});
//
// 			it("should reject when adding a dataset with a duplicate id", async function () {
// 				let errorWasThrown = false;
// 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				try {
// 					await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with non-zip base 64 string", async function () {
// 				let errorWasThrown = false;
// 				let textFile: string = getContentFromArchives("test.txt");
// 				try {
// 					await facade.addDataset("ubc", textFile, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with no valid sections in dataset", async function () {
// 				let errorWasThrown = false;
// 				let invalidDataset: string = getContentFromArchives("invalidDataset.zip");
// 				try {
// 					await facade.addDataset("ubc", invalidDataset, InsightDatasetKind.Sections);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should resolve with valid and invalid sections in dataset", async function () {
// 				let mixedDataset: string = getContentFromArchives("mixedDataset.zip");
// 				const result = await facade.addDataset("ubc", mixedDataset, InsightDatasetKind.Sections);
// 				expect(result).to.have.members(["ubc"]);
// 			});
//
// 			it("should reject with rooms kind", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
// 		});
//
// 		describe("removeDataset Tests", function () {
// 			let sections: string;
// 			let facade: InsightFacade;
//
// 			before(function () {
// 				sections = getContentFromArchives("pair.zip");
// 			});
//
// 			beforeEach(function () {
// 				clearDisk();
// 				facade = new InsightFacade();
// 			});
//
// 			it("should successfully remove a dataset after adding it", async function () {
// 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				const result = await facade.removeDataset("ubc");
// 				expect(result).to.equal("ubc");
// 			});
//
// 			it("should reject when removing a dataset that hasn't been added", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset("dne");
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(NotFoundError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with undefined id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset(undefined as any);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with null id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset(null as any);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject with non-string id", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset(999 as any);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject when removing a dataset with an id containing an underscore", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset("a_");
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject when removing a dataset with an id that has whitespace", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset("a ");
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject when removing a dataset with an id that is empty", async function () {
// 				let errorWasThrown = false;
// 				try {
// 					await facade.removeDataset("");
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
//
// 			it("should reject when trying to remove a dataset twice", async function () {
// 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				await facade.removeDataset("ubc");
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.removeDataset("ubc");
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(NotFoundError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected the second removeDataset to throw an error, but it did not. :(");
// 				}
// 			});
//
// 			it("should successfully remove same id after adding id and removing", async function () {
// 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				await facade.removeDataset("ubc");
// 				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
// 				const result = await facade.removeDataset("ubc");
// 				expect(result).to.equal("ubc");
// 			});
//
// 			it("should successfully remove same id after adding id and removing", async function () {
// 				const query = {
// 					WHERE: {
// 						IS: {
// 							sections_dept: "xyz",
// 						},
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "sections_avg"],
// 					},
// 				};
//
// 				let errorWasThrown = false;
// 				try {
// 					await facade.addDataset("xyz", sections, InsightDatasetKind.Sections);
// 					await facade.removeDataset("xyz");
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
// 				expect(errorWasThrown).to.be.true;
// 			});
// 		});
//
// 		describe("performQuery Tests", function () {
// 			let facade: InsightFacade;
// 			let sections: string;
//
// 			before(function () {
// 				sections = getContentFromArchives("pair.zip");
// 				facade = new InsightFacade();
// 				facade.addDataset("sections", sections, InsightDatasetKind.Sections);
// 			});
//
// 			beforeEach(function () {
// 				//	clearDisk();
//
//
// 			});
//
// 			it("should reject query that is string", async function () {
// 				const query: string =
// 					'{"WHERE": {"GT": {"sections_avg": 97 }},' +
// 					'"OPTIONS": { "COLUMNS": ["sections_dept", "sections_avg"],"ORDER": "sections_avg"}}';
// 				let errorWasThrown = false;
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error but, but it did not :(");
// 				}
// 			});
//
// 			// it("should reject query with empty WHERE", async function () {
// 			// 	const query = {
// 			// 		"": {GT: {sections_avg: 97}},
// 			// 		OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// 			// 	};
// 			// 	let errorWasThrown = false;
// 			// 	try {
// 			// 		await facade.performQuery(query);
// 			// 	} catch (error) {
// 			// 		errorWasThrown = true;
// 			// 		expect(error).to.be.instanceOf(InsightError);
// 			// 	}
// 			// 	if (!errorWasThrown) {
// 			// 		throw new Error("Expected performQuery to throw error but, but it did not :(");
// 			// 	}
// 			// });
//
// 			it("should reject query with no WHERE", async function () {
// 				const query = {
// 					A: {GT: {sections_avg: 97}},
// 					OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// 				};
//
// 				let errorWasThrown = false;
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw an error, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query with no OPTIONS", async function () {
// 				const query = {WHERE: {GT: {sections_avg: 97}}};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw an error, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query typo COLUMN", async function () {
// 				const query = {
// 					WHERE: {GT: {sections_avg: 97}},
// 					OPTIONS: {COLUMS: ["sections_dept", "sections_avg"], ORDER: "sections_avg"},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw an error, but it did not.");
// 				}
// 			});
//
// 			it("should reject query idstring not datasetID", async function () {
// 				const query = {
// 					WHERE: {GT: {xxx_avg: 97}},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
// 						ORDER: "sections_pass",
// 					},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error but, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query empty FILTER list", async function () {
// 				const query = {
// 					WHERE: {OR: {}},
// 					OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error but, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query empty KEY list", async function () {
// 				const query = {WHERE: {OR: {}}, OPTIONS: {COLUMNS: []}};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query idsting with _", async function () {
// 				const query = {
// 					WHERE: {GT: {section_s_avg: 97}},
// 					OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query ORDER key must be in COLUMNS", async function () {
// 				const query = {
// 					WHERE: {GT: {sections_avg: 97}},
// 					OPTIONS: {COLUMNS: ["sections_dept", "sections_avg"], ORDER: "sections_pass"},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error, but it did not :(");
// 				}
// 			});
//
// 			it("should reject query input string with *", async function () {
// 				const query = {
// 					WHERE: {GT: {"sections*_avg": 97}},
// 					OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw error, but it did not :(");
// 				}
// 			});
//
// 			it("should resolve *input string*", async function () {
// 				const query = {
// 					WHERE: {IS: {sections_dept: "*hin*"}},
// 					OPTIONS: {COLUMNS: ["sections_dept", "sections_avg", "sections_pass"], ORDER: "sections_pass"},
// 				};
//
// 				try {
// 					const result = await facade.performQuery(query);
// 					expect(result).to.have.lengthOf(990);
// 				} catch (error) {
// 					console.log(error);
// 					throw new Error("Expected performQuery to resolve successfully, but it did not :(");
// 				}
// 			});
//
// 			it("should resolve with 2 FILTERS", async function () {
// 				const query = {
// 					WHERE: {
// 						AND: [
// 							{
// 								IS: {
// 									sections_dept: "*japn*",
// 								},
// 							},
// 							{
// 								IS: {
// 									sections_dept: "*japn*",
// 								},
// 							},
// 						],
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "sections_avg", "sections_pass"],
// 						ORDER: "sections_pass",
// 					},
// 				};
//
// 				try {
// 					const result = await facade.performQuery(query);
// 					expect(result).to.have.lengthOf(966);
// 				} catch (error) {
// 					throw new Error("Expected performQuery to resolve successfully, but it did not :(");
// 				}
// 			});
//
// 			it("should reject as >5000 results", async function () {
// 				const query = {
// 					WHERE: {},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept"],
// 					},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					console.log(error);
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(ResultTooLargeError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw ResultTooLargeError, but it did not :(");
// 				}
// 			});
//
// 			it("should return correct results for a simple query", async function () {
// 				const query = {
// 					WHERE: {
// 						GT: {
// 							sections_avg: 97,
// 						},
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "sections_avg"],
// 						ORDER: "sections_avg",
// 					},
// 				};
// 				const expected: InsightResult[] = [
// 					{sections_dept: "math", sections_avg: 97.09},
//
// 					{sections_dept: "math", sections_avg: 97.09},
//
// 					{sections_dept: "epse", sections_avg: 97.09},
//
// 					{sections_dept: "epse", sections_avg: 97.09},
//
// 					{sections_dept: "math", sections_avg: 97.25},
//
// 					{sections_dept: "math", sections_avg: 97.25},
//
// 					{sections_dept: "epse", sections_avg: 97.29},
//
// 					{sections_dept: "epse", sections_avg: 97.29},
//
// 					{sections_dept: "nurs", sections_avg: 97.33},
//
// 					{sections_dept: "nurs", sections_avg: 97.33},
//
// 					{sections_dept: "epse", sections_avg: 97.41},
//
// 					{sections_dept: "epse", sections_avg: 97.41},
//
// 					{sections_dept: "cnps", sections_avg: 97.47},
//
// 					{sections_dept: "cnps", sections_avg: 97.47},
//
// 					{sections_dept: "math", sections_avg: 97.48},
//
// 					{sections_dept: "math", sections_avg: 97.48},
//
// 					{sections_dept: "educ", sections_avg: 97.5},
//
// 					{sections_dept: "nurs", sections_avg: 97.53},
//
// 					{sections_dept: "nurs", sections_avg: 97.53},
//
// 					{sections_dept: "epse", sections_avg: 97.67},
//
// 					{sections_dept: "epse", sections_avg: 97.69},
//
// 					{sections_dept: "epse", sections_avg: 97.78},
//
// 					{sections_dept: "crwr", sections_avg: 98},
//
// 					{sections_dept: "crwr", sections_avg: 98},
//
// 					{sections_dept: "epse", sections_avg: 98.08},
//
// 					{sections_dept: "nurs", sections_avg: 98.21},
//
// 					{sections_dept: "nurs", sections_avg: 98.21},
//
// 					{sections_dept: "epse", sections_avg: 98.36},
//
// 					{sections_dept: "epse", sections_avg: 98.45},
//
// 					{sections_dept: "epse", sections_avg: 98.45},
//
// 					{sections_dept: "nurs", sections_avg: 98.5},
//
// 					{sections_dept: "nurs", sections_avg: 98.5},
//
// 					{sections_dept: "nurs", sections_avg: 98.58},
//
// 					{sections_dept: "nurs", sections_avg: 98.58},
//
// 					{sections_dept: "epse", sections_avg: 98.58},
//
// 					{sections_dept: "epse", sections_avg: 98.58},
//
// 					{sections_dept: "epse", sections_avg: 98.7},
//
// 					{sections_dept: "nurs", sections_avg: 98.71},
//
// 					{sections_dept: "nurs", sections_avg: 98.71},
//
// 					{sections_dept: "eece", sections_avg: 98.75},
//
// 					{sections_dept: "eece", sections_avg: 98.75},
//
// 					{sections_dept: "epse", sections_avg: 98.76},
//
// 					{sections_dept: "epse", sections_avg: 98.76},
//
// 					{sections_dept: "epse", sections_avg: 98.8},
//
// 					{sections_dept: "spph", sections_avg: 98.98},
//
// 					{sections_dept: "spph", sections_avg: 98.98},
//
// 					{sections_dept: "cnps", sections_avg: 99.19},
//
// 					{sections_dept: "math", sections_avg: 99.78},
//
// 					{sections_dept: "math", sections_avg: 99.78},
// 				];
// 				const result = await facade.performQuery(query);
// 				expect(result).to.deep.equal(expected);
// 			});
//
// 			it("should return correct results for a complex query", async function () {
// 				//	timeout if it takes too long so other tests can perform
// 				this.timeout(5000);
// 				const query = {
// 					WHERE: {
// 						OR: [
// 							{
// 								AND: [
// 									{
// 										GT: {
// 											ubc_avg: 90,
// 										},
// 									},
// 									{
// 										IS: {
// 											ubc_dept: "adhe",
// 										},
// 									},
// 								],
// 							},
// 							{
// 								EQ: {
// 									ubc_avg: 95,
// 								},
// 							},
// 						],
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["ubc_dept", "ubc_id", "ubc_avg"],
// 						ORDER: "ubc_avg",
// 					},
// 				};
// 				const expected: InsightResult[] = [
// 					{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.02},
//
// 					{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.16},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.17},
//
// 					{ubc_dept: "adhe", ubc_id: "412", ubc_avg: 90.18},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.5},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.72},
//
// 					{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 90.82},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 90.85},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.29},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.33},
//
// 					{ubc_dept: "adhe", ubc_id: "330", ubc_avg: 91.48},
//
// 					{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 92.54},
//
// 					{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 93.33},
//
// 					{ubc_dept: "sowk", ubc_id: "570", ubc_avg: 95},
//
// 					{ubc_dept: "rhsc", ubc_id: "501", ubc_avg: 95},
//
// 					{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},
//
// 					{ubc_dept: "psyc", ubc_id: "501", ubc_avg: 95},
//
// 					{ubc_dept: "obst", ubc_id: "549", ubc_avg: 95},
//
// 					{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},
//
// 					{ubc_dept: "nurs", ubc_id: "424", ubc_avg: 95},
//
// 					{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 					{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 					{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 					{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 					{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 					{ubc_dept: "musc", ubc_id: "553", ubc_avg: 95},
//
// 					{ubc_dept: "mtrl", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},
//
// 					{ubc_dept: "mtrl", ubc_id: "564", ubc_avg: 95},
//
// 					{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},
//
// 					{ubc_dept: "math", ubc_id: "532", ubc_avg: 95},
//
// 					{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},
//
// 					{ubc_dept: "kin", ubc_id: "500", ubc_avg: 95},
//
// 					{ubc_dept: "kin", ubc_id: "499", ubc_avg: 95},
//
// 					{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},
//
// 					{ubc_dept: "epse", ubc_id: "682", ubc_avg: 95},
//
// 					{ubc_dept: "epse", ubc_id: "606", ubc_avg: 95},
//
// 					{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},
//
// 					{ubc_dept: "edcp", ubc_id: "473", ubc_avg: 95},
//
// 					{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},
//
// 					{ubc_dept: "econ", ubc_id: "516", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "crwr", ubc_id: "599", ubc_avg: 95},
//
// 					{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},
//
// 					{ubc_dept: "cpsc", ubc_id: "589", ubc_avg: 95},
//
// 					{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},
//
// 					{ubc_dept: "cnps", ubc_id: "535", ubc_avg: 95},
//
// 					{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},
//
// 					{ubc_dept: "bmeg", ubc_id: "597", ubc_avg: 95},
//
// 					{ubc_dept: "adhe", ubc_id: "329", ubc_avg: 96.11},
// 				];
// 				const actualResult = await facade.performQuery(query);
// 				expect(actualResult).to.deep.equal(expected);
// 			});
//
// 			it("should reject for incorrect format for a simple query - invalid key in column", async function () {
// 				const query = {
// 					WHERE: {
// 						GT: {
// 							sections_avg: 97,
// 						},
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "_avg"],
// 						ORDER: "sections_avg",
// 					},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
// 				}
// 			});
//
// 			it("should reject references dataset not added", async function () {
// 				const query = {
// 					WHERE: {
// 						IS: {
// 							ubc_dept: "*a",
// 						},
// 					},
// 					OPTIONS: {
// 						COLUMNS: ["sections_dept", "sections_avg"],
// 						ORDER: "sections_avg",
// 					},
// 				};
//
// 				let errorWasThrown = false;
//
// 				try {
// 					await facade.performQuery(query);
// 				} catch (error) {
// 					errorWasThrown = true;
// 					expect(error).to.be.instanceOf(InsightError);
// 				}
//
// 				if (!errorWasThrown) {
// 					throw new Error("Expected performQuery to throw an InsightError, but it did not. :(");
// 				}
// 			});
// 		});
//
// 		describe("listDatasets Tests", async function () {
// 			let facade: InsightFacade;
// 			let sections: string;
// 			let initialDatasetCount: number;
//
// 			before(async function () {
// 				sections = getContentFromArchives("pair.zip");
// 			});
//
// 			beforeEach(async function () {
// 				clearDisk();
// 				facade = new InsightFacade();
//
// 				// Get the initial dataset count
// 				const initialDatasets = await facade.listDatasets();
// 				initialDatasetCount = initialDatasets.length;
//
// 				// Add two datasets
// 				await Promise.all([
// 					facade.addDataset("ubc", sections, InsightDatasetKind.Sections),
// 					facade.addDataset("ubc2", sections, InsightDatasetKind.Rooms),
// 				]);
// 			});
//
// 			it("should return all datasets that were added", async function () {
// 				const datasets: InsightDataset[] = await facade.listDatasets();
//
// 				// Check if the length increased by 2
// 				expect(datasets)
// 					.to.be.an("array")
// 					.that.has.lengthOf(initialDatasetCount + 2);
//
// 				datasets.forEach(function (dataset) {
// 					expect(dataset).to.be.an("object");
// 					expect(dataset).to.have.property("id").that.is.a("string");
// 					expect(dataset.kind).to.be.oneOf([InsightDatasetKind.Sections, InsightDatasetKind.Rooms]);
// 					expect(dataset).to.have.property("numRows").that.is.a("number");
// 				});
// 			});
// 		});
// 	});
