# DPG Backend

Elysia/JIT backend for the DPG game platform.

## Prerequisites

- [Bun](https://bun.sh) v1.3+

## Setup

```bash
# Install dependencies
bun install

# Copy environment file and edit as needed
cp .env.example .env

# Start dev server (auto-restarts on file changes)
bun run dev
```

Open http://localhost:3000 with your browser to see the result.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with watch mode |
| `bun test` | Run test suite (177+ tests) |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | Lint source code |
| `bun run format` | Format source code with Prettier |
| `bun run prod` | Build and start production server |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run pending migrations |
| `bun run db:studio` | Open Drizzle Studio (DB GUI) |
| `bun run backup` | Create database backup |
| `bun run admin:build` | Build admin frontend |

## Project Structure

```
src/
├── db/           # Database schema and migrations
├── lib/          # Utility functions and constants
├── plugins/      # Elysia plugins (auth, database, etc.)
├── routes/       # API route handlers
├── services/     # Business logic services
├── types/        # TypeScript type definitions
└── index.server.ts  # Entry point
```