/**
 * Google Apps Script Web App — append refund requests to a sheet.
 *
 * Deploy: Deploy > New deployment > Type: Web app
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Sheet setup: create a tab named exactly "Refund Requests" with header row:
 * Timestamp | Employee Name | Project Name | Amount | Purpose | Date
 */

const SHEET_NAME = "Refund Requests";
const API_VERSION = 2;

/**
 * Run from the editor (Run menu) before deploying. View: Execution log.
 * Confirms totals logic works; does NOT update the live Web App by itself.
 */
function testDoGetTotal() {
  const output = doGet({
    parameter: { action: "total", name: "Andualem" },
  }).getContent();
  Logger.log(output);
}

function testDoGetHealth() {
  const output = doGet({ parameter: {} }).getContent();
  Logger.log(output);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "Missing request body" }, 400);
    }

    const data = JSON.parse(e.postData.contents);
    const name = String(data.name || "").trim();
    const project = String(data.project || "").trim();
    const amount = Number(data.amount);
    const purpose = String(data.purpose || "").trim();
    const date = String(data.date || "").trim();

    if (!name || !project || !purpose || !date) {
      return jsonResponse({ ok: false, error: "Missing required fields" }, 400);
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return jsonResponse({ ok: false, error: "Amount must be a positive number" }, 400);
    }

    const sheet = getOrCreateSheet_();
    ensureHeaderRow_(sheet);

    const timestamp = new Date();
    sheet.appendRow([timestamp, name, project, amount, purpose, date]);

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err && err.message ? err.message : "Server error" },
      500
    );
  }
}

function doGet(e) {
  e = e || {};
  const params = e.parameter || {};
  const action = params.action;

  if (action === "total") {
    const name = String(params.name || "").trim();
    if (!name) {
      return respondTotal_({ ok: false, error: "Missing name" }, params.callback);
    }
    const total = computeEmployeeTotal_(name);
    return respondTotal_({ ok: true, name: name, total: total }, params.callback);
  }

  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      message: "Refund webhook v" + API_VERSION + " (supports ?action=total)",
      apiVersion: API_VERSION,
      hint: "Use ?action=total&name=EmployeeName to read refund totals.",
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function respondTotal_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback && /^[a-zA-Z_$][\w.$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function computeEmployeeTotal_(employeeName) {
  const sheet = getOrCreateSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 0;
  }

  const rows = sheet.getRange(2, 1, lastRow, 6).getValues();
  const target = employeeName.toLowerCase();
  let sum = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowName = String(rows[i][1] || "").trim().toLowerCase();
    if (rowName === target) {
      const amount = Number(rows[i][3]);
      if (!Number.isNaN(amount)) {
        sum += amount;
      }
    }
  }

  return Math.round(sum * 100) / 100;
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeaderRow_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Employee Name",
      "Project Name",
      "Amount",
      "Purpose",
      "Date",
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
  }
}

function jsonResponse(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
  // Note: Custom status codes are limited in Apps Script; body still carries ok/error.
  return output;
}
