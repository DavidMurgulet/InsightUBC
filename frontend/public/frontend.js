
const submitQuery = (year, average, operator) => {
	const numYear = Number(year);
	const numAvg = Number(average);
	var query = {
		"WHERE": {
			"AND": [
				{
					[operator]: {
						"sections_avg": numAvg
					}
				},
				{
					"EQ": {
						"sections_year": numYear
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"sections_dept",
				"sections_id",
				"sections_avg",
				"sections_year"
			],
			"ORDER": "sections_avg"
		}
	};

	var test = {
		"WHERE": {
			"AND": [
				{
					"GT" : {
						"sections_avg": 90
					}
				},
				{
					"EQ": {
						"sections_year": 2015
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"sections_dept",
				"sections_avg",
				"sections_year"
			]
		}
	}
	const url = 'http://localhost:4321/query';
	fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(query),
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		}).then(data => {
			console.log('Success!');
			displayResults(data.result);
	})
		.catch(err => {
			console.error('Error :3');
		})
};


// CHAT GPT
function displayResults(results) {
	// Assuming there is a table element with id "result-table" in your HTML
	const table = document.getElementById('result-table');

	// Clear existing table content
	table.innerHTML = '';

	// Create table with Bootstrap classes
	const tableElement = document.createElement('table');
	tableElement.classList.add('table', 'table-bordered', 'table-striped');

	// Create table header with Bootstrap classes
	const theadElement = document.createElement('thead');
	theadElement.classList.add('thead-dark'); // Optional: add a dark header background color

	// Create header row with Bootstrap classes
	const headerRow = theadElement.insertRow();
	for (const key in results[0]) {
		const th = document.createElement('th');
		th.classList.add('text-center'); // Optional: center align header text
		switch(key) {
			case "sections_dept":
				th.textContent = "Department";
				break;
			case "sections_id":
				th.textContent = "Course ID";
				break;
			case "sections_avg":
				th.textContent = "Average";
				break;
			case "sections_year":
				th.textContent = "Year";
		}
		headerRow.appendChild(th);
	}

	// Append the header to the table
	tableElement.appendChild(theadElement);

	// Create table body
	const tbodyElement = document.createElement('tbody');

	// Create data rows with Bootstrap classes
	results.forEach(item => {
		const row = tbodyElement.insertRow();
		for (const key in item) {
			const cell = row.insertCell();
			cell.classList.add('text-center'); // Optional: center align cell text
			cell.textContent = item[key];
		}
	});

	// Append the body to the table
	tableElement.appendChild(tbodyElement);

	// Append the table to the container element
	table.appendChild(tableElement);
}


