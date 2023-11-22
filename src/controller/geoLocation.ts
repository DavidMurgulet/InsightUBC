import http, {IncomingMessage} from "http";
import {URL} from "url";
export async function getLatLong(address: string): Promise<[number, number]> {
	return new Promise((resolve, reject) => {
		const encodedAddress = encodeURIComponent(address);
		const urlString = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team208/" + encodedAddress;
		const url = new URL(urlString);

		const request = http.get(url, (res) => {
			const {statusCode} = res;

			checkStatus(statusCode, res);

			res.setEncoding("utf8");
			let rawData = "";

			res.on("data", (chunk) => {
				rawData += chunk;
			});
			res.on("end", () => {
				try {
					const parsedData = JSON.parse(rawData);
					if (parsedData.error) {
						reject(new Error(parsedData.error));
					} else if (parsedData.lat !== undefined && parsedData.lon !== undefined) {
						resolve([parsedData.lat, parsedData.lon]);
					} else {
						reject(new Error("Latitude or Longitude is undefined"));
					}
				} catch (e) {
					reject(e);
				}
			});
		});

		request.on("error", (e) => {
			console.error("Request Error:", e);
			reject(e);
		});

		request.setTimeout(10000, () => {
			console.error("Request timed out");
			request.abort();
			reject(new Error("Request timed out"));
		});
	});
}

function checkStatus(statusCode: number | undefined, res: http.IncomingMessage): Promise<boolean> {
	// Ensure statusCode is defined
	if (statusCode === undefined) {
		return Promise.reject(new Error("No status code was provided in the response"));
	}

	if ([301, 302, 303, 307, 308].includes(statusCode)) {
		console.log("Redirected to:", res.headers.location);
		return Promise.reject(new Error(`Request was redirected to: ${res.headers.location}`));
	}

	if (statusCode !== 200) {
		return Promise.reject(new Error(`Request Failed. Status Code: ${statusCode}`));
	}

	return Promise.resolve(true);
}
