import InsightFacade from "../controller/InsightFacade";

export class Endpoints {
	public facade: InsightFacade;

	constructor() {
		this.facade = new InsightFacade();
	}
}
