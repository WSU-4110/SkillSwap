# Send a swap request

Import `database/add-swap-requests.sql` through phpMyAdmin after the users table exists. Start the backend using the existing environment settings.

Send `POST /api/requests` with a logged-in session and JSON:

```json
{ "recipientId": 2 }
```

Use the selected student's actual numeric ID. The sender comes from the login session; the frontend should not send a sender ID. When using fetch from the frontend, include `credentials: 'include'` and `Content-Type: application/json`.

A successful response has status 201 and contains:

```json
{
  "message": "Swap request sent!",
  "request": {
    "id": 1,
    "senderId": 1,
    "recipientId": 2,
    "status": "pending"
  }
}
```

Errors: 400 for invalid IDs or requesting yourself, 401 when logged out, 404 when the recipient does not exist, 409 for a duplicate pending request, and 500 when saving fails.

This task creates requests only. Accepting, rejecting, and reading request status are separate tasks. Import database/prevent-duplicate-requests.sql after the requests table is created to prevent duplicate pending requests in either direction. Completed requests do not prevent a new request.

## Verification

Run `node --test backend/tests/requests.test.js` from the project root. These tests use a simulated database; they do not verify MySQL connectivity or SQL execution.

Before marking the feature ready, test with MySQL running: log in as one student, send to a second student, and confirm a pending row in `swap_requests`. Also check logged-out, self-request, invalid-ID, and missing-student cases.
