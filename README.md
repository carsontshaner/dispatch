# Dispatch

AI-generated customer newsletters for small businesses.

## Database migrations

Migration files live in `supabase/migrations/`. The Supabase CLI (`supabase` dev dependency) applies them to the remote database.

### One-time setup (per machine)

```bash
npx supabase login                              # opens browser to authenticate
npx supabase link --project-ref <project-ref>  # find ref: dashboard → project settings → general
```

### Going-forward workflow

**To change the schema:**

1. Create a new migration file:
   ```bash
   npm run db:new -- describe_your_change
   # creates supabase/migrations/<timestamp>_describe_your_change.sql
   ```
2. Write the SQL in that file.
3. Apply it to the remote database:
   ```bash
   npm run db:push
   ```

**To check what's pending** (diff local migrations against remote):
```bash
npm run db:diff
```

Never apply schema changes by pasting SQL into the dashboard. Write the migration file first, then push — that way the repo and the live database never drift.
