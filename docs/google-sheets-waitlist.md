# Google Sheets Waitlist Setup

This repo is already wired to submit waitlist entries from `souschef-frontend/src/app/page.tsx` to:

- `NEXT_PUBLIC_WAITLIST_WEBHOOK_URL`

Use this checklist to finish the Google Sheets connection.

## 1) Create the sheet

1. Create a new Google Sheet.
2. Name the tab `Waitlist` (or update `SHEET_NAME` in the script).

## 2) Create Apps Script webhook

1. In that sheet: `Extensions -> Apps Script`.
2. Replace default code with `souschef-frontend/google-apps-script/waitlist-webhook.gs`.
3. Save.
4. Deploy:
   - `Deploy -> New deployment`
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Copy the Web app URL.

## 3) Add GitHub secret

In your GitHub repo:

1. `Settings -> Secrets and variables -> Actions`
2. `New repository secret`
3. Name: `NEXT_PUBLIC_WAITLIST_WEBHOOK_URL`
4. Value: the Apps Script web app URL

## 4) Redeploy GitHub Pages

Your workflow already injects this secret in `.github/workflows/deploy-waitlist-pages.yml`.

Trigger redeploy by:

- pushing any commit to `main` touching `souschef-frontend/**`, or
- running `Actions -> Deploy Waitlist To GitHub Pages -> Run workflow`

## 5) Verify

1. Open your live waitlist page.
2. Submit a test name + email.
3. Confirm a new row appears in the Google Sheet.

## Notes

- Frontend uses `fetch(..., { mode: "no-cors" })` for compatibility with Apps Script web apps.
- Local fallback still stores entries in browser localStorage if webhook is not configured.
- The script deduplicates by email.
