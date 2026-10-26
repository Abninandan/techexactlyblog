# techexactlyblog
this is a blogsite to test crud operations
# Threadline Blog

Threadline is a responsive MERN blog application with a public story feed, reader accounts, author-owned posts and comments, image uploads, and a role-protected administrator workspace.

The full installation, operations, architecture, and API guide is also available as [PROJECT_DOCUMENTATION.docx](./PROJECT_DOCUMENTATION.docx).

## Contents

- [Technology and prerequisites](#technology-and-prerequisites)
- [Quick start](#quick-start)
- [Environment configuration](#environment-configuration)
- [Database seeding](#database-seeding)
- [Run the application](#run-the-application)
- [Tests](#tests)
- [Features and access rules](#features-and-access-rules)
- [API overview](#api-overview)
- [Project layout](#project-layout)
- [Operational and security notes](#operational-and-security-notes)

## Technology and prerequisites

- Node.js 20 or newer and npm
- MongoDB (local instance or hosted MongoDB URI)
- SMTP service credentials if password-reset emails are needed
- Git (to clone the source)

The backend is Express 5, Mongoose, and Node.js. The frontend is React 19 using Create React App. The backend test suite uses Jest and Supertest; the frontend suite uses Jest and React Testing Library.

## Quick start

From the repository root:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` with a MongoDB URI and two different, high-entropy signing secrets. Configure SMTP if password-reset emails are required. Seed the local database, then start the API:

```powershell
npm run seed
node index.js
```

In a second terminal:

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:3000`. The API listens on port 5000 by default; its health response is at `http://localhost:5000/`.

For macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`, and otherwise run the same npm commands from each folder.

## Environment configuration

Copy `backend/.env.example` to `backend/.env`. Never commit real credentials or production secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Backend port; defaults to `5000`. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Signs short-lived access tokens. Use a long random secret. |
| `REFRESH_TOKEN_SECRET` | Yes | Signs refresh tokens; use a different long random secret. |
| `ACCESS_TOKEN_TTL` | No | Access-token lifetime; defaults to `15m`. |
| `REFRESH_TOKEN_TTL` | No | Refresh-token lifetime; defaults to `7d`. |
| `CLIENT_URL` | No | Frontend URL used to build password-reset links; defaults to `http://localhost:3000`. |
| `SMTP_HOST` | For email | SMTP server hostname. |
| `SMTP_PORT` | For email | SMTP port; commonly `587` for STARTTLS. |
| `SMTP_USER` | For email | SMTP login. |
| `SMTP_PASS` | For email | SMTP password or application password. |
| `SMTP_FROM` | No | Sender address; defaults according to the mail service. |
| `SMTP_SECURE` | No | `true` for implicit TLS; otherwise `false`. |
| `UPLOAD_DIR` | No | Image storage directory; defaults to `backend/uploads`. |
| `MAX_UPLOAD_SIZE_MB` | No | Maximum size per uploaded image in MB; defaults to `5`. |
| `SEED_ADMIN_EMAIL` | No | Demo administrator email override. |
| `SEED_ADMIN_PASSWORD` | No | Demo administrator password override. |
| `SEED_USER_EMAIL` | No | Demo regular-user email override. |
| `SEED_USER_PASSWORD` | No | Demo regular-user password override. |

For the frontend, optionally create `frontend/.env` and set:

```dotenv
REACT_APP_API_URL=http://localhost:5000/api
```

The frontend defaults to that API URL if the variable is not set. Restart the development server after changing frontend environment variables.

## Database seeding

Run from `backend/`:

```powershell
npm run seed
```

The idempotent seeder creates or updates the administrator and regular-user roles, permissions, role-permission assignments, and demo accounts. Role codes are `1` (admin) and `2` (user). Existing passwords on already-seeded accounts are not overwritten. The seeder refuses to run when `NODE_ENV=production`, and requires `MONGO_URI`.

For local development only, default demo credentials are:

| Role | Email | Default password |
| --- | --- | --- |
| Admin | `admin@blog.local` | `Admin123!` |
| Regular user | `user@blog.local` | `User123!` |

Change or override demo credentials before sharing a development environment. Do not use these defaults in production.

## Run the application

Start the backend and frontend in separate terminals:

```powershell
# Terminal 1
cd backend
node index.js
```

```powershell
# Terminal 2
cd frontend
npm start
```

The development URLs are:

- Public client: `http://localhost:3000`
- Admin workspace: `http://localhost:3000/admin`
- API base: `http://localhost:5000/api`
- API health: `http://localhost:5000/`

## Tests

Run backend unit and route-integration tests from `backend/`:

```powershell
npm test
npm run test:coverage
```

Backend tests use Jest and Supertest. Unit tests cover token signing and hashing, role authorization, pagination, validation, and owner-scoped content writes. Route-integration tests exercise mounted authentication, post, and administrator endpoints with mocked persistence, so they do not require a running MongoDB server.

Run the frontend tests from `frontend/`:

```powershell
$env:CI = "true"
npm test -- --watchAll=false --runInBand
```

Create a production frontend build:

```powershell
npm run build
```

The test coverage command prints file and aggregate coverage in the terminal and creates a local `backend/coverage/` report. Generated coverage output should not be committed.

## Features and access rules

- Public paginated and searchable feed, author directory and author pages, related posts, post details, and comments.
- Registration and login for regular users, JWT access tokens, rotating/revocable refresh tokens, logout, and password reset by email.
- Posts with URL-friendly slugs, timestamps, multiple supported image formats, ownership-checked editing/deletion, and soft deletion.
- Comments with create, edit, and delete operations for their author.
- Admin dashboard totals and paginated user, post, and comment management, including user/post/comment status controls, post image galleries, and admin comment edit/delete.
- Admin-editable company name, short description, and logo, presented in the admin and public interfaces.
- API-level role checks and owner-scoped post/comment mutations; frontend route protection is not the security boundary.
- Request validation with Zod, authentication rate limiting, and centralized API error handling.

## API overview

All API paths below are prefixed with `/api`. Most successful responses wrap results in `data`; list endpoints also return pagination metadata. Protected routes require an access JWT in the `Authorization` header. Authentication endpoints are rate-limited.

### Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a regular user. |
| `POST` | `/auth/login` | Sign in a regular user. |
| `POST` | `/auth/refresh` | Rotate a refresh token; send `{ "refreshToken": "..." }`. |
| `POST` | `/auth/logout` | Revoke a refresh token. |
| `POST` | `/auth/forgot-password` | Request a password-reset email. |
| `POST` | `/auth/reset-password` | Complete reset using the reset token and new password. |
| `POST` | `/admin/login` | Sign in an administrator. |

### Public posts, comments, and branding

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/posts` | Public feed; supports `page`, `limit` (1–100), and `search`. |
| `GET` | `/posts/authors` | Authors with public posts. |
| `GET` | `/posts/authors/:authorId` | Author profile and paginated posts. |
| `GET` | `/posts/:slug` | Post detail, images, active comments, and related posts. |
| `GET` | `/branding` | Public company branding. |
| `POST` | `/posts` | Create a post. Authenticated regular user; multipart image field `images` (up to 10). |
| `PATCH` | `/posts/:postId` | Edit an owned post. |
| `DELETE` | `/posts/:postId` | Soft-delete an owned post. |
| `POST` | `/posts/:postId/comments` | Create a comment on a visible post. |
| `PATCH` | `/posts/comments/:commentId` | Edit an owned comment. |
| `DELETE` | `/posts/comments/:commentId` | Delete an owned comment. |
| `PUT` | `/posts/:postId/rating` | Set the authenticated regular user's rating. |

### Administrator management

All routes below are under `/admin` and require an administrator access token, except `POST /admin/login`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/dashboard` | Total users, non-deleted posts, and comments. |
| `GET` / `PUT` | `/admin/branding` | Read/update company name, description, and logo. Update is multipart; text fields are `companyName`, `shortDescription`, `removeLogo`, and optional file field `logo`. |
| `GET` | `/admin/users` | Paginated regular users; supports `page`, `limit`, `search`, and `status`. |
| `PATCH` | `/admin/users/:userId/status` | Set `{ "isActive": true|false }`. |
| `GET` | `/admin/posts` | Paginated posts; supports `page`, `limit`, `title`, `userName`, `status`, `minRating`, and `maxRating`. |
| `GET` | `/admin/posts/:postId/images` | List images for a post. |
| `POST` | `/admin/posts/:postId/images` | Upload additional images using multipart field `images` (up to 10). |
| `PATCH` | `/admin/posts/:postId` | Edit any post. |
| `PATCH` | `/admin/posts/:postId/status` | Set post active status. |
| `DELETE` | `/admin/posts/:postId` | Soft-delete any post. |
| `GET` | `/admin/comments` | Paginated comments; supports `page`, `limit`, `status`, and `postId`. |
| `PATCH` | `/admin/comments/:commentId` | Edit any comment. |
| `PATCH` | `/admin/comments/:commentId/status` | Set comment active status. |
| `DELETE` | `/admin/comments/:commentId` | Delete any comment. |

Pagination defaults to page 1 and 10 items; the backend maximum is 100. Invalid page sizes, statuses, IDs, and request payloads return client errors.

## Project layout

```text
backend/
scripts/seed.js Development roles, permissions, and demo accounts
src/
config/ MongoDB connection
Controller/ Auth, post, admin, branding, and rating handlers
Middleware/ JWT authentication, role authorization, rate limiting
Model/Mongodb/ Mongoose models and relationships
Route/ Express route groups mounted under /api
utils/ Token, mail, and upload helpers
tests/ Jest unit tests and Supertest route integration tests
index.js Backend entry point
frontend/
src/
Context/ Shared UI/auth contexts
pages/ Public pages and modular Admin workspace
services/ Public and admin API clients
```

## Operational and security notes

- Keep `.env` files, signing keys, SMTP credentials, and real passwords out of source control.
- Use different strong random values for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`.
- The demo seeder is for development/test environments only; it refuses `NODE_ENV=production`.
- User and admin API permissions are enforced server-side. A hidden frontend control is never treated as authorization.
- Uploaded images are stored under `UPLOAD_DIR` (default `backend/uploads`); persist and back up that directory if uploaded media must survive deployment replacement.
- SMTP is required only for actual password-reset email delivery.
- Google and Facebook OAuth login are not currently configured in this source tree. Social sign-in is therefore not included in the implemented login flow.
- Real-time Socket.IO notifications are not currently implemented.