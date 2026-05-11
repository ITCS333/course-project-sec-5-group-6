/*
  Requirement: Make the "Discussion Board" page interactive.

  Instructions:
  1. This file is already linked to `board.html` via:
         <script src="board.js" defer></script>

  2. In `board.html`:
     - The new-topic form has id="new-topic-form".
     - The topic list container has id="topic-list-container".

  3. Implement the required logic below.

  API base URL: ./api/index.php
  All requests and responses use JSON.
  Successful list response shape: { success: true, data: [ ...topic objects ] }
  Each topic object shape (from the topics table):
    {
      id:         number,   // integer primary key from the topics table
      subject:    string,
      message:    string,
      author:     string,
      created_at: string    // "YYYY-MM-DD HH:MM:SS" — matches the SQL column name
    }
*/

// --- Global Data Store ---
// Holds the topics currently displayed in the list.
let topics = [];

// --- Element Selections ---
const newTopicForm = document.getElementById('new-topic-form');

const topicListContainer = document.getElementById('topic-list-container');

// --- Functions ---

/**
 * Parameters:
 *   topic — one topic object with shape:
 *     { id, subject, message, author, created_at }
 *
 * Returns an <article> element matching the structure shown in board.html:
 *   <article>
 *     <h3><a href="topic.html?id={id}">{subject}</a></h3>
 *     <footer>Posted by: {author} on {created_at}</footer>
 *     <div>
 *       <button class="edit-btn"   data-id="{id}">Edit</button>
 *       <button class="delete-btn" data-id="{id}">Delete</button>
 *     </div>
 *   </article>
 *
 * Important:
 * - The link href MUST be "topic.html?id=<id>" so topic.js can read
 *   the id from the URL.
 * - The data-id on both buttons holds the integer primary key from
 *   the topics table.
 * - Use created_at (not a field called "date") — this matches the SQL
 *   column name.
 */
function createTopicArticle(topic) {
  const article = document.createElement('article');

  const h3 = document.createElement('h3');
  const link = document.createElement('a');
  link.href = `topic.html?id=${topic.id}`;
  link.textContent = topic.subject;
  h3.appendChild(link);

  const footer = document.createElement('footer');
  footer.textContent = `Posted by: ${topic.author} on ${topic.created_at}`;

  const actions = document.createElement('div');
  const editButton = document.createElement('button');
  editButton.className = 'edit-btn';
  editButton.dataset.id = String(topic.id);
  editButton.textContent = 'Edit';

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-btn';
  deleteButton.dataset.id = String(topic.id);
  deleteButton.textContent = 'Delete';

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  article.appendChild(h3);
  article.appendChild(footer);
  article.appendChild(actions);

  return article;
}

/**
 * It should:
 * 1. Clear the topicListContainer (set innerHTML to "").
 * 2. Loop through the global `topics` array.
 * 3. For each topic, call createTopicArticle(topic) and append the
 *    returned <article> to topicListContainer.
 */
function renderTopics() {
  topicListContainer.innerHTML = '';
  for (const topic of topics) {
    topicListContainer.appendChild(createTopicArticle(topic));
  }
}

/**
 * This is the event handler for the form's 'submit' event.
 * It should:
 * 1. Call event.preventDefault().
 * 2. Read values from:
 *      - #topic-subject → subject (string)
 *      - #topic-message → message (string)
 * 3. Send a POST to './api/index.php' with the body:
 *      { subject, message, author: "Student" }
 *    (author is hardcoded "Student" for this exercise)
 *    The API inserts a row into the topics table.
 * 4. On success (result.success === true):
 *    - Push the new topic object (with the id from result.id) onto
 *      the global `topics` array.
 *    - Call renderTopics() to refresh the list.
 *    - Reset the form.
 */
async function handleCreateTopic(event) {
  event.preventDefault();

  const subjectInput = document.getElementById('topic-subject');
  const messageInput = document.getElementById('topic-message');
  const submitButton = document.getElementById('create-topic');
  const subject = subjectInput.value.trim();
  const message = messageInput.value.trim();

  const editId = submitButton.dataset.editId;
  if (editId) {
    await handleUpdateTopic(Number(editId), { subject, message });
    submitButton.textContent = 'Create Topic';
    delete submitButton.dataset.editId;
    newTopicForm.reset();
    return;
  }

  const response = await fetch('./api/index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subject, message, author: 'Student' }),
  });

  const result = await response.json();

  if (result.success === true) {
    topics.push({
      id: result.id,
      subject,
      message,
      author: 'Student',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
    renderTopics();
    newTopicForm.reset();
  }
}

/**
 * Parameters:
 *   id     — the integer primary key of the topic being edited.
 *   fields — object with { subject, message }.
 *
 * It should:
 * 1. Send a PUT to './api/index.php' with the body:
 *      { id, subject, message }
 * 2. On success:
 *    - Update the matching entry in the global `topics` array.
 *    - Call renderTopics() to refresh the list.
 */
async function handleUpdateTopic(id, fields) {
  const response = await fetch('./api/index.php', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      subject: fields.subject,
      message: fields.message,
    }),
  });

  const result = await response.json();

  if (result.success === true) {
    topics = topics.map((topic) => (
      topic.id === id
        ? { ...topic, subject: fields.subject, message: fields.message }
        : topic
    ));
    renderTopics();
  }
}

/**
 * This is a delegated click listener on topicListContainer.
 * It should:
 * 1. If event.target has class "delete-btn":
 *    a. Read the integer id from event.target.dataset.id.
 *    b. Send a DELETE to './api/index.php?id=<id>'.
 *    c. On success, remove the topic from the global `topics` array
 *       and call renderTopics().
 *
 * 2. If event.target has class "edit-btn":
 *    a. Read the integer id from event.target.dataset.id.
 *    b. Find the matching topic in the global `topics` array.
 *    c. Populate #topic-subject and #topic-message with the topic's data.
 *    d. Change the submit button (#create-topic) text to "Update Topic"
 *       and set its data-edit-id attribute to the topic's id.
 */
async function handleTopicListClick(event) {
  const target = event.target;

  if (target.classList.contains('delete-btn')) {
    const id = Number(target.dataset.id);
    const response = await fetch(`./api/index.php?id=${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success === true) {
      topics = topics.filter((topic) => topic.id !== id);
      renderTopics();
    }
  }

  if (target.classList.contains('edit-btn')) {
    const id = Number(target.dataset.id);
    const topic = topics.find((entry) => entry.id === id);
    if (!topic) return;

    document.getElementById('topic-subject').value = topic.subject;
    document.getElementById('topic-message').value = topic.message;

    const submitButton = document.getElementById('create-topic');
    submitButton.textContent = 'Update Topic';
    submitButton.dataset.editId = String(topic.id);
  }
}

/**
 * It should:
 * 1. Send a GET to './api/index.php'.
 *    Response shape: { success: true, data: [ ...topic objects ] }
 * 2. Store the data array in the global `topics` variable.
 * 3. Call renderTopics() to populate the list.
 * 4. Attach the 'submit' event listener to the new-topic form
 *    (calls handleCreateTopic).
 * 5. Attach a 'click' event listener to topicListContainer
 *    (calls handleTopicListClick — event delegation for edit and delete).
 */
async function loadAndInitialize() {
  const response = await fetch('./api/index.php');
  const result = await response.json();

  if (result.success === true && Array.isArray(result.data)) {
    topics = result.data;
  } else {
    topics = [];
  }

  renderTopics();
  newTopicForm.addEventListener('submit', handleCreateTopic);
  topicListContainer.addEventListener('click', handleTopicListClick);
}

// --- Initial Page Load ---
loadAndInitialize();
