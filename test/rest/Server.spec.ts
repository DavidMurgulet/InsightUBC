import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {response} from "express";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;
	const SERVER_URL = "http://localhost:4321"

	before(function () {
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

	it ("POST test", function () {
		try {
			let query = {
				"WHERE": {
					"GT": {
						"sections_avg": 99
					}
				},
				"OPTIONS": {
					"COLUMNS": [
						"sections_dept",
						"sections_avg"
					],
					"ORDER": "sections_avg"
				}
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

	// Sample on how to format PUT requests
	// it("PUT test for courses dataset", function () {
	// 	try {
	// 		return request(SERVER_URL)
	// 			.put("/dataset/courses/course")
	// 			.send(ZIP_FILE_DATA)
	// 			.set("Content-Type", "application/x-zip-compressed")
	// 			.then(function (res: Response) {
	// 				// some logging here please!
	// 				expect(res.status).to.be.equal(200);
	// 			})
	// 			.catch(function (err) {
	// 				// some logging here please!
	// 				expect.fail();
	// 			});
	// 	} catch (err) {
	// 		// and some more logging here!
	// 	}
	// });

	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
