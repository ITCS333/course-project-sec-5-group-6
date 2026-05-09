/*
  Requirement: Add interactivity and data management to the Admin Portal.

  Instructions:
  1. This file is loaded by the <script src="manage_users.js" defer> tag in manage_users.html.
     The 'defer' attribute guarantees the DOM is fully parsed before this script runs.
  2. Implement the JavaScript functionality as described in the TODO comments.
  3. All data is fetched from and written to the PHP API at '../api/index.php'.
     The local 'users' array is used only as a client-side cache for search and sort.
*/

// --- Global Data Store ---
let users = [];

// --- Element Selections ---
const userTableBody = document.querySelector("#user-table-body");
const addUserForm = document.querySelector("#add-user-form");
const changePasswordForm = document.querySelector("#password-form");
const searchInput = document.querySelector("#search-input");
const tableHeaders = document.querySelectorAll("#user-table thead th");

function getLoggedInUserId() {
  try {
    const raw = sessionStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u != null && u.id != null && u.id !== "") {
          const n = Number(u.id);
          if (!Number.isNaN(n) && n > 0) return n;
        }
      } catch (_) {
        /* ignore invalid JSON */
      }
    }
    const sid = sessionStorage.getItem("user_id");
    if (sid != null && sid !== "") {
      const n = Number(sid);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (_) {
    /* sessionStorage may not be available (e.g. test environment) */
  }
  return NaN;
}

function readApiMessage(payload) {
  if (payload && typeof payload.message === "string") return payload.message;
  return "Something went wrong.";
}

// --- Functions ---

function createUserRow(user) {
  const tr = document.createElement("tr");
  const tdName = document.createElement("td");
  tdName.textContent = user.name;
  const tdEmail = document.createElement("td");
  tdEmail.textContent = user.email;
  const tdAdmin = document.createElement("td");
  tdAdmin.textContent = Number(user.is_admin) === 1 ? "Yes" : "No";
  const tdActions = document.createElement("td");
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "edit-btn";
  editBtn.textContent = "Edit";
  editBtn.dataset.id = String(user.id);
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.dataset.id = String(user.id);
  tdActions.appendChild(editBtn);
  tdActions.appendChild(deleteBtn);
  tr.appendChild(tdName);
  tr.appendChild(tdEmail);
  tr.appendChild(tdAdmin);
  tr.appendChild(tdActions);
  return tr;
}

function renderTable(userArray) {
  userTableBody.innerHTML = "";
  for (const u of userArray) {
    userTableBody.appendChild(createUserRow(u));
  }
}

function handleChangePassword(event) {
  event.preventDefault();
  const current = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }
  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }
  document.getElementById("current-password").value = "";
  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";
  const id = getLoggedInUserId();
  if (Number.isNaN(id)) {
    alert("Your session does not include a user id. Sign in again, then retry.");
    return;
  }
  fetch("../api/index.php?action=change_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      current_password: current,
      new_password: newPassword,
    }),
  })
    .then((res) => res.json().then((data) => ({ res, data })))
    .then(({ res, data }) => {
      if (res.ok && data.success) {
        alert("Password updated successfully!");
      } else {
        alert(readApiMessage(data));
      }
    })
    .catch(() => {
      alert("Network error while updating password.");
    });
}

async function handleAddUser(event) {
  event.preventDefault();
  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const password = document.getElementById("default-password").value;
  const isAdmin = parseInt(document.getElementById("is-admin").value, 10);
  if (!name || !email || !password) {
    alert("Please fill out all required fields.");
    return;
  }
  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }
  let res;
  try {
    res = await fetch("../api/index.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        is_admin: Number.isNaN(isAdmin) ? 0 : isAdmin,
      }),
    });
  } catch (_) {
    alert("Network error while adding user.");
    return;
  }
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }
  if (res.status === 201 && data.success) {
    addUserForm.reset();
    await loadUsersAndInitialize();
  } else {
    alert(readApiMessage(data));
  }
}

async function handleTableClick(event) {
  const target = event.target;
  if (target.classList.contains("delete-btn")) {
    const id = target.dataset.id;
    let res;
    try {
      res = await fetch(`../api/index.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (_) {
      alert("Network error while deleting user.");
      return;
    }
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }
    if (res.ok && data.success) {
      const nid = Number(id);
      users = users.filter((u) => Number(u.id) !== nid);
      renderTable(users);
    } else {
      alert(readApiMessage(data));
    }
    return;
  }
  if (target.classList.contains("edit-btn")) {
    const id = Number(target.dataset.id);
    const rowUser = users.find((u) => Number(u.id) === id);
    if (!rowUser) {
      alert("User not found in the current list.");
      return;
    }
    const newName = window.prompt("Full name", rowUser.name);
    if (newName === null) return;
    const newEmail = window.prompt("Email", rowUser.email);
    if (newEmail === null) return;
    const role = window.prompt('Admin? Type "1" for admin or "0" for student', String(rowUser.is_admin));
    if (role === null) return;
    const isAdmin = parseInt(role, 10);
    const body = { id };
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();
    if (trimmedName !== rowUser.name) body.name = trimmedName;
    if (trimmedEmail !== rowUser.email) body.email = trimmedEmail;
    if (!Number.isNaN(isAdmin) && isAdmin !== Number(rowUser.is_admin)) {
      body.is_admin = isAdmin;
    }
    let res;
    try {
      res = await fetch("../api/index.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (_) {
      alert("Network error while updating user.");
      return;
    }
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }
    if (res.ok && data.success) {
      await loadUsersAndInitialize();
    } else {
      alert(readApiMessage(data));
    }
  }
}

function handleSearch(event) {
  const raw =
    searchInput && searchInput.value != null
      ? searchInput.value
      : event.target.value || "";
  const term = raw.trim().toLowerCase();
  if (term === "") {
    renderTable(users);
    return;
  }
  const filtered = users.filter((u) => {
    const n = String(u.name || "").toLowerCase();
    const e = String(u.email || "").toLowerCase();
    return n.includes(term) || e.includes(term);
  });
  renderTable(filtered);
}

function handleSort(event) {
  const th = event.currentTarget;
  const idx = th.cellIndex;
  const keys = ["name", "email", "is_admin"];
  if (idx < 0 || idx > 2) return;
  const key = keys[idx];
  let dir = th.dataset.sortDir;
  if (!dir || dir === "desc") {
    dir = "asc";
  } else {
    dir = "desc";
  }
  th.dataset.sortDir = dir;
  const factor = dir === "asc" ? 1 : -1;
  users.sort((a, b) => {
    if (key === "is_admin") {
      const va = Number(a.is_admin);
      const vb = Number(b.is_admin);
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    }
    const sa = String(a[key] ?? "");
    const sb = String(b[key] ?? "");
    return sa.localeCompare(sb, undefined, { sensitivity: "base" }) * factor;
  });
  renderTable(users);
}

async function loadUsersAndInitialize() {
  let response;
  try {
    response = await fetch("../api/index.php");
  } catch (e) {
    console.error(e);
    alert("Could not load users.");
    return;
  }
  if (!response.ok) {
    console.error("load users failed", response.status);
    alert("Could not load users.");
    return;
  }
  let result;
  try {
    result = await response.json();
  } catch (e) {
    console.error(e);
    alert("Could not load users.");
    return;
  }
  if (!result.success || !Array.isArray(result.data)) {
    alert(readApiMessage(result));
    return;
  }
  users = result.data;
  renderTable(users);

  if (!loadUsersAndInitialize._listenersAttached) {
    changePasswordForm.addEventListener("submit", handleChangePassword);
    addUserForm.addEventListener("submit", handleAddUser);
    userTableBody.addEventListener("click", handleTableClick);
    searchInput.addEventListener("input", handleSearch);
    tableHeaders.forEach((header) =>
      header.addEventListener("click", handleSort)
    );
    loadUsersAndInitialize._listenersAttached = true;
  }
}
loadUsersAndInitialize._listenersAttached = false;

// --- Initial Page Load ---
loadUsersAndInitialize();
