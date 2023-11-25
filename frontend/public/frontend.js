
document.getElementById('query-form').addEventListener('submit', function (event) {
	// Prevent the default form submission behavior
	event.preventDefault();

	// Get the form values
	const year = Number(document.getElementById('year-dropdown').value);
	const department = String(document.getElementById('dept-input').value).toLowerCase();
	const courseNumber = String(document.getElementById('course-number-input').value);
	const attribute = String(document.getElementById('attribute-dropdown').value);
	const operator = String(document.getElementById('operator-input').value);
	const operatorValue = Number(document.getElementById('operator-value-input').value);

	// Call the submitQuery function with the form values
	submitQuery(year, department, courseNumber, attribute, operator, operatorValue);
});

//	Citation: RegX From ChatGTP
function onlyNumber(inputElement) {
	// Remove non-numeric characters using a regular expression
	inputElement.value = inputElement.value.replace(/[^0-9]/g, '');
}

//	Citation: RegX From ChatGTP
function onlyDept(inputElement) {
	// Accept only 4-letter alphabetic input
	inputElement.value = inputElement.value.toUpperCase().replace(/[^A-Z*]/g, '').slice(0, 4);
}

//	Citation: RegX From ChatGTP
function onlyCourseNumber(inputElement) {
	// Accept only 3-char numeric input or * for wildcard search
	inputElement.value = inputElement.value.toUpperCase().replace(/[^0-9*]/g, '').slice(0, 3);
}



function makeQuery(year, department, courseNumber, attribute, operator, operatorValue) {
	const query = {
		"WHERE": {},
		"OPTIONS": {}
	};

	if (operatorValue && department && courseNumber) {
		query.WHERE["AND"] = [
			{
				[operator]: {
					[`sections_${attribute}`]: operatorValue
				}
			},
			{
				"EQ": {
					"sections_year": year
				}
			},
			{
				"IS": {
					"sections_dept": department
				}
			},
			{
				"IS": {
					"sections_id": courseNumber
				}
			}
		];
	} else if (department && courseNumber) {
		query.WHERE["AND"] = [
			{
				"EQ": {
					"sections_year": year
				}
			},
			{
				"IS": {
					"sections_dept": department
				}
			},
			{
				"IS": {
					"sections_id": courseNumber
				}
			}
		];
	} else if (operatorValue && department) {
		query.WHERE["AND"] = [
			{
				[operator]: {
					[`sections_${attribute}`]: operatorValue
				}
			},
			{
				"EQ": {
					"sections_year": year
				}
			},
			{
				"IS": {
					"sections_dept": department
				}
			}
		];
	} else if (operatorValue && courseNumber) {
			query.WHERE["AND"] = [
				{
					[operator]: {
						[`sections_${attribute}`]: operatorValue
					}
				},
				{
					"EQ": {
						"sections_year": year
					}
				},
				{
					"IS": {
						"sections_id": courseNumber
					}
				}
			];
	} else {
		query.WHERE = {
			"EQ": {
				"sections_year": year
			}
		};
	}

	query.OPTIONS["COLUMNS"] = [
		"sections_dept",
		"sections_id",
		"sections_year",
		`sections_${attribute}`
	];

	query.OPTIONS["ORDER"] = {
		"dir": "DOWN",
		"keys": [`sections_${attribute}`]
	};

	return query;
}

function submitQuery(year, department, courseNumber, attribute, operator, operatorValue) {

	const query = makeQuery(year, department, courseNumber, attribute, operator, operatorValue);
	const url = 'http://localhost:4321/query';

	// Get a reference to the error message element
	const errorMessageElement = document.getElementById('error-message');

	fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(query),
	})
		.then(response => {
			if (!response.ok) {
				if (response.status === 400) {
					// Handle the specific error message from your server
					return response.json().then(data => {
						throw new Error(data.error);
					});
				} else {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
			}
			return response.json();
		})
		.then(data => {
			console.log('Success!');
			displayResults(data.result);
			// Clear any previous error messages
			errorMessageElement.style.display = 'none';
		})
		.catch(err => {
			console.error('Error:', err.message);
			// Display the error message in the UI
			errorMessageElement.textContent = 'Error: ' + err.message;
			errorMessageElement.style.display = 'block'; // Show the error message
		});
}


// CHAT GPT
function displayResults(results) {
	// Assuming there is a table element with id "result-table" in your HTML
	const table = document.getElementById('result-table');

	// Clear existing table content
	table.innerHTML = '';

	// Check if results is not null and not undefined
	if (results && results.length > 0) {
		// Create table with Bootstrap classes
		const tableElement = document.createElement('table');
		tableElement.classList.add('table', 'table-bordered', 'table-striped');

		// Create table header with Bootstrap classes
		const theadElement = document.createElement('thead');
		theadElement.classList.add('thead-dark'); // Optional: add a dark header background color

		// Create header row with Bootstrap classes
		const headerRow = theadElement.insertRow();

		// Get the keys from the first result item to create column headers
		const keys = Object.keys(results[0]);

		keys.forEach(key => {
			const th = document.createElement('th');
			th.classList.add('text-center'); // Optional: center align header text
			th.textContent = key;
			headerRow.appendChild(th);
		});

		// Append the header to the table
		tableElement.appendChild(theadElement);

		// Create table body
		const tbodyElement = document.createElement('tbody');

		// Create data rows with Bootstrap classes
		results.forEach(item => {
			const row = tbodyElement.insertRow();
			keys.forEach(key => {
				const cell = row.insertCell();
				cell.classList.add('text-center'); // Optional: center align cell text
				cell.textContent = item[key];
			});
		});

		// Append the body to the table
		tableElement.appendChild(tbodyElement);

		// Append the table to the container element
		table.appendChild(tableElement);
	} else {
		// Handle the case when there are no results
		const noResultsMessage = document.createElement('p');
		noResultsMessage.textContent = 'No results found.';
		table.appendChild(noResultsMessage);
	}
}
