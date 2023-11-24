document.getElementById("query-form").addEventListener("submit", handleFormSubmit);

function handleFormSubmit(event) {
	event.preventDefault();

	// Get values from inputs and dropdown
	const year = document.getElementById("year-input").value;
	const courseCode = document.getElementById("course-code-input").value.toUpperCase();
	const courseNumber = document.getElementById("course-number-input").value;
	const section = document.getElementById("section-input").value.toUpperCase();
	const attribute = document.getElementById("attribute-dropdown").value;
	const attributeValue = document.getElementById("attribute-value-input").value;

	// Validate input
	if (!year || !courseCode || !courseNumber || !section || !attribute || !attributeValue) {
		alert("Please fill in all fields correctly");
		return;
	}

	// Implement API call and result display here
	// Example: fetchResults(year, courseCode, courseNumber, section, attribute, attributeValue);
}
