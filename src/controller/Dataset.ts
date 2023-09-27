import {InsightDatasetKind} from "./IInsightFacade";

export class Section {
	public uuid: string;
	public id: string;
	public title: string;
	public instructor: string;
	public dept: string;
	public year: number;
	public avg: number;
	public pass: number;
	public fail: number;
	public audit: number;

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}
}

export class Dataset {
	id: string;
	numRows: number;
	sections: Section[];
	kind: InsightDatasetKind;

	constructor(id: string, kind: InsightDatasetKind, sections: Section[], numRows: number) {
		this.id = id;
		this.kind = kind;
		this.sections = sections;
		this.numRows = numRows;
	}
}
