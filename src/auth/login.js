/*
  Requirement: Add client-side validation to the login form.

  Instructions:
  1. This file is already linked to your HTML via a <script> tag with the 'defer' attribute
     at the bottom of the </body> in login.html.
  
  2. In your login.html, a <div id="message-container"> has been added *after* the </fieldset>
     but before the </form> closing tag. This div will be used to display success or error messages.
  
  3. Implement the JavaScript functionality as described in the TODO comments.
*/

// --- Element Selections ---
// We can safely select elements here because 'defer' guarantees
// the HTML document is parsed before this script runs.

// TODO: Select the login form by its id "login-form".
const loginForm = document.getElementById("login-form");

// TODO: Select the email input element by its ID.
const emailInput = document.getElementById("email");

// TODO: Select the password input element by its ID.
const passwordInput = document.getElementById("password");

// TODO: Select the message container element by its ID.
const messageContainer = document.getElementById("message-container");

// --- Functions ---

/**
 * TODO: Implement the displayMessage function.
 */
function displayMessage(message, type) {
  messageContainer.textContent = message;
  messageContainer.className = type;
}

/**
 * TODO: Implement the isValidEmail function.
 */
function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

/**
 * TODO: Implement the isValidPassword function.
 */
function isValidPassword(password) {
  return password.length >= 8;
}

/**
 * TODO: Implement the handleLogin function.
 */
function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!isValidEmail(email)) {
    displayMessage("Invalid email format.", "error");
    return;
  }

  if (!isValidPassword(password)) {
    displayMessage("Password must be at least 8 characters.", "error");
    return;
  }

  displayMessage("Login successful!", "success");

  emailInput.value = "";
  passwordInput.value = "";
}

/**
 * TODO: Implement the setupLoginForm function.
 */
function setupLoginForm() {
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

// --- Initial Page Load ---
setupLoginForm();
