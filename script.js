// Paste your deployed Google Apps Script Web App URL here (must end with /exec).
const GOOGLE_SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxsYKal3FaBJ-59Vk7dZaHfw2v9K6UR9jo6OxswMzOzw1BVUaK9EFuQfPqGTamRiiDA/exec";

const EMPLOYEE_NAMES = [
  "Ledet",
  "Yabets",
  "Andualem",
  "Kidus",
  "Heldana",
  "Bement",
];

const form = document.getElementById("refund-form");
const submitBtn = document.getElementById("submit-btn");
const formMessage = document.getElementById("form-message");
const btnLabel = submitBtn.querySelector(".btn-label");
const btnSpinner = submitBtn.querySelector(".btn-spinner");

const fields = {
  name: document.getElementById("employee-name"),
  project: document.getElementById("project-name"),
  amount: document.getElementById("refund-amount"),
  purpose: document.getElementById("purpose"),
  date: document.getElementById("request-date"),
};

const errorEls = {
  name: document.getElementById("error-name"),
  project: document.getElementById("error-project"),
  amount: document.getElementById("error-amount"),
  purpose: document.getElementById("error-purpose"),
  date: document.getElementById("error-date"),
};

function formatTodayForInput() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

fields.date.value = formatTodayForInput();

EMPLOYEE_NAMES.forEach((employeeName) => {
  const option = document.createElement("option");
  option.value = employeeName;
  option.textContent = employeeName;
  fields.name.appendChild(option);
});

function clearFieldErrors() {
  Object.values(fields).forEach((el) => el.classList.remove("invalid"));
  Object.values(errorEls).forEach((el) => {
    el.textContent = "";
  });
}

function setFieldError(key, message) {
  fields[key].classList.add("invalid");
  errorEls[key].textContent = message;
}

function validateForm() {
  clearFieldErrors();
  let valid = true;

  const name = fields.name.value.trim();
  if (!name || !EMPLOYEE_NAMES.includes(name)) {
    setFieldError("name", "Please select your name.");
    valid = false;
  }

  const project = fields.project.value.trim();
  if (!project) {
    setFieldError("project", "Project name is required.");
    valid = false;
  }

  const amountRaw = fields.amount.value.trim();
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    setFieldError("amount", "Enter an amount greater than 0.");
    valid = false;
  }

  const purpose = fields.purpose.value.trim();
  if (!purpose) {
    setFieldError("purpose", "Please describe the purpose of this refund.");
    valid = false;
  }

  const date = fields.date.value.trim();
  if (!date) {
    setFieldError("date", "Date is required.");
    valid = false;
  }

  return valid
    ? {
        name,
        project,
        amount,
        purpose,
        date,
      }
    : null;
}

function showMessage(type, text) {
  formMessage.hidden = false;
  formMessage.className = `form-message ${type}`;
  formMessage.textContent = text;
}

function hideMessage() {
  formMessage.hidden = true;
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  btnSpinner.hidden = !isSubmitting;
  btnLabel.textContent = isSubmitting ? "Submitting…" : "Submit Request";
}

function resetFormAfterSuccess() {
  fields.project.value = "";
  fields.amount.value = "";
  fields.purpose.value = "";
  fields.date.value = formatTodayForInput();
  clearFieldErrors();
}

async function submitToSheet(payload) {
  if (
    !GOOGLE_SHEET_WEBHOOK_URL ||
    GOOGLE_SHEET_WEBHOOK_URL === "YOUR_WEB_APP_URL_HERE"
  ) {
    throw new Error(
      "Webhook URL is not configured. Set GOOGLE_SHEET_WEBHOOK_URL in script.js."
    );
  }

  // Apps Script Web Apps do not return CORS headers that allow reading the
  // response in the browser. We use no-cors and treat a resolved fetch as success.
  const response = await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return response;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const payload = validateForm();
  if (!payload) {
    showMessage("error", "Please fix the errors below and try again.");
    return;
  }

  setSubmitting(true);

  try {
    await submitToSheet(payload);
    resetFormAfterSuccess();
    showMessage(
      "success",
      "Your refund request was submitted. If it does not appear in the sheet shortly, contact your administrator."
    );
  } catch (err) {
    console.error(err);
    showMessage(
      "error",
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again later."
    );
  } finally {
    setSubmitting(false);
  }
});
