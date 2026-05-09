/*
  Requirement: Populate the assignment detail page and discussion forum.

  Instructions:
  1. This file is already linked to `details.html` via:
         <script src="details.js" defer></script>

  2. The following ids must exist in details.html (already listed in the
     HTML comments):
       #assignment-title       — <h1>
       #assignment-due-date    — <p>
       #assignment-description — <p>
       #assignment-files-list  — <ul>
       #comment-list           — <div>
       #comment-form           — <form>
       #new-comment            — <textarea>

  3. Implement the TODOs below.
*/

// --- Global Data Store ---
let currentAssignmentId = null;
let currentComments     = [];

// --- Element Selections ---
// TODO: Select each element by its id:
const assignmentTitle       = document.getElementById("assignment-title");
const assignmentDueDate     = document.getElementById("assignment-due-date");
const assignmentDescription = document.getElementById("assignment-description");
const assignmentFilesList   = document.getElementById("assignment-files-list");
const commentList           = document.getElementById("comment-list");
const commentForm           = document.getElementById("comment-form");
const newCommentInput       = document.getElementById("new-comment");

// --- Functions ---

/**
 * TODO: Implement getAssignmentIdFromURL.
 */
function getAssignmentIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/**
 * TODO: Implement renderAssignmentDetails.
 */
function renderAssignmentDetails(assignment) {
    assignmentTitle.textContent       = assignment.title;
    assignmentDueDate.textContent     = "Due: " + assignment.due_date;
    assignmentDescription.textContent = assignment.description;

    assignmentFilesList.innerHTML = "";
    assignment.files.forEach(url => {
        const li = document.createElement("li");
        const a  = document.createElement("a");
        a.href        = url;
        a.textContent = url;
        li.appendChild(a);
        assignmentFilesList.appendChild(li);
    });
}

/**
 * TODO: Implement createCommentArticle.
 */
function createCommentArticle(comment) {
    const article = document.createElement("article");
    article.innerHTML = `
        <p>${comment.text}</p>
        <footer>Posted by: ${comment.author}</footer>
    `;
    return article;
}

/**
 * TODO: Implement renderComments.
 */
function renderComments() {
    commentList.innerHTML = "";
    if (currentComments.length === 0) {
        commentList.innerHTML = "<p>No comments yet. Be the first to ask!</p>";
        return;
    }
    currentComments.forEach(comment => {
        commentList.appendChild(createCommentArticle(comment));
    });
}

/**
 * TODO: Implement handleAddComment (async).
 */
async function handleAddComment(event) {
    event.preventDefault();

    const commentText = newCommentInput.value.trim();
    if (!commentText) return;

    try {
        const response = await fetch("./api/index.php?action=comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                assignment_id: parseInt(currentAssignmentId),
                author:        "Student",
                text:          commentText
            })
        });

        const result = await response.json();

        if (result.success) {
            currentComments.push(result.data);
            renderComments();
            newCommentInput.value = "";
        } else {
            alert("Failed to post comment: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Error posting comment.");
    }
}

/**
 * TODO: Implement initializePage (async).
 */
async function initializePage() {
    currentAssignmentId = getAssignmentIdFromURL();

    if (!currentAssignmentId) {
        assignmentTitle.textContent = "Assignment not found.";
        return;
    }

    try {
        const [assignmentRes, commentsRes] = await Promise.all([
            fetch(`./api/index.php?id=${currentAssignmentId}`),
            fetch(`./api/index.php?action=comments&assignment_id=${currentAssignmentId}`)
        ]);

        const assignmentResult = await assignmentRes.json();
        const commentsResult   = await commentsRes.json();

        currentComments = commentsResult.success ? commentsResult.data : [];

        if (assignmentResult.success) {
            renderAssignmentDetails(assignmentResult.data);
            renderComments();
            commentForm.addEventListener("submit", handleAddComment);
        } else {
            assignmentTitle.textContent = "Assignment not found.";
        }
    } catch (error) {
        console.error(error);
        assignmentTitle.textContent = "Error loading assignment.";
    }
}

// --- Initial Page Load ---
initializePage();