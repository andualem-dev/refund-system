# Employee Refund Request Form

A static, single-page internal form for submitting employee refund requests. The page runs entirely in the browser (HTML/CSS/JS) and can be hosted on **GitHub Pages**. Submissions are sent to a **Google Apps Script** Web App that appends rows to a Google Sheet.

## Files

| File        | Purpose |
| ----------- | ------- |
| `index.html` | Form markup |
| `style.css`  | Layout and styling |
| `script.js`  | Validation and submission (configure webhook URL here) |
| `Code.gs`    | **Reference only** — paste into Google Apps Script, not deployed via GitHub Pages |

## 1. Set up the Google Sheet

1. Create a new [Google Sheet](https://sheets.google.com).
2. Rename the first tab to **`Refund Requests`** (or let the script create it on first submission).
3. Optional: add a header row in row 1:
   - `Timestamp` | `Employee Name` | `Project Name` | `Amount` | `Purpose` | `Date`  
   The script will add headers automatically if the sheet is empty.

## 2. Create and paste the Apps Script

1. In the spreadsheet, open **Extensions → Apps Script**.
2. Remove any default code in `Code.gs`.
3. Copy the contents of **`Code.gs`** from this repository and paste into the Apps Script editor.
4. Save the project (e.g. name it “Refund Request Webhook”).
5. If prompted, authorize the script to access the spreadsheet (review permissions and allow).

## 3. Deploy the Web App and get the URL

1. In Apps Script, click **Deploy → New deployment**.
2. Click the gear icon next to “Select type” and choose **Web app**.
3. Set:
   - **Description:** e.g. “Refund form webhook”
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone** (required so the public form can POST without sign-in)
4. Click **Deploy** and complete authorization if asked.
5. Copy the **Web app URL**. It should look like:
   `https://script.google.com/macros/s/AKfycb.../exec`

When you change the script later, use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy** so the same URL serves the updated code.

## 4. Plug the URL into the frontend

1. Open **`script.js`** in this repo.
2. Set the constant at the top:

   ```javascript
   const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/YOUR_ID/exec";
   ```

3. Commit and push (or upload) so your hosted site uses the new URL.

### CORS and `no-cors` (important)

Browsers enforce CORS on `fetch()`. Google Apps Script Web App responses **do not** expose headers that let a page on GitHub Pages read the JSON body or reliably detect HTTP error status from JavaScript.

This project uses:

```javascript
fetch(GOOGLE_SHEET_WEBHOOK_URL, { method: "POST", mode: "no-cors", ... })
```

**Tradeoff:**

- The browser will not let you read the response body or status from the sheet webhook.
- If the request is accepted at the network level, `fetch` **resolves** and the UI shows **success** optimistically.
- Failures such as a wrong URL, network offline, or blocked request can still reject or fail before send; those show an error.
- Validation errors on the server (e.g. bad JSON) may still append nothing, but the user might see success—verify rows in the sheet during testing.

For an internal form, this is a common and acceptable pattern. For strict confirmation, you would need a backend you control with proper CORS or a different integration (e.g. Google Forms).

**Content-Type:** The client sends `Content-Type: text/plain` with a JSON body so the preflight stays simple; Apps Script still receives the body in `e.postData.contents`.

## 5. Test locally

1. Open `index.html` in a browser (or use a simple local static server).
2. Fill out the form and submit.
3. Refresh the Google Sheet and confirm a new row appears with a server **Timestamp** plus your fields.

## 6. Enable GitHub Pages

1. Push this project to a GitHub repository.
2. Go to the repo **Settings → Pages**.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** e.g. `main` and folder **`/ (root)`**
4. Save. After a minute or two, GitHub provides a public URL (e.g. `https://<user>.github.io/<repo>/`).
5. Ensure `index.html`, `style.css`, and `script.js` are at the root of the published branch so relative paths work.

## Form behavior

- All fields are required; refund amount must be **> 0**.
- **Employee** is chosen from a fixed list.
- **Date** defaults to today and can be edited.
- Submit shows a loading state; the button is disabled to prevent double submission.
- On success, project/amount/purpose/date reset; the selected employee stays the same.
- No login or authentication on the form itself.

## Security notes (internal use)

- The Web App URL is public once embedded in client-side JS—anyone with the URL could POST data. Restrict access by keeping the URL private within your org, using a separate sheet, or adding optional checks in `Code.gs` (shared secret field, allowlist, etc.) if you need stricter control later.
