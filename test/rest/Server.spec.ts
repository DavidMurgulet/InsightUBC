import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {response} from "express";
import {getContentFromArchives} from "../TestUtil";

describe("Facade C3", function () {
	let facade: InsightFacade;
	let server: Server;
	let campus2: string;
	const SERVER_URL = "http://localhost:4321";

	before(function () {
		campus2 = getContentFromArchives("campus.zip");
		facade = new InsightFacade();
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
		this.timeout(10000);
		try {
			let query = {
				WHERE: {
					GT: {
						sections_avg: 99,
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};
			return request("http://localhost:4321")
				.post("/query")
				.send(query)
				.then(function (res: Response) {
					// assertions here
					console.log("response" + res);
					expect(res.body).to.equal(query);
				})
				.catch(function (e) {
					console.log(e);
					expect.fail();
				});
		} catch (e) {
			console.log("Error");
		}
	});

	it("PUT /dataset/:id/:kind - Success Test", function () {
			return request(SERVER_URL)
				.put("/dataset/campus2/rooms")
				.send(campus2)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// Check if the status is 200
					expect(res.status).to.be.equal(200);
					// Additional assertions can be added here if needed
				})
				.catch(function (err) {
					console.log("Error during PUT request: " + err.message);
					expect.fail("PUT request failed");
				});
	});

	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
