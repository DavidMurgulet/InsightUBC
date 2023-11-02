import Decimal from "decimal.js";

export class Grouping {
	public groupKeys: string[];
	public gKeys: Array<string | number>;
	public data: any[] = [];
	public applyKeys: Array<{[key: string]: number}> = [];
	// {[key: string]: number}[] = [];

	constructor(keys: string[], components: Array<string | number>) {
		this.groupKeys = keys;
		this.gKeys = components;
	}

	public addValue(val: any) {
		this.data.push(val);
	}

	public calculateAvg(applyKey: string, field: string) {
		const len = this.data.length;
		let total = new Decimal(0);
		for (const d of this.data) {
			total = total.add(d[field]);
		}

		let avg = total.toNumber() / len;
		let res = Number(avg.toFixed(2));
		const obj: {[key: string]: number} = {};
		obj[applyKey] = res;
		this.applyKeys.push(obj);
	}

	public calculateMin(applyKey: string, field: string) {
		let min = 101;
		for (const d of this.data) {
			if (min > d[field]) {
				min = d[field];
			}
		}
		const obj: {[key: string]: number} = {};
		obj[applyKey] = min;
		this.applyKeys.push(obj);
	}

	public calculateMax(applyKey: string, field: string) {
		let max = -1;
		for (const d of this.data) {
			if (max < d[field]) {
				max = d[field];
			}
		}

		const obj: {[key: string]: number} = {};
		obj[applyKey] = max;
		this.applyKeys.push(obj);
	}

	public calculateSum(applyKey: string, field: string) {
		let sum = 0;
		for (const d of this.data) {
			sum += d[field];
		}

		const obj: {[key: string]: number} = {};
		let res = Number(sum.toFixed(2));
		obj[applyKey] = res;
		this.applyKeys.push(obj);
	}

	public calculateCount(applyKey: string, field: string) {
		// needs to be fixed
		// count unique occurrences
		let count = 0;
		let seen: any[] = [];

		for (const d of this.data) {
			if (!seen.includes(d[field])) {
				seen.push(d[field]);
				count++;
			}
		}
		const obj: {[key: string]: number} = {};
		obj[applyKey] = count;
		this.applyKeys.push(obj);
	}
}