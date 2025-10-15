# Events Table Documentation

## Table Schema

The `events` table stores information about gaming events and tournaments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `title` | text | NO | null | Event title |
| `description` | text | YES | null | Event description |
| `location` | text | YES | null | Event location |
| `starts_at` | timestamp with time zone | NO | null | Event start time |
| `ends_at` | timestamp with time zone | YES | null | Event end time |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |
| `game_title` | text | NO | 'Unknown' | Game being played |
| `city` | text | YES | null | Event city |
| `cost` | text | YES | null | Event cost (free or paid) |
| `state` | text | YES | null | Event state |
| `host` | text | YES | null | Event host (user ID) |
| `host_id` | uuid | YES | null | Event host user ID (foreign key to users) |
| `banner_image_url` | text | YES | null | URL to banner image stored in Supabase |

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### Policy 1: Public Read Access
```sql
-- Allow anyone to read events (for public discovery)
CREATE POLICY "Anyone can view events" ON events
    FOR SELECT
    USING (true);
```
**Purpose**: Enables public event discovery without authentication

### Policy 2: Authenticated Create
```sql
-- Allow authenticated users to create events
CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
```
**Purpose**: Prevents spam by requiring authentication for event creation

### Policy 3: Owner Update
```sql
-- Allow event creators to update their own events
CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);
```
**Purpose**: Users can only modify events they created

### Policy 4: Owner Delete
```sql
-- Allow event creators to delete their own events
CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE
    TO authenticated
    USING (auth.uid() = host_id);
```
**Purpose**: Users can only delete events they created

### Policy 5: Service Role Access
```sql
-- Allow service role to manage all events (for webhooks)
CREATE POLICY "Service role can manage all events" ON events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables system operations and administrative access

## Implementation Notes

## Key Operations
- **Read**: Public access for discovery
- **Create**: Authenticated users only
- **Update/Delete**: Owner-only access
- **System**: Service role for administrative operations