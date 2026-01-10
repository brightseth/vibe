#!/bin/bash

# AIRC v0.2 Migration Runner
# Safely runs the recovery key migration with verification

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AIRC v0.2 Migration Runner                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
  echo "Please set your Neon/Postgres connection string:"
  echo "  export DATABASE_URL='postgresql://user:pass@host/dbname'"
  exit 1
fi

# Parse database name from connection string
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
echo -e "${BLUE}Target Database:${NC} $DB_NAME"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will add recovery_key, registry, key_rotated_at, and status columns.${NC}"
echo -e "${YELLOW}   All changes are backwards compatible and easily reversible.${NC}"
echo ""
read -p "Continue with migration? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  echo -e "${RED}Migration cancelled.${NC}"
  exit 1
fi

# Run pre-migration verification
echo -e "${BLUE}Step 1: Pre-migration verification${NC}"
echo "Checking current schema..."

COLUMNS=$(psql "$DATABASE_URL" -t -c "
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position;
" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Could not connect to database${NC}"
  echo "$COLUMNS"
  exit 1
fi

echo "Current columns:"
echo "$COLUMNS"
echo ""

# Check if migration already ran
if echo "$COLUMNS" | grep -q "recovery_key"; then
  echo -e "${YELLOW}⚠️  Migration appears to already be applied (recovery_key column exists)${NC}"
  read -p "Re-run migration anyway? (yes/no): " -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${GREEN}Migration skipped (already applied).${NC}"
    exit 0
  fi
fi

# Run migration
echo -e "${BLUE}Step 2: Running migration${NC}"
echo "Executing 001_add_recovery_keys.sql..."

MIGRATION_OUTPUT=$(psql "$DATABASE_URL" -f migrations/001_add_recovery_keys.sql 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Migration failed${NC}"
  echo "$MIGRATION_OUTPUT"
  exit 1
fi

echo -e "${GREEN}✓ Migration executed successfully${NC}"
echo ""

# Verify migration
echo -e "${BLUE}Step 3: Post-migration verification${NC}"
echo "Verifying new columns..."

NEW_COLUMNS=$(psql "$DATABASE_URL" -t -c "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'users'
  AND column_name IN ('recovery_key', 'registry', 'key_rotated_at', 'status')
  ORDER BY column_name;
" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Post-migration verification failed${NC}"
  echo "$NEW_COLUMNS"
  exit 1
fi

echo "$NEW_COLUMNS"
echo ""

# Verify indexes
echo "Verifying indexes..."

INDEXES=$(psql "$DATABASE_URL" -t -c "
  SELECT indexname
  FROM pg_indexes
  WHERE tablename = 'users'
  AND indexname IN ('idx_users_status', 'idx_users_recovery_key');
" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Warning: Could not verify indexes${NC}"
else
  echo "$INDEXES"
fi
echo ""

# Count users by status
echo "Checking user status distribution..."

STATUS_COUNTS=$(psql "$DATABASE_URL" -t -c "
  SELECT status, COUNT(*) FROM users GROUP BY status;
" 2>&1)

if [ $? -eq 0 ]; then
  echo "$STATUS_COUNTS"
else
  echo -e "${YELLOW}Warning: Could not query user status${NC}"
fi
echo ""

# Count users with/without recovery keys
echo "Checking recovery key adoption..."

RECOVERY_COUNTS=$(psql "$DATABASE_URL" -t -c "
  SELECT
    COUNT(*) FILTER (WHERE recovery_key IS NOT NULL) as with_recovery,
    COUNT(*) FILTER (WHERE recovery_key IS NULL) as without_recovery,
    COUNT(*) as total
  FROM users;
" 2>&1)

if [ $? -eq 0 ]; then
  echo "$RECOVERY_COUNTS"
else
  echo -e "${YELLOW}Warning: Could not query recovery keys${NC}"
fi
echo ""

# Success
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration completed successfully! ✓                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Deploy updated API code (api/users.js)"
echo "  2. Run backwards compatibility tests:"
echo "     node migrations/test_migration.js"
echo "  3. Verify /vibe still works as expected"
echo ""
echo -e "${BLUE}Rollback:${NC}"
echo "  If needed, run: psql \$DATABASE_URL -f migrations/001_rollback.sql"
echo ""
