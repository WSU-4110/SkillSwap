# Request status tracking

Depends on PR #51 and its `database/add-swap-requests.sql` migration. Merge that PR and import the migration first. This branch starts from main and adds only request listing; accept and reject endpoints remain in PRs #52 and #53.

`GET /api/requests` lists the signed-in user's requests. Include the login cookie (`credentials: 'include'` in fetch).

Optional query parameters:
- `direction=all` (default), `incoming`, or `outgoing`
- `status=pending`, `accepted`, or `rejected`; omit to include all statuses
- `offset=0` (default), a nonnegative integer up to 1000000

The response is `{ requests: [...], nextOffset: number | null }`. Each request includes id, senderId, senderName, recipientId, recipientName, status, createdAt, and direction. At most 50 are returned, newest first. Pass nextOffset as offset to load more. An empty list is a successful response. No email addresses, passwords, or other users' requests are exposed.

Validation errors return 400, missing login returns 401, and database errors return 500. The sender/recipient scope always comes from the session, not from query parameters.

Run `node --test backend/tests/request-status.test.js`. These tests simulate the database. Real MySQL and frontend integration remain pending. Test with three accounts: A sends to B, C must not see it, and both A and B must see its status change after B accepts or rejects. Check filters, empty lists, pagination, logged-out access, and database failures.
