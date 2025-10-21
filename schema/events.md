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
| `game_title` | text | NO | 'Unknown'::text | Game being played |
| `city` | text | YES | null | Event city |
| `cost` | text | YES | null | Event cost (free or paid) |
| `state` | text | YES | null | Event state |
| `host_id` | uuid | YES | null | Event host user ID (foreign key to users) |
| `zip_code` | integer | YES | null | Event zip code |
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

### Policy 2: Authenticated Create with Host ID
```sql
-- Allow authenticated users to create events with proper host_id
CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = host_id);
```
**Purpose**: Ensures users can only create events where they are the host

### Policy 3: Host Read Access
```sql
-- Allow event hosts to read their own events
CREATE POLICY "Hosts can read their own events" ON events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = host_id);
```
**Purpose**: Ensures hosts can read their own events (in addition to public read)

### Policy 4: Host Update Access
```sql
-- Allow event hosts to update their own events
CREATE POLICY "Hosts can update their own events" ON events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);
```
**Purpose**: Hosts can only update events they created

### Policy 5: Host Delete Access
```sql
-- Allow event hosts to delete their own events
CREATE POLICY "Hosts can delete their own events" ON events
    FOR DELETE
    TO authenticated
    USING (auth.uid() = host_id);
```
**Purpose**: Hosts can only delete events they created

### Policy 6: Service Role Access
```sql
-- Allow service role to manage all events (for webhooks and admin)
CREATE POLICY "Service role can manage all events" ON events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables system operations and administrative access

## Implementation Notes

### Security Model
- **Public Read**: Anyone can view events for discovery
- **Host Management**: Only event hosts can manage their own events
- **Authentication Required**: All write operations require authentication
- **Host ID Validation**: Ensures users can only create events where they are the host

### Key Operations
- **Read**: Public access for discovery + Host access to own events
- **Create**: Authenticated users only (must be host)
- **Update**: Host-only access to own events
- **Delete**: Host-only access to own events
- **System**: Service role for administrative operations

### Policy Enforcement
- **INSERT**: Users can only create events where `auth.uid() = host_id`
- **SELECT**: Public read + Host read of own events
- **UPDATE**: Hosts can only update events where `auth.uid() = host_id`
- **DELETE**: Hosts can only delete events where `auth.uid() = host_id`

### Security Benefits
- Prevents users from creating events with incorrect host_id
- Ensures hosts can manage their events even if public access is restricted
- Maintains data integrity by enforcing host ownership
- Allows for future admin features while maintaining security