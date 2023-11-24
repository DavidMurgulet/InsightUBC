import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {response} from "express";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";

describe("Facade C3", function () {
	let facade: InsightFacade;
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

	// it("PUT /dataset/:id/:kind - Success Test", function () {
	// 	return request(SERVER_URL)
	// 		.put("/dataset/campus3/rooms")
	// 		.send(campus3)
	// 		.set("Content-Type", "application/x-zip-compressed")
	// 		.then(function (res: Response) {
	// 			expect(res.status).to.be.equal(200);
	// 		})
	// 		.catch(function (err) {
	// 			console.log("Error during PUT request: " + err.message);
	// 			expect.fail("PUT request failed");
	// 		});
	// });

	it("POST test success", function () {
		let query = {
			WHERE: {
				AND: [
					{
						GT: {
							sections_avg: 90,
						},
					},
					{
						IS: {
							sections_dept: "biol",
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg"],
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

	it("DELETE /dataset/:id- Success Test", function () {
		return request(SERVER_URL)
			.put("/dataset/campus3")
			.then(function (res: Response) {
				// Check if the status is 200
				expect(res.status).to.be.equal(200);
				// Additional assertions can be added here if needed
			})
			.catch(function (err) {
				console.log("Error during DELETE request: " + err.message);
				expect.fail("DELETE request failed");
			});
	});

	it("GET", function () {
		return request(SERVER_URL)
			.get("/datasets")
			.then(function (res: Response) {
				// Check if the status is 200
				expect(res.status).to.be.equal(200);
			})
			.catch(function (err) {
				expect.fail("shouldn't fail");
			});
	});
});
