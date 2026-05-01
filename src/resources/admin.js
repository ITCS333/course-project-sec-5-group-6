/*
  Requirement: Make the "Manage Resources" page interactive.

  Instructions:
  1. Link this file to `admin.html` using:
     <script src="admin.js" defer></script>
  
  2. In `admin.html`, add id="resources-tbody" to the <tbody> element
     inside your resources-table. This id is required by this script.
*/

// --- Global Data Store ---
let resources = [];

// --- Element Selections ---
const resourceForm = document.querySelector('#resource-form');
const resourcesTbody = document.querySelector('#resources-tbody');

let currentEditId = null;

// --- Functions ---

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

function renderTable(data) {
  const tbody = document.querySelector('#resources-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const list = data ?? resources;
  for (const res of list) {
    tbody.appendChild(createResourceRow(res));
  }
}

function handleAddResource(event) {
  event.preventDefault();

  const titleInput = document.querySelector('#resource-title');
  const descInput  = document.querySelector('#resource-description');
  const linkInput  = document.querySelector('#resource-link');
  const submitBtn  = document.querySelector('#add-resource');

  const title       = (titleInput?.value ?? '').trim();
  const description = (descInput?.value  ?? '').trim();
  const link        = (linkInput?.value  ?? '').trim();

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
      .catch(err => console.error('POST error:', err));

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
      .catch(err => console.error('PUT error:', err));
  }
}

function handleTableClick(event) {
  const target = event.target;
  if (!target) return;

  if (target.classList.contains('delete-btn')) {
    const id = target.dataset.id;
    if (!id) return;

    fetch(`./api/index.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(json => {
        if (json && json.success) {
          const filtered = resources.filter(r => String(r.id) !== String(id));
          resources.length = 0;
          filtered.forEach(item => resources.push(item));
          renderTable();

          if (currentEditId !== null && String(currentEditId) === String(id)) {
            resourceForm?.reset();
            currentEditId = null;
            const submitBtn = document.querySelector('#add-resource');
            if (submitBtn) submitBtn.textContent = 'Add Resource';
          }
        }
      })
      .catch(err => console.error('DELETE error:', err));
    return;
  }

  if (target.classList.contains('edit-btn')) {
    const id = target.dataset.id;
    if (!id) return;

    const res = resources.find(r => String(r.id) === String(id));
    if (!res) return;

    const titleInput = document.querySelector('#resource-title');
    const descInput  = document.querySelector('#resource-description');
    const linkInput  = document.querySelector('#resource-link');
    const submitBtn  = document.querySelector('#add-resource');

    if (titleInput) titleInput.value = res.title       ?? '';
    if (descInput)  descInput.value  = res.description ?? '';
    if (linkInput)  linkInput.value  = res.link        ?? '';

    currentEditId = Number(id);
    if (submitBtn) submitBtn.textContent = 'Update Resource';
  }
}

async function loadAndInitialize() {
  try {
    const resp = await fetch('./api/index.php');
    const json = await resp.json();
    if (json && json.success && Array.isArray(json.data)) {
      resources.length = 0;
      json.data.forEach(item => resources.push(item));
    } else {
      resources.length = 0;
    }
  } catch (err) {
    console.error('Load error:', err);
    resources.length = 0;
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
loadAndInitialize();

// --- Exports (required for Jest tests) ---
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createResourceRow,
    renderTable,
    handleAddResource,
    handleTableClick,
    loadAndInitialize,
    getResources: () => resources,
    setResources: (data) => {
      resources.length = 0;
      data.forEach(item => resources.push(item));
    },
    getCurrentEditId: () => currentEditId,
    setCurrentEditId: (id) => { currentEditId = id; },
  };
}
