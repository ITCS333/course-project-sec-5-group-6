/*
  Requirement: Make the "Manage Resources" page interactive.

  Instructions:
  1. Link this file to `admin.html` using:
     <script src="admin.js" defer></script>
  
  2. In `admin.html`, add id="resources-tbody" to the <tbody> element
     inside your resources-table. This id is required by this script.
  
  3. Implement the TODOs below.
*/

// --- Global Data Store ---
// This will hold the resources loaded from the API.
let resources = [];

// --- Element Selections ---
// TODO: Select the resource form ('#resource-form').
const resourceForm = document.querySelector('#resource-form');

// TODO: Select the resources table body ('#resources-tbody').
const resourcesTbody = document.querySelector('#resources-tbody');

let currentEditId = null;

// --- Functions ---

/**
 * TODO: Implement the createResourceRow function.
 * It takes one resource object { id, title, description, link }.
 * It should return a <tr> element with the following <td>s:
 * 1. A <td> for the title.
 * 2. A <td> for the description.
 * 3. A <td> for the link.
 * 4. A <td> containing two buttons:
 *    - An "Edit" button with class="edit-btn" and data-id="${id}".
 *    - A "Delete" button with class="delete-btn" and data-id="${id}".
 */
function createResourceRow(resource) {
  const tr = document.createElement('tr');

  const tdTitle = document.createElement('td');
  tdTitle.textContent = resource.title ?? '';

  const tdDesc = document.createElement('td');
  tdDesc.textContent = resource.description ?? '';

  const tdLink = document.createElement('td');
  const a = document.createElement('a');
  a.href = resource.link ?? '#';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = resource.link ?? '';
  tdLink.appendChild(a);

  const tdActions = document.createElement('td');
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn';
  editBtn.dataset.id = String(resource.id);
  editBtn.textContent = 'Edit';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-btn';
  deleteBtn.dataset.id = String(resource.id);
  deleteBtn.textContent = 'Delete';

  tdActions.appendChild(editBtn);
  tdActions.appendChild(deleteBtn);

  tr.appendChild(tdTitle);
  tr.appendChild(tdDesc);
  tr.appendChild(tdLink);
  tr.appendChild(tdActions);

  return tr;
}

/**
 * TODO: Implement the renderTable function.
 * It should:
 * 1. Clear the resources table body ('#resources-tbody').
 * 2. Loop through the global `resources` array.
 * 3. For each resource, call `createResourceRow()` and
 *    append the returned <tr> to the table body.
 */
function renderTable() {
  if (!resourcesTbody) return;
  resourcesTbody.innerHTML = '';
  for (const res of resources) {
    resourcesTbody.appendChild(createResourceRow(res));
  }
}

/**
 * TODO: Implement the handleAddResource function.
 * This is the event handler for the form's 'submit' event.
 * It should:
 * 1. Prevent the form's default submission.
 * 2. Get the values from the title (id="resource-title"),
 *    description (id="resource-description"), and
 *    link (id="resource-link") inputs.
 * 3. Use `fetch()` to POST the new resource to the API:
 *    - URL: './api/index.php'
 *    - Method: POST
 *    - Headers: { 'Content-Type': 'application/json' }
 *    - Body: JSON.stringify({ title, description, link })
 * 4. The API returns { success: true, id: <new id> }.
 *    Add the new resource object (including the id returned by the API)
 *    to the global `resources` array.
 * 5. Call `renderTable()` to refresh the list.
 * 6. Reset the form.
 */
function handleAddResource(event) {
  event.preventDefault();
  const titleInput = document.querySelector('#resource-title');
  const descInput = document.querySelector('#resource-description');
  const linkInput = document.querySelector('#resource-link');
  const submitBtn = document.querySelector('#add-resource');

  const title = (titleInput?.value ?? '').trim();
  const description = (descInput?.value ?? '').trim();
  const link = (linkInput?.value ?? '').trim();

  if (!title || !link) return;

  if (currentEditId === null) {
    fetch('./api/index.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, link }),
    })
      .then(r => r.json())
      .then(json => {
        if (json && json.success) {
          resources.push({ id: json.id, title, description, link });
          renderTable();
          resourceForm?.reset();
        }
      })
      .catch(() => {});
  } else {
    const id = currentEditId;
    fetch('./api/index.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, description, link }),
    })
      .then(r => r.json())
      .then(json => {
        if (json && json.success) {
          const idx = resources.findIndex(r => String(r.id) === String(id));
          if (idx !== -1) {
            resources[idx] = { id, title, description, link };
          }
          renderTable();
          resourceForm?.reset();
          currentEditId = null;
          if (submitBtn) submitBtn.textContent = 'Add Resource';
        }
      })
      .catch(() => {});
  }
}

/**
 * TODO: Implement the handleTableClick function.
 * This handles click events on the table body using event delegation.
 * It should:
 *
 * If the clicked element has class "delete-btn":
 * 1. Get the resource id from the button's data-id attribute.
 * 2. Use `fetch()` to DELETE the resource via the API:
 *    - URL: `./api/index.php?id=${id}`
 *    - Method: DELETE
 * 3. On success, remove the resource from the global `resources` array
 *    by filtering out the entry with the matching id.
 * 4. Call `renderTable()` to refresh the list.
 *
 * If the clicked element has class "edit-btn":
 * 1. Get the resource id from the button's data-id attribute.
 * 2. Find the matching resource in the global `resources` array.
 * 3. Populate the form fields (id="resource-title", id="resource-description",
 *    id="resource-link") with the resource's current values so the admin
 *    can edit them.
 * 4. Change the submit button (id="add-resource") text to "Update Resource"
 *    to indicate edit mode.
 * 5. On form submit, use `fetch()` to PUT the updated resource to the API:
 *    - URL: './api/index.php'
 *    - Method: PUT
 *    - Headers: { 'Content-Type': 'application/json' }
 *    - Body: JSON.stringify({ id, title, description, link })
 * 6. On success, update the matching resource in the global `resources` array.
 * 7. Call `renderTable()` and reset the form back to "Add" mode,
 *    restoring the submit button text to "Add Resource".
 */
function handleTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains('delete-btn')) {
    const id = target.dataset.id;
    if (!id) return;

    fetch(`./api/index.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(json => {
        if (json && json.success) {
          resources = resources.filter(r => String(r.id) !== String(id));
          renderTable();
          if (currentEditId !== null && String(currentEditId) === String(id)) {
            resourceForm?.reset();
            currentEditId = null;
            const submitBtn = document.querySelector('#add-resource');
            if (submitBtn) submitBtn.textContent = 'Add Resource';
          }
        }
      })
      .catch(() => {});
    return;
  }

  if (target.classList.contains('edit-btn')) {
    const id = target.dataset.id;
    if (!id) return;
    const res = resources.find(r => String(r.id) === String(id));
    if (!res) return;

    const titleInput = document.querySelector('#resource-title');
    const descInput = document.querySelector('#resource-description');
    const linkInput = document.querySelector('#resource-link');
    const submitBtn = document.querySelector('#add-resource');

    if (titleInput) titleInput.value = res.title ?? '';
    if (descInput) descInput.value = res.description ?? '';
    if (linkInput) linkInput.value = res.link ?? '';

    currentEditId = Number(id);
    if (submitBtn) submitBtn.textContent = 'Update Resource';
  }
}

/**
 * TODO: Implement the loadAndInitialize function.
 * This function must be 'async'.
 * It should:
 * 1. Use `fetch()` to GET all resources from the API:
 *    - URL: './api/index.php'
 *    - The API returns { success: true, data: [...] }
 * 2. Store the resources array (from `data`) in the global `resources` variable.
 * 3. Call `renderTable()` to populate the table for the first time.
 * 4. Add the 'submit' event listener to the resource form (id="resource-form"),
 *    calling `handleAddResource`.
 * 5. Add the 'click' event listener to the table body (id="resources-tbody"),
 *    calling `handleTableClick`.
 */
async function loadAndInitialize() {
  try {
    const resp = await fetch('./api/index.php');
    const json = await resp.json();
    if (json && json.success && Array.isArray(json.data)) {
      resources = json.data;
    } else {
      resources = [];
    }
  } catch {
    resources = [];
  }

  renderTable();

  if (resourceForm) {
    resourceForm.addEventListener('submit', handleAddResource);
  }
  if (resourcesTbody) {
    resourcesTbody.addEventListener('click', handleTableClick);
  }
}

// --- Initial Page Load ---
// Call the main async function to start the application.
loadAndInitialize();
