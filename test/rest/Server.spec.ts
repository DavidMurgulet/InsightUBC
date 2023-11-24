import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import fs from "fs";

let CAMPUS_ZIP_FILE_DATA = fs.readFileSync("test/resources/archives/campus.zip");

describe("Facade C3", function () {
	let server: Server;
	const SERVER_URL = "http://localhost:4321";

	before(function () {
		server = new Server(4321);

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

	it("POST test", function () {
		// request(SERVER_URL)
		// 	.put("/dataset/campus3/rooms")
		// 	.send(CAMPUS_ZIP_FILE_DATA)
		// 	.set("Content-Type", "application/x-zip-compressed");

		let query = {
			WHERE: {
				AND: [
					{
						IS: {
							rooms_furniture: "*Tables*",
						},
					},
					{
						GT: {
							rooms_seats: 250,
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: ["rooms_shortname", "rooms_fullname", "rooms_seats"],
				ORDER: {
					dir: "UP",
					keys: ["rooms_seats"],
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

	it("PUT /dataset/:id/:kind - Success Test", function () {
		return request(SERVER_URL)
			.put("/dataset/campus/rooms")
			.send(CAMPUS_ZIP_FILE_DATA)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				// Check if the status is 200
				expect(res.status).to.be.equal(200);
			})
			.catch(function (err) {
				console.log("Error during PUT request: " + err.message);
				expect.fail("PUT request failed");
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

	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
