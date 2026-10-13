# TiffinTrack — Supabase PostgreSQL Setup & Verification Guide

This guide walks you through connecting a live Supabase PostgreSQL project to TiffinTrack, applying database migrations, seeding labeled sample data, and testing server-side access control.

---

## 1. Project Prerequisites

- A free or pro account on [Supabase](https://supabase.com)
- Node.js 18+ installed

---

## 2. Step-by-Step Setup

### Step 1: Create a Supabase Project
1. Log into your dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set your project name to `TiffinTrack` and set a strong database password.
4. Select a region close to your target users (e.g., `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
5. Wait ~2 minutes for the database instance to provision.

---

### Step 2: Apply Database Schema Migration
1. In your Supabase dashboard, navigate to **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of [`src/db/schema.sql`](src/db/schema.sql) and paste it into the editor.
4. Click **Run** (or press `Cmd + Enter` / `Ctrl + Enter`).
5. Confirm that the following tables and RLS policies were created:
   - `profiles` (with RLS)
   - `providers` (with `is_active` filter and RLS)
   - `meals` (with `is_available` filter and RLS)
   - `meal_schedules` (rotational daily menus)
   - `orders` (with RLS)
   - `order_items` (with RLS)
   - `customer_reviews` (with RLS)

---

### Step 3: Seed Sample Demo Data
1. In the Supabase **SQL Editor**, open another **New Query**.
2. Copy the entire contents of [`src/db/seed.sql`](src/db/seed.sql) and paste it into the editor.
3. Click **Run**.
4. This seeds 4 neighborhood kitchens, authentic homestyle meals, weekly menu schedules, and labeled demo customer reviews. All records are clearly tagged with `(Demo)`.

---

### Step 4: Configure Environment Variables
1. In your Supabase dashboard, go to **Project Settings** (gear icon) → **API**.
2. Locate the following credentials:
   - **Project URL** (e.g., `https://abcdefghijkl.supabase.co`)
   - **Project API Keys** → `anon` (public key)
   - **Project API Keys** → `service_role` (secret privileged key)
3. In the root of this project, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Fill in the values in `.env`:
   ```env
   # Server-side Supabase credentials (Privileged service role key remains strictly server-side)
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_ANON_KEY="your-anon-public-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"

   # Optional client-side public parameters
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   ```

> **Security Note:** Never commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` to the client. The application server in `server.ts` handles privileged queries and server-side validation.

---

## 3. Database Connectivity & Verification Operations

When you launch TiffinTrack, you can test connectivity immediately via the API endpoint or the UI banner:

### Endpoint Diagnostic Check
Run:
```bash
curl http://localhost:3000/api/status
```

Expected response when credentials are configured:
```json
{
  "isConfigured": true,
  "isLiveConnection": true,
  "isDemoMode": false,
  "message": "Successfully connected to live Supabase PostgreSQL instance.",
  "checkedAt": "2026-10-13T...",
  "verifiedOperations": [
    "Query 'providers' table (returned 4 records)",
    "Query 'meals' table (returned 4 records)",
    "Query 'orders' table access verified"
  ]
}
```

If credentials are not yet configured in `.env`, the system runs in **Explicit Demo Mode**:
```json
{
  "isConfigured": false,
  "isLiveConnection": false,
  "isDemoMode": true,
  "message": "Supabase credentials are not configured in environment. Explicit Demo Mode is active.",
  "verifiedOperations": [
    "Local Demo Repository Active (In-Memory / Local Storage)",
    "Server-Side Order Validation Engine Ready",
    "Status Transition State Machine Ready"
  ]
}
```

---

## 4. Server-Side Security & Validation Invariants

1. **Active Providers Only (`is_active = true`):**
   Inactive or suspended kitchens are excluded from public marketplace discovery queries.
2. **Available Meals Only (`is_available = true`):**
   Sold-out items are filtered from discovery or labeled with clear disabled states.
3. **Canonical Price Protection:**
   The client cannot tamper with meal pricing in checkout payloads. The server looks up canonical meal rates from the database and recalculates item subtotals, packaging deposits (₹30), and discounts authoritatively.
4. **Quantity Range Enforcement:**
   Quantities must be positive integers between 1 and 50.
5. **Initial Order Status & No False Promises:**
   All orders start strictly in `requested` status. The system never charges money, never calls a payment gateway, never promises a delivery, and never automatically marks an order completed.
6. **Order State Machine Transitions:**
   Status changes are strictly validated against `VALID_STATUS_TRANSITIONS`:
   - `requested` → `confirmed` or `cancelled`
   - `confirmed` → `preparing` or `cancelled`
   - `preparing` → `dispatched` or `cancelled`
   - `dispatched` → `delivered`
   - `delivered` and `cancelled` are terminal states.
   Any invalid transition (such as jumping directly from `requested` to `delivered`) is rejected with HTTP 400.
7. **Idempotency & Accidental Double-Click Guard:**
   Repeated clicks or identical `idempotencyKey` submissions return the established order without duplicate database records.

---

## 5. Automated Test Suite Execution

TiffinTrack includes an automated test runner verifying all server-side validation, authorization, and workflow invariants.

### Running the Test Suite
```bash
npm test
```
Or directly:
```bash
npx tsx tests/test-order-workflow.ts
```

### Verified Test Scenarios
1. **Valid Orders:** Verifies order ID generation, `requested` initial state, customer session derivation, and authoritatively calculated price snapshot.
2. **Unavailable Meals:** Verifies that items marked `is_available = false` are rejected with HTTP 400 (`ValidationError`).
3. **Inactive Providers:** Verifies that kitchens marked `is_active = false` cannot accept orders (HTTP 400).
4. **Invalid Quantities:** Verifies rejection of 0, negative (-1), excessive (>50), and fractional (2.5) quantities.
5. **Changed / Tampered Prices:** Verifies that client attempts to manipulate item prices are overridden by canonical database rates.
6. **Unauthenticated Access:** Verifies that requests without a valid session token receive HTTP 401 (`AuthenticationError`).
7. **Cross-User Unauthorized Access:** Verifies that Customer B attempting to inspect Customer A's order receives HTTP 403 (`ForbiddenError`).
8. **Duplicate Submissions:** Verifies idempotency deduplication on repeated submissions.
9. **Status Transition Machine:** Verifies the full lifecycle (`requested` → `confirmed` → `preparing` → `dispatched` → `delivered`), customer update blocking, and terminal state protection.

### Tests Requiring Manual Setup in Live Supabase
When testing against a **live Supabase project** (rather than Demo Mode):
1. **Live Auth Users:** In your Supabase Dashboard → **Authentication** → **Users**, click **Add User** to create `customer1@test.com` and `customer2@test.com`.
2. **Assign Profiles:** In the **SQL Editor**, ensure corresponding rows exist in `profiles` with matching `id = auth.uid()` and roles (`customer` vs `provider`).
3. **JWT Passing:** Obtain a real Supabase access token via `supabase.auth.signInWithPassword()` and provide it in `Authorization: Bearer <access_token>`.
4. In Explicit Demo Mode, all 9 test scenarios execute seamlessly with zero manual credentials using built-in simulated tokens (`demo-customer-token`, `demo-customer-2-token`, `demo-provider-token`, `demo-admin-token`).

