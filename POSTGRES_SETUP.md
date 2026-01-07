# Postgres Setup Guide (Neon)

## Quick Setup (5 minutes)

### 1. Create Neon Project

1. Go to [neon.tech](https://neon.tech) and sign in (GitHub auth)
2. Click "New Project"
3. Name: `vibe-production`
4. Region: `us-east-1` (closest to Vercel)
5. Click "Create Project"

### 2. Get Connection String

1. In Neon dashboard, click "Connection Details"
2. Select "Pooled connection" (important for serverless!)
3. Copy the connection string:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → vibe-public project
2. Settings → Environment Variables
3. Add:
   - Name: `DATABASE_URL`
   - Value: (paste connection string)
   - Environments: Production, Preview, Development

### 4. Run Schema Migration

Option A: Via Neon SQL Editor
1. In Neon dashboard, click "SQL Editor"
2. Copy contents of `schema.sql`
3. Paste and run

Option B: Via psql (if installed)
```bash
psql "YOUR_CONNECTION_STRING" -f schema.sql
```

### 5. Verify Connection

After Vercel redeploys:
```bash
curl https://slashvibe.dev/api/db-health
```

Expected response:
```json
{
  "ok": true,
  "kv": { "ok": true, "latency": 12 },
  "postgres": { "ok": true, "latency": 45, "db": "neondb" }
}
```

---

## Migration Phases

### Phase 1: Setup (Current)
- [x] Create db.js connection helper
- [x] Create schema.sql
- [x] Add @neondatabase/serverless dependency
- [ ] Create Neon project
- [ ] Add DATABASE_URL to Vercel
- [ ] Run schema migration
- [ ] Verify /api/db-health shows both green

### Phase 2: Dual-Write
- [ ] Enable dual-write for users (USE_POSTGRES_USERS=true)
- [ ] Enable dual-write for messages (USE_POSTGRES_MESSAGES=true)
- [ ] Enable dual-write for board (USE_POSTGRES_BOARD=true)
- [ ] Monitor for 24h, compare counts

### Phase 3: Migrate Reads
- [ ] Switch user reads to Postgres
- [ ] Switch message reads to Postgres
- [ ] Switch board reads to Postgres
- [ ] Monitor latency (<200ms target)

### Phase 4: Cleanup
- [ ] Remove KV writes for migrated data
- [ ] Delete old KV keys (after 7-day grace)
- [ ] Update documentation

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon pooled connection string | Yes |
| `USE_POSTGRES_USERS` | Enable Postgres for users | No (default: false) |
| `USE_POSTGRES_MESSAGES` | Enable Postgres for messages | No (default: false) |
| `USE_POSTGRES_BOARD` | Enable Postgres for board | No (default: false) |
| `USE_POSTGRES_STREAKS` | Enable Postgres for streaks | No (default: false) |
| `USE_POSTGRES_GAMES` | Enable Postgres for games | No (default: false) |
| `USE_POSTGRES_INVITES` | Enable Postgres for invites | No (default: false) |

---

## Rollback

If issues occur:

1. **Immediate:** Set `DATABASE_URL` to empty string in Vercel
   - System falls back to KV-only mode
   - No data loss (KV still has everything)

2. **After investigation:** Re-enable with fixes

---

## Cost

- **Neon Free Tier:** 500MB storage, 190 compute hours/month, unlimited requests
- **When to upgrade:** >50k users or >500MB storage
- **Neon Pro:** $19/month for more storage/compute

---

## Monitoring

Check database health:
```bash
curl https://slashvibe.dev/api/db-health
```

Check migration counts (coming soon):
```bash
curl https://slashvibe.dev/api/admin/migration-status
```
