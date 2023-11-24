import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import fs from "fs";


let CAMPUS_ZIP_FILE_DATA = fs.readFileSync("test/resources/archives/campus.zip");
let SECTIONS_ZIP = fs.readFileSync("test/resources/archives/pair.zip");
describe("Facade C3", function () {
	let server: Server;
	let campus: string;
	const SERVER_URL = "http://localhost:4321";

	before(function () {
		clearDisk();
		campus = getContentFromArchives("campus.zip");
		server = new Server(4321);
		let tempFacade = new InsightFacade();
		tempFacade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		// TODO: start server here once and handle errors properly
		try {
			server.start();
		} catch (e) {
			console.log("error");
		}
	});

	after(function () {
		// TODO: stop server here once!
		server.stop();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});


	it("PUT SUCCESS - CAMPUS/ROOMS ADDED", function () {
		return request(SERVER_URL)
			.put("/dataset/campus/rooms")
			.send(CAMPUS_ZIP_FILE_DATA)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				expect(res.status).to.be.equal(200);
			})
			.catch(function (err) {
				console.log("Error during PUT request: " + err.message);
				expect.fail("PUT request failed");
			});
	});

	it("POST test", function () {
		let query = {
			WHERE: {
				AND: [
					{
						IS: {
							campus_furniture: "*Tables*",
						},
					},
					{
						GT: {
							campus_seats: 250,

						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: ["campus_shortname", "campus_fullname", "campus_seats"],
				ORDER: {
					dir: "UP",
					keys: ["campus_seats"],
				},

			},
		};
		return request(SERVER_URL)
			.post("/query")
			.send(query)
			.then(function (res: Response) {
				expect(res.status).to.be.equal(200);
			})
			.catch(function (e) {
				console.log("Error during POST request: " + e.message);
				expect.fail("POST request failed");
			});
	});


	it("PUT FAIL - DUPLICATE ADDED", function () {
		return request(SERVER_URL)
			.put("/dataset/campus/rooms")
			.send(CAMPUS_ZIP_FILE_DATA)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				expect(res.status).to.be.equal(400);
			})
			.catch(function (err) {
				console.log("Error during PUT request: " + err.message);
				expect.fail("PUT request failed");
			});
	});

	// it("PUT SUCCESS - SECTIONS/SECTIONS ADDED", function () {
	// 	return request(SERVER_URL)
	// 		.put("/dataset/sections/sections")
	// 		.send(SECTIONS_ZIP)
	// 		.set("Content-Type", "application/x-zip-compressed")
	// 		.then(function (res: Response) {
	// 			expect(res.status).to.be.equal(200);
	// 		})
	// 		.catch(function (err) {
	// 			console.log("Error during PUT request: " + err.message);
	// 			expect.fail("PUT request failed");
	// 		});
	// });

	it("PUT FAIL - no type", function () {
		return request(SERVER_URL)
			.put("/dataset/sections")
			.send(SECTIONS_ZIP)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				expect(res.status).to.be.equal(400);
			})
			.catch(function (err) {
				console.log("Error during PUT request: " + err.message);
				expect.fail("PUT request failed");
			});
	});

	it("PUT FAIL - Empty string type", function () {
		return request(SERVER_URL)
			.put("/dataset/sections/")
			.send(SECTIONS_ZIP)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				expect(res.status).to.be.equal(400);
			})
			.catch(function (err) {
				console.log("Error during PUT request: " + err.message);
				expect.fail("PUT request failed");
			});
	});

	it("GET SUCCESS - 2 DATASETS", function () {
		return request(SERVER_URL)
			.get("/datasets")
			.then(function (res: Response) {
				// Check if the status is 200
				console.log(res.body);
				expect(res.status).to.be.equal(200);
			})
			.catch(function (err) {
				expect.fail("shouldn't fail");
			});
	});


	it("DELETE /dataset/:id- Success Test", function () {
		return request(SERVER_URL)
			.delete("/dataset/campus")
			.then(function (res: Response) {
				// Check if the status is 200
				expect(res.status).to.be.equal(200);
			})
			.catch(function (err) {
				console.log("Error during DELETE request: " + err.message);
				expect.fail("DELETE request failed");
			});
	});

	it("DELETE FAIL - DATASET NOT FOUND", function () {
		return request(SERVER_URL)
			.delete("/dataset/campus")
			.then(function (res: Response) {
				// Check if the status is 200
				expect(res.status).to.be.equal(400);
				// Additional assertions can be added here if needed
			})
			.catch(function (err) {
				console.log("Error during DELETE request: " + err.message);
				expect.fail("DELETE request failed");
			});
	});


	it("GET SUCCESS - 1 DATASETS", function () {
		return request(SERVER_URL)
			.get("/datasets")
			.then(function (res: Response) {
				// Check if the status is 200
				console.log(res.body);
				expect(res.status).to.be.equal(200);
			})
			.catch(function (err) {
				expect.fail("shouldn't fail");
			});
	});
});
