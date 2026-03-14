# Institutional Research Repository API

**Department of Computer Engineering, Olabisi Onabanjo University (Ibogun Campus)**

This backend serves as the core engine for the digital transformation of academic archiving within the department. It addresses the vulnerability of physical documents and the inefficiency of manual retrieval by providing a secure, metadata-driven digital platform.

## 🚀 Tech Stack

**Runtime:** Node.js with TypeScript

**Framework:** Express.js

**Database:** PostgreSQL

**ORM:** Drizzle ORM
**Validation:** Zod
**Security:** bcrypt password hashing and secure role-based access

## 📁 Project Structure

Following a **Layered Architecture** to ensure academic continuity and protect intellectual property:

```text
/src
  ├── config/         # Database and Environment configurations
  ├── controllers/    # Request handlers (Logic for uploads, approvals)
  ├── db/             # Drizzle Schema, Migrations, and Seed scripts
  ├── middleware/     # Auth (RBAC) and Validation middleware
  ├── routes/         # Express API route definitions
  └── utils/          # Security helpers and general utilities

```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL instance

### Installation

1. Clone the repository and install dependencies:

```bash
npm install

```

2. Configure environment variables in a `.env` file:

```env
DATABASE_URL=postgres://user:password@localhost:5432/repository_db
JWT_SECRET=your_secure_secret_key
PORT=5000

```

### Database Management

Synchronize the schema and initialize departmental data:

```bash
# Generate migrations
npm run db:generate

# Push schema to PostgreSQL
npm run db:push

# Seed initial Supervisor accounts (e.g., Mr. O.R Abolade)
npm run db:seed

```

## 📡 API Endpoints (Core)

### Authentication

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| POST   | `/api/auth/register` | Register a new student account |
| POST   | `/api/auth/login`    | Authenticate and receive JWT   |

### Projects

| Method | Endpoint               | Access  | Description                     |
| ------ | ---------------------- | ------- | ------------------------------- |
| POST   | `/api/projects/submit` | Student | Upload project PDF and metadata |

|
| GET | `/api/projects/pending` | Supervisor | View projects awaiting review

|
| PATCH | `/api/projects/:id/status` | Supervisor | Approve or Reject a submission

|
| GET | `/api/projects/search` | Public | Search by year, topic, or supervisor

|

## 🛡️ Security & Significance

- **Vulnerability Reduction:** Protects against the loss or deterioration of physical documents.

- **Centralization:** Provides supervisors a digital platform to track student reviews.

- **Knowledge Preservation:** Allows future students to easily build upon previous research.

## 📅 Project Timeline

Implemented over a **9-week Agile cycle**:

- **Weeks 1-3:** Planning & System Design

- **Weeks 4-6:** Core Development (Backend & Frontend)

- **Weeks 7-9:** Testing, Bug Fixing, & Deployment
