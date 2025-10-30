# Games Table Schema

## Table: games

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PRIMARY KEY | Unique identifier for the game |
| created_at | timestamp with time zone | NOT NULL, DEFAULT now() | When the game was added |
| game_title | text | NULL | Game title/name |
| game_background_image_url | text | NULL | URL to game background image stored in Supabase storage |

## Indexes
- **Primary Key**: `games_pkey` on `id`
- **Unique**: `games_id_key` on `id`

## Relationships
- One-to-many with events table via `game_id` field (events.game_id references games.id)

## RLS Policies

### Enable RLS
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
```

### Allow authenticated users to read games
```sql
CREATE POLICY "Allow authenticated users to read games" ON games
  FOR SELECT
  TO authenticated
  USING (true);
```

This policy allows any authenticated user to read all games from the table, which is needed for the CreateEvent form to populate the game selection options.

## Storage Buckets

### game_background_image
- **Bucket Name**: `game_background_image`
- **Purpose**: Stores background images for games
- **Usage**: The `game_background_image_url` column in the games table stores the public URL to images uploaded to this bucket
