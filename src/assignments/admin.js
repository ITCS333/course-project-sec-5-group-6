/*
  Requirement: Make the "Manage Assignments" page interactive.
  ...
*/

// --- Global Data Store ---
let assignments = [];

// --- Element Selections ---
// TODO: Select the assignment form by id 'assignment-form'.
const assignmentForm  = document.getElementById("assignment-form");

// TODO: Select the assignments table body by id 'assignments-tbody'.
const assignmentsTbody = document.getElementById("assignments-tbody");

// --- Functions ---

/**
 * TODO: Implement createAssignmentRow.
 */
function createAssignmentRow(assignment) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${assignment.title}</td>
        <td>${assignment.due_date}</td>
        <td>${assignment.description}</td>
        <td>
            <button class="edit-btn"   data-id="${assignment.id}">Edit</button>
            <button class="delete-btn" data-id="${assignment.id}">Delete</button>
        </td>
    `;
    return tr;
}

/**
 * TODO: Implement renderTable.
 */
function renderTable() {
    assignmentsTbody.innerHTML = "";
    assignments.forEach(assignment => {
        assignmentsTbody.appendChild(createAssignmentRow(assignment));
    });
}

/**
 * TODO: Implement handleAddAssignment (async).
 */
async function handleAddAssignment(event) {
    event.preventDefault();

    const title       = document.getElementById("assignment-title").value.trim();
    const due_date    = document.getElementById("assignment-due-date").value;
    const description = document.getElementById("assignment-description").value.trim();
    const filesRaw    = document.getElementById("assignment-files").value;
    const files       = filesRaw.split("\n").map(f => f.trim()).filter(f => f !== "");

    const submitBtn = document.getElementById("add-assignment");
    const editId    = submitBtn.dataset.editId;

    if (editId) {
        await handleUpdateAssignment(parseInt(editId), { title, due_date, description, files });
        return;
    }

    try {
        const response = await fetch("./api/index.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, due_date, description, files })
        });

        const result = await response.json();

        if (result.success) {
            assignments.push({ id: result.id, title, due_date, description, files });
            renderTable();
            assignmentForm.reset();
        } else {
            alert("Failed to add assignment: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Error adding assignment.");
    }
}

/**
 * TODO: Implement handleUpdateAssignment (async).
 */
async function handleUpdateAssignment(id, fields) {
    try {
        const response = await fetch("./api/index.php", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...fields })
        });

        const result = await response.json();

        if (result.success) {
            assignments = assignments.map(a =>
                a.id === id ? { ...a, ...fields } : a
            );
            renderTable();
            assignmentForm.reset();

            const submitBtn = document.getElementById("add-assignment");
            submitBtn.textContent = "Add Assignment";
            delete submitBtn.dataset.editId;
        } else {
            alert("Failed to update assignment: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Error updating assignment.");
    }
}

/**
 * TODO: Implement handleTableClick (async).
 */
async function handleTableClick(event) {
    const target = event.target;
    const id     = parseInt(target.dataset.id);

    if (target.classList.contains("delete-btn")) {
        if (!confirm("Are you sure you want to delete this assignment?")) return;

        try {
            const response = await fetch(`./api/index.php?id=${id}`, {
                method: "DELETE"
            });

            const result = await response.json();

            if (result.success) {
                assignments = assignments.filter(a => a.id !== id);
                renderTable();
            } else {
                alert("Failed to delete: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting assignment.");
        }
    }

    if (target.classList.contains("edit-btn")) {
        const assignment = assignments.find(a => a.id === id);
        if (!assignment) return;

        document.getElementById("assignment-title").value       = assignment.title;
        document.getElementById("assignment-due-date").value    = assignment.due_date;
        document.getElementById("assignment-description").value = assignment.description;
        document.getElementById("assignment-files").value       = assignment.files.join("\n");

        const submitBtn = document.getElementById("add-assignment");
        submitBtn.textContent      = "Update Assignment";
        submitBtn.dataset.editId   = assignment.id;
    }
}

/**
 * TODO: Implement loadAndInitialize (async).
 */
async function loadAndInitialize() {
    try {
        const response = await fetch("./api/index.php");
        const result   = await response.json();

        if (result.success) {
            assignments = result.data;
            renderTable();
        }
    } catch (error) {
        console.error(error);
        alert("Error loading assignments.");
    }

    assignmentForm.addEventListener("submit", handleAddAssignment);
    assignmentsTbody.addEventListener("click", handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();