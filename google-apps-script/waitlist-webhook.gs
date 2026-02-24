/**
 * Sue The SousChef waitlist webhook for Google Sheets.
 *
 * 1) Open https://script.google.com and create a new Apps Script project.
 * 2) Replace Code.gs contents with this file.
 * 3) Set SHEET_NAME if needed.
 * 4) Deploy > New deployment > Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) Copy the Web app URL and set it as NEXT_PUBLIC_WAITLIST_WEBHOOK_URL.
 */

const SHEET_NAME = "Waitlist";

function doPost(e) {
  try {
    const payload = parsePayload_(e);

    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const createdAt = String(payload.createdAt || new Date().toISOString());
    const source = String(payload.source || "waitlist-landing");
    const userAgent = String(payload.userAgent || "");

    if (!email || !isValidEmail_(email)) {
      return json_({ ok: false, error: "invalid_email" });
    }

    const sheet = getOrCreateSheet_();

    // Prevent duplicate waitlist rows for the same email.
    if (emailExists_(sheet, email)) {
      return json_({ ok: true, duplicate: true });
    }

    sheet.appendRow([new Date(), name, email, createdAt, source, userAgent]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parsePayload_(e) {
  const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
  const parsed = JSON.parse(raw || "{}");
  return parsed && typeof parsed === "object" ? parsed : {};
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["received_at", "name", "email", "createdAt", "source", "userAgent"]);
  }

  return sheet;
}

function emailExists_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const target = email.toLowerCase();

  for (let i = 0; i < values.length; i += 1) {
    const existing = String(values[i][0] || "").trim().toLowerCase();
    if (existing === target) return true;
  }

  return false;
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
