# Lost & Found REST API

A REST API built with **Node.js, Express.js, Prisma ORM, and MySQL** that allows users to report lost and found items, search reports, and manage their own listings.

## Features

- User registration and login with JWT authentication.
- Create, view, update, and delete item reports.
- Search and filter items.
- Mark items as recovered.
- Password hashing and ownership protection.

## Tech Stack

- Node.js
- Express.js
- MySQL
- Prisma ORM
- JWT
- bcryptjs

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/lost_found_db"
JWT_SECRET="your_secure_secret"
PORT=3000
```

3. Create the database in MySQL:

```sql
CREATE DATABASE lost_found_db;
```

4. Apply migrations and generate Prisma Client:

```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the server:

```bash
node api.js
```

The API runs at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Log in |
| POST | `/items` | Create an item report |
| GET | `/items` | List, search, and filter items |
| GET | `/items/:id` | Get item details |
| PATCH | `/items/:id` | Update your report |
| PATCH | `/items/:id/recovered` | Mark an item as recovered |
| DELETE | `/items/:id` | Delete your report |

Protected endpoints require a JWT token in the `Authorization: Bearer <token>` header.

## Notes

- Item types: `LOST`, `FOUND`
- Item statuses: `OPEN`, `RECOVERED`
- Users can modify and delete only their own reports.
- Keep `.env` and `node_modules/` out of version control.