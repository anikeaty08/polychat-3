# Database Migrations for Polychat

## Required Database Changes

Run these SQL commands in your Supabase SQL Editor in the exact order:

### 1. Create Statuses Table

```sql
-- Status updates (like WhatsApp status)
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text TEXT,
  image_url TEXT,
  views_count INTEGER DEFAULT 0,
  transaction_hash TEXT,
  on_chain BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses(created_at);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON statuses(expires_at);
```

### 2. Add Transaction Hash and On-Chain Fields to Messages (if not already added)

```sql
-- Add transaction_hash and on_chain columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE;

-- Create index for transaction_hash
CREATE INDEX IF NOT EXISTS idx_messages_transaction_hash ON messages(transaction_hash);
```

### 3. Add Transaction Hash and On-Chain Fields to Calls (if not already added)

```sql
-- Add transaction_hash and on_chain columns to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE;

-- Create index for transaction_hash
CREATE INDEX IF NOT EXISTS idx_calls_transaction_hash ON calls(transaction_hash);
```

## Verification

After running the migrations, verify the tables exist:

```sql
-- Check if statuses table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'statuses'
);

-- Check columns in statuses table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'statuses';

-- Check if messages table has on_chain column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'on_chain';

-- Check if calls table has on_chain column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'calls' AND column_name = 'on_chain';
```

## Complete Migration Script (Run All at Once)

```sql
-- ============================================
-- POLYCHAT DATABASE MIGRATIONS
-- ============================================

-- 1. Create Statuses Table
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text TEXT,
  image_url TEXT,
  views_count INTEGER DEFAULT 0,
  transaction_hash TEXT,
  on_chain BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Statuses Indexes
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses(created_at);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON statuses(expires_at);

-- 2. Update Messages Table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_transaction_hash ON messages(transaction_hash);

-- 3. Update Calls Table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_calls_transaction_hash ON calls(transaction_hash);

-- Verification
SELECT 'Migration completed successfully!' as status;
```

## Notes

- All migrations use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` to be idempotent
- You can run the complete migration script multiple times safely
- The statuses table will automatically expire statuses after 24 hours
- Transaction hashes are stored for on-chain verification

## Automatic Cleanup

Statuses are automatically deleted after 24 hours. You can set up a cron job to run the cleanup:

### Option 1: Using the API endpoint (Recommended)

Set up a cron job to call the cleanup endpoint:

```bash
# Add to your crontab (runs every hour)
0 * * * * curl -X POST http://localhost:3000/api/status/cleanup -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: Using the Node.js script

```bash
# Add to your crontab (runs every hour)
0 * * * * cd /path/to/polychat && node scripts/cleanup-statuses.js
```

### Environment Variable

Add to your `.env` file:
```env
CRON_SECRET=your-secret-key-here
```

The cleanup will:
- Delete expired statuses from the database
- On-chain statuses are automatically filtered out by the contract (they return `exists: false` after expiration)
- Both database and blockchain statuses are effectively removed after 24 hours

