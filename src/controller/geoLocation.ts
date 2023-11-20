import http from "http";
import {URL} from "url";

//	Return Building's Latitude and Longitude
export async function getLatLong(address: string): Promise<[lat: number, lon: number]> {
	return new Promise((resolve, reject) => {
		const encodedAddress = encodeURIComponent(address);
		const urlString = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team208/${encodedAddress}`;
		const url = new URL(urlString);

		http.get(url, (res) => {
			const {statusCode} = res;
			if (statusCode !== 200) {
				reject(new Error(`Request Failed. Status Code: ${statusCode}`));
				res.resume(); // consume response data to free up memory
				return;
			}

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
		}).on("error", (e) => {
			reject(e);
		});
	});
}

// const encodedAddress = encodeURIComponent(address);
// const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team208/${encodedAddress}`;
//
// const response = await axios.get<GeoResponse>(url);
// const data = response.data;
//
// if (data.error) {
// 	throw new Error(data.error);
// }
//
// if (data.lat !== undefined && data.lon !== undefined) {
// 	return [data.lat, data.lon];
// } else {
// 	throw new Error("Latitude or Longitude is undefined");
// }
