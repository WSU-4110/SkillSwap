SkillSwap database: MySQL schema and setup scripts.
## Run the backend locally

1. Install Node.js and start MySQL in XAMPP.
2. Create the database and users table by importing
   `database/schema.sql` through phpMyAdmin.
3. Open a terminal in the `backend` folder and run:

   ```bash
   npm install
   ```

4. Copy `.env.example` to a new file named `.env`.
   Update the database settings for your computer.
5. Check the database connection:

   ```bash
   node test-db.js
   ```

6. Start the server:

   ```bash
   node server.js
   ```

The backend runs at http://localhost:3000 by default.

## Create an account

Endpoint: `POST /api/register`

Send JSON containing:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Practice123!"
}
```

Rules:
- Name: 1–100 characters after trimming spaces.
- Email: valid format, maximum 254 characters, and unique.
- Password: at least 8 characters and at most 72 UTF-8 bytes.

Passwords are stored as bcrypt hashes.

Responses:
- 201: account created.
- 400: missing or invalid information.
- 409: email already registered.
- 500: server or database error.

## Manual checks performed

- Account creation succeeded; the row appeared in MySQL.
- The stored password was a bcrypt hash.
- Duplicate email was rejected.
- Short password was rejected.
- Invalid email was rejected.