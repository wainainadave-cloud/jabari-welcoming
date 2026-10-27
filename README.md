# Baby Jabari Mungai — deployment handoff

Existing invitation design retained from the user's Downloads project. Event: 5 December 2026, noon, Waka Waka Garden, Karen. Confirm these details before publishing.

## Current state

Prepared locally, not deployed. No real RSVP persistence or browser CORS behavior has been verified. The test suite uses a simulated Apps Script/Sheet runtime. GitHub connection is pending; the Google Drive connector returned an unavailable-tool error. No account credentials have been saved.

## Communication

GitHub Pages serves only `public/`. The browser POSTs JSON using `Content-Type: text/plain` to the deployed Apps Script `/exec` URL, avoiding a preflight request. Apps Script validates, locks, deduplicates, appends to the private Sheet, flushes, reads back the saved ID, then returns JSON. The site advances only after an acknowledged save. A timeout preserves the request ID for a retry of the same response. Do not switch to `no-cors`: an opaque response cannot prove that a save succeeded.

## Google setup

1. Sign in to the intended owner Google account. Create a PRIVATE spreadsheet named **Baby Jabari Mungai — RSVPs**. Keep general access Restricted.
2. Open Extensions → Apps Script. Add `Code.gs` and `Dashboard.html` from `apps-script/`. Enable the manifest in project settings and copy `appsscript.json`.
3. Run `setup` once and approve the Google authorization after reviewing requested scopes. It creates the RSVP headers and saves the Sheet ID privately in Script Properties. It refuses to overwrite unexpected existing columns.
4. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**. This intentionally exposes only a validated RSVP write endpoint and a health response. The Sheet stays private. Review and approve deployment access yourself.
5. Copy its `/exec` URL into `public/config.js`. Never publish the Sheet ID, OAuth tokens, merchant secrets or guest exports.
6. Reload the Sheet, select **Jabari Family → Open dashboard**. Google account sign-in and private Sheet access control the dashboard. There is no public dashboard page or guest-list web route. Family members needing the custom dialog require appropriate Sheet access; limit editors to trusted family, since editors can change the bound script. Blank identities fail closed.

## GitHub Pages

1. Create/select the intended repository and upload this project to `main` (include `.github/workflows/pages.yml`). Only public invitation content belongs in the repository. `apps-script/` source has no credentials or guest data.
2. In Settings → Pages choose **GitHub Actions**. Push to `main` to run tests and deploy `public/`.
3. Confirm Pages deployment succeeded and open the returned GitHub Pages URL.

## Required live acceptance checks

- Submit a clearly labelled test RSVP from the deployed Pages website. Confirm the success flow appears AND the matching name, phone and attendance exist in the private Sheet and dashboard.
- Retry after a deliberately lost response; verify the same request ID produces one row. Local tests cover this logic; browser behavior still needs validation.
- From an incognito window, verify guests can submit without Google sign-in and cannot open the private Sheet/dashboard. Public GET must return only health data.
- Confirm the browser can read the Apps Script JSON after its redirect. If CORS or organization policy blocks it, keep RSVP disabled and use a hosted Apps Script form via a direct link as the fallback; never fake a save confirmation.
- Check phone-width layout, consent validation, decline/maybe handling, CSV export and error states. Review test records before any deletion.
- Keep Sheet access Restricted. Delete event-planning personal data after the family no longer needs it, using the correction/deletion contact shown on the form.

## M-Pesa assessment — disabled

The button is disabled and the backend has no charge or callback routes. Existing Node server payment code has deliberately not been copied into this deployment.

GitHub Pages cannot keep Daraja credentials secret or receive server callbacks. Before enabling payments, provision a dedicated HTTPS server/service with secret storage, approved shortcode and transaction type, consumer key/secret, passkey, sandbox/live configuration, durable payment records and a verified callback/reconciliation workflow. Keep all secrets out of GitHub and Sheets cells. Match checkout IDs, amount, phone and receipt; reconcile independently with Safaricom before marking paid. Test failures, cancellations, duplicate callbacks and delayed confirmation. Do not infer payment success from an STK request being accepted. Review current requirements in the official Daraja portal: https://developer.safaricom.co.ke/.

## Tests

`node --test tests/backend.test.cjs`

These validate server logic using mocks. They do not establish live deployment, Google authorization or actual Google Sheets persistence.

Anonymous intake has basic input checks, a honeypot and a best-effort per-phone throttle. It does not verify ownership of a phone or stop distributed spam. Add invitation verification or a server-validated challenge if abuse occurs.
