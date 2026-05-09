const listSection = document.getElementById("assignment-list-section");
const searchInput = document.getElementById("search-input");
const sortSelect  = document.getElementById("sort-select");
const orderSelect = document.getElementById("order-select");

function createAssignmentArticle(assignment) {
    const article = document.createElement("article");
    article.innerHTML = `
        <h2>${assignment.title}</h2>
        <p>Due: ${assignment.due_date}</p>
        <p>${assignment.description}</p>
        <a href="details.html?id=${assignment.id}">View Details &amp; Discussion</a>
    `;
    return article;
}

async function loadAssignments() {
    const search = searchInput ? searchInput.value.trim() : '';
    const sort   = sortSelect  ? sortSelect.value  : 'due_date';
    const order  = orderSelect ? orderSelect.value : 'asc';

    const params = new URLSearchParams({ sort, order });
    if (search) params.append("search", search);

    if (listSection) listSection.innerHTML = "<p>Loading assignments...</p>";

    try {
        const response = await fetch(`./api/index.php?${params}`);
        const result   = await response.json();

        if (!result.success) {
            if (listSection) listSection.innerHTML = "<p>Failed to load assignments.</p>";
            return;
        }

        if (result.data.length === 0) {
            if (listSection) listSection.innerHTML = "<p>No assignments found.</p>";
            return;
        }

        if (listSection) listSection.innerHTML = "";
        result.data.forEach(assignment => {
            if (listSection) listSection.appendChild(createAssignmentArticle(assignment));
        });

    } catch (error) {
        console.error(error);
        if (listSection) listSection.innerHTML = "<p>Error loading assignments.</p>";
    }
}

loadAssignments();

if (searchInput) searchInput.addEventListener("input", loadAssignments);
if (sortSelect)  sortSelect.addEventListener("change", loadAssignments);
if (orderSelect) orderSelect.addEventListener("change", loadAssignments);