# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an expense management demo application for mabl testing. Employees submit expenses via mobile app, and managers approve them via web dashboard. The system consists of three main applications deployed to Google Cloud Run.

## Tech Stack & Architecture

### Multi-App Structure
- **Backend API** (`apps/api`): Express + TypeScript + PostgreSQL
- **Web Frontend** (`apps/web`): Next.js 14 App Router + Tailwind CSS
- **Mobile App** (`apps/mobile`): Expo + React Native

### Data Flow
```
Mobile (Expo) ──┐
                ├──> Backend API (Express) ──> PostgreSQL (Cloud SQL)
Web (Next.js) ──┘
```

### Authentication
Simple header-based auth using `Authorization` header:
- `manager` - sees all expenses
- `employee` (or any other value) - sees only their own expenses

Password validation is `{username}123` (e.g., manager/manager123).

## Development Commands

### Local Development with Docker Compose

```bash
# Start all services (PostgreSQL, API, Web)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

Services will be available at:
- PostgreSQL: `localhost:5432`
- Backend API: `localhost:4000`
- Web Frontend: `localhost:3000`

### Backend API (apps/api)

```bash
cd apps/api

# Install dependencies
npm install

# Database setup
npx prisma generate          # Generate Prisma client
npx prisma migrate dev       # Run migrations
npx prisma studio            # Open database GUI

# Development
npm run dev                  # Start with hot reload (nodemon + ts-node)

# Build & production
npm run build                # Compile TypeScript to dist/
npm start                    # Run compiled code from dist/
```

### Web Frontend (apps/web)

```bash
cd apps/web

# Install dependencies
npm install

# Development
npm run dev                  # Start Next.js dev server (localhost:3000)

# Build & production
npm run build                # Build for production
npm start                    # Start production server
npm run lint                 # Run ESLint
```

### Mobile App (apps/mobile)

```bash
cd apps/mobile

# Install dependencies
npm install

# Development
npm start                    # Start Expo dev server
npm run android              # Run on Android
npm run ios                  # Run on iOS
npm run web                  # Run as web app
```

Note: Configure `apps/mobile/.env` with `EXPO_PUBLIC_API_URL` to point to backend.

### End-to-End Tests (tests/web)

```bash
cd tests/web

# Install dependencies & browsers
npm install
npx playwright install

# Run tests
npm test                     # Run all tests
npm run test:ui              # UI mode (recommended)
npm run test:headed          # Show browser window
npm run test:debug           # Debug mode
npm run test:report          # View test report

# Run specific tests
npx playwright test manager-expense-approval
npx playwright test --grep "Step 1"

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

Tests expect API at `localhost:4000` and Web at `localhost:3000`.

Note: `playwright.config.ts` has a `webServer` setting that automatically starts the `apps/web` dev server if needed.

## Key Architecture Details

### Backend API Structure

The backend is a single-file Express app (`apps/api/src/index.ts`) with:
- Direct PostgreSQL pool connection (no Prisma client usage in runtime, only schema definition)
- Automatic schema initialization on startup via raw SQL
- Simple table structure: `expenses` with fields `id`, `title`, `amount`, `status`, `applicant_id`, `created_at`

**Key Endpoints:**
- `POST /api/reset` - Reset database (creates sample data)
- `GET /api/expenses` - Get expenses (filtered by user role)
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/:id/status` - Update status (approve/reject)
- `POST /api/migrate` - Manual migration (legacy, auto-runs on startup)

### Web Frontend Structure

Next.js 14 App Router structure:
- `app/page.tsx` - Landing/redirect page
- `app/login/page.tsx` - Login form
- `app/dashboard/page.tsx` - Main dashboard (server component)
- `app/dashboard/ExpenseTable.tsx` - Expense table (client component)

API calls use `axios` and are configured via environment variables:
- `NEXT_PUBLIC_API_URL` - Client-side API URL
- `INTERNAL_API_URL` - Server-side API URL (for SSR)

### Mobile App Structure

- `App.tsx` - Main navigation setup
- `screens/LoginScreen.tsx` - Login screen
- `screens/HomeScreen.tsx` - Expense list and create form
- Uses `@react-navigation/native-stack` for navigation
- Uses `@react-native-async-storage/async-storage` for token storage

### Database Schema (Prisma)

```prisma
model Expense {
  id          Int           @id @default(autoincrement())
  title       String
  amount      Int
  status      ExpenseStatus @default(PENDING)
  applicantId String
  createdAt   DateTime      @default(now())
}

enum ExpenseStatus {
  PENDING
  APPROVED
  REJECTED
}
```

Note: The runtime code uses raw SQL, not Prisma Client. Prisma is only used for schema definition and migrations.

## Deployment

### Google Cloud Run Deployment

GitHub Actions automatically deploy on push to `main`:
- `.github/workflows/deploy-api.yml` - Deploys backend API
- `.github/workflows/deploy-web.yml` - Deploys web frontend
- `.github/workflows/build-mobile-*.yml` - Mobile builds (Android/iOS/Web)

**Manual deployment:**
```bash
# Get deployed URLs
gcloud run services describe expense-app-api --region=asia-northeast1 --format='value(status.url)'
gcloud run services describe expense-app-web --region=asia-northeast1 --format='value(status.url)'

# View logs
gcloud run services logs read expense-app-api --region=asia-northeast1 --limit=50
gcloud run services logs read expense-app-web --region=asia-northeast1 --limit=50
```

### Environment Variables

**Backend API:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `CORS_ORIGIN` - CORS allowed origin (default: `http://localhost:3000`)
- `PORT` - Server port (default: 8080 for Cloud Run, 4000 for local)

**Web Frontend:**
- `NEXT_PUBLIC_API_URL` - Client-side API endpoint
- `INTERNAL_API_URL` - Server-side API endpoint (for SSR)

**Mobile App:**
- `EXPO_PUBLIC_API_URL` - Backend API endpoint

## Testing Workflow

### mabl Test Scenario
1. [API] Reset data via `POST /api/reset`
2. [Mobile] Employee submits expense (status: PENDING)
3. [Web] Manager approves expense (status: APPROVED)
4. [Mobile] Employee verifies status change

### Playwright E2E Tests
Complete manager approval workflow testing:
1. Login as manager
2. View expense list
3. Find pending expense
4. Approve expense
5. Verify status change
6. Logout

Tests use `data-testid` attributes for stable selectors. See `tests/web/README.md` for full details.

## Important Notes

### API Authentication
- Authorization is via `Authorization` header with username
- No JWT or session management
- Manager (`manager`) has full access; others see only their own data

### Data Reset
The `POST /api/reset` endpoint creates sample data:
- Employee user with pending/approved expenses
- Manager can approve/reject them

### Prisma Usage
- Schema defined in `apps/api/prisma/schema.prisma`
- Runtime uses raw SQL queries (not Prisma Client)
- Binary target includes `linux-musl-openssl-3.0.x` for Cloud Run compatibility

### Next.js API Routing
Web frontend makes API calls to backend, not Next.js API routes. All backend logic is in the Express app.

## Common Tasks

### Add New API Endpoint
1. Add route handler in `apps/api/src/index.ts`
2. Use `getUserName(req)` for authentication
3. Query database using `pool.query()`
4. Return JSON response

### Add New Web Page
1. Create file in `apps/web/app/[route]/page.tsx`
2. Use server components by default
3. Add `'use client'` directive for client components
4. Fetch data in server components or use `axios` in client components

### Modify Database Schema
1. Update `apps/api/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update raw SQL queries in `apps/api/src/index.ts`
4. Regenerate client: `npx prisma generate`
