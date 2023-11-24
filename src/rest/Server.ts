import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import {pseudoRandomBytes} from "crypto";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	public facade: InsightFacade;
	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();

		this.facade = new InsightFacade();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						console.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						console.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);
		this.express.put("/dataset/:id/:kind", this.putDataset);
		this.express.delete("/dataset/:id", this.deleteDataset);
		this.express.post("/query", this.postQuery);
		this.express.get("/datasets", this.getDataset);
	}

	public postQuery = async (req: Request, res: Response) => {
		try {
			// add check for persistent data.
			console.log("received POST request");
			const query = req.body;
			const result = await this.facade.performQuery(query);
			res.status(200).json({result: result});
		} catch (e) {
			console.error("Error in POST", e);
			// Determine the correct status code based on the error type
			if (e instanceof InsightError) {
				res.status(400).json({error: e.message});
			} else {
				res.status(500).json({error: "Internal Server Error"});
			}
		}
	};

	public putDataset = async (req: Request, res: Response) => {

		try {
			console.log("Received PUT request"); // Log statement
			const id: string = req.params.id;
			const kindString: string = req.params.kind.toLowerCase();

			let kind: InsightDatasetKind;
			if (kindString === "rooms") {
				kind = InsightDatasetKind.Rooms;
			} else if (kindString === "sections") {
				kind = InsightDatasetKind.Sections;
			} else {
				throw new Error("Invalid kind");
			}
			console.log(`Dataset ID: ${id}, kindString: ${kindString}, kind: ${kind}`); // Log statement

			// Assuming the dataset is sent as a buffer in the request body and needs to be converted to base64
			const content: string = Buffer.from(req.body).toString("base64");

			const result = await this.facade.addDataset(id, content, kind);
			res.status(200).json({result: result});
		} catch (err) {
			console.error("Error in putDataset", err);
			// Determine the correct status code based on the error type
			if (err instanceof InsightError) {
				res.status(400).json({error: err.message});
			} else {
				res.status(500).json({error: "Internal Server Error"});
			}
		}
	};

	public deleteDataset = async (req: Request, res: Response) => {

		try {
			console.log("Received DELETE request"); // Log statement
			const id: string = req.params.id;

			console.log(`Dataset ID: ${id}`);

			const result = await this.facade.removeDataset(id);
			res.status(200).json({result: result});
		} catch (err) {
			console.error("Error in deleteDataset", err);
			// Determine the correct status code based on the error type
			if (err instanceof InsightError) {
				res.status(400).json({error: err.message});
			} else if (err instanceof NotFoundError) {
				res.status(404).json({error: err.message});
			} else {
				res.status(500).json({error: "Internal Server Error"});
			}
		}
	};

	public getDataset = async (req: Request, res: Response) => {
		console.log("getRequest");
		const result = await this.facade.listDatasets();
		res.status(200).json({result: result});
	};

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
