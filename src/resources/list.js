/*
  Requirement: Populate the "Course Resources" list page.

  Instructions:
  1. Link this file to `list.html` using:
     <script src="list.js" defer></script>

  2. In `list.html`, add id="resource-list-section" to the
     <section> element that will contain the resource articles.

  3. Implement the TODOs below.
*/

// --- Element Selections ---
// TODO: Select the section for the resource list ('#resource-list-section').
const listSection = document.querySelector('#resource-list-section');

// --- Functions ---

/**
 * TODO: Implement the createResourceArticle function.
 * It takes one resource object { id, title, description, link }.
 * It should return an <article> element matching the structure in `list.html`.
 * The "View Resource & Discussion" link's `href` MUST be set to
 * `details.html?id=${id}` so the detail page knows which resource to load.
 */
function createResourceArticle(resource) {
  const article = document.createElement('article');

  const h3 = document.createElement('h3');
  h3.textContent = resource.title ?? '';

  const p = document.createElement('p');
  p.textContent = resource.description ?? '';

  const a = document.createElement('a');
  a.href = `details.html?id=${encodeURIComponent(resource.id)}`;
  a.textContent = 'View Resource & Discussion';

  article.appendChild(h3);
  article.appendChild(p);
  article.appendChild(a);

  return article;
}

/**
 * TODO: Implement the loadResources function.
 * This function must be 'async'.
 * It should:
 * 1. Use `fetch()` to GET data from the API endpoint:
 *    './api/index.php'
 * 2. Parse the JSON response. The API returns { success: true, data: [...] }.
 * 3. Clear any existing content from the list section.
 * 4. Loop through the resources array in `data`. For each resource:
 *    - Call `createResourceArticle()` with the resource object.
 *    - Append the returned <article> element to the list section.
 */
async function loadResources() {
  try {
    const resp = await fetch('./api/index.php');
    const json = await resp.json();
    const data = (json && json.success && Array.isArray(json.data)) ? json.data : [];

    if (listSection) {
      listSection.innerHTML = '';
      for (const res of data) {
        listSection.appendChild(createResourceArticle(res));
      }
    }
  } catch {
    if (listSection) {
      listSection.innerHTML = '';
    }
  }
}

// --- Initial Page Load ---
// Call the function to populate the page.
loadResources();
