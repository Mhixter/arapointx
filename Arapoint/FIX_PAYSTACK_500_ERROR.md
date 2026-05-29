# Fix for Screening Paystack 500 Error

## Problem
Your production server is throwing a **500 Internal Server Error** when trying to initiate Paystack payments:

```
POST /api/screening/billing/paystack/initiate 500 (Internal Server Error)
Error: relation "screening_paystack_transactions" does not exist
```

## Root Cause
The database table `screening_paystack_transactions` is missing in production, even though your code references it.

## Solution

### Step 1: Deploy the Safe Migration

The safe migration file has been created at:
```
Arapoint/migrations/0005_safe_screening_paystack.sql
```

This migration **ONLY** creates the `screening_paystack_transactions` table. It contains **NO destructive operations** — no dropping columns, no truncating tables.

### Step 2: Run the Migration on Production

SSH into your production server (Render):
```bash
ssh your-user@your-render-server
```

Navigate to the project directory:
```bash
cd ~/project/src/Arapoint
```

Run the migration **safely** using Drizzle's migrate command (NOT push):
```bash
npx drizzle-kit migrate
```

This will execute ONLY the reviewed SQL migration file you've approved.

### Step 3: Verify the Table Was Created

Connect to your production database:
```bash
psql $DATABASE_URL
```

Check if the table exists:
```sql
\dt screening_paystack_transactions
```

You should see:
```
List of relations
Schema |              Name              | Type  | Owner
--------+--------------------------------+-------+-------
 public | screening_paystack_transactions | table | postgres
```

Exit psql:
```sql
\q
```

### Step 4: Test the Paystack Endpoint

Go back to your application and try initiating a Paystack payment again. The 500 error should now be gone.

---

## Why This Approach is Safe

✅ **Only creates the missing table** — no schema destruction  
✅ **Uses `drizzle-kit migrate`** — executes pre-reviewed SQL  
✅ **Preserves all existing data** — no truncation or column drops  
✅ **Includes proper indexes** — optimizes performance  
✅ **Includes foreign key** — maintains referential integrity with `screening_organizations`

---

## What NOT to Do

❌ **Do NOT run** `npx drizzle-kit push` (dangerous in production)  
❌ **Do NOT manually edit** the schema to fix everything at once  
❌ **Do NOT truncate** any existing tables  
❌ **Do NOT drop** any columns  

---

## If You See Warnings About screening_batches

If Drizzle warns you about destructive changes to `screening_batches` table, **ABORT** and stick to this migration alone:

```bash
# If you accidentally ran push:
# Do NOT choose "Yes, I want to remove columns"
# Choose: No, abort
```

The `screening_batches` schema differences are a separate issue. This migration fixes ONLY the Paystack error.

---

## After Migration Succeeds

Your logs should show:
```
[✓] Pulling schema from database...
[✓] Executing migration 0005_safe_screening_paystack.sql
```

Then retry payment initiation and it should work! 🚀

---

## Troubleshooting

If the migration fails with:
```
Error: relation "screening_organizations" does not exist
```

Then run migrations in order:
```bash
# First, check existing migration status
psql $DATABASE_URL -c "SELECT * FROM _drizzle_migrations;"

# If screening_organizations hasn't been created, run earlier migrations
npx drizzle-kit migrate
```

This will apply all pending migrations in order.

---

## Questions?

The safe migration only:
1. Creates `screening_paystack_transactions` table
2. Creates 4 performance indexes
3. References `screening_organizations` via foreign key

No other tables are touched.
