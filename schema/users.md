# Users Table Row Level Security Policies

## Table Schema

The `users` table stores user profile information and authentication data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key, matches auth.users.id |
| `first_name` | text | NO | null | User's first name |
| `last_name` | text | NO | null | User's last name |
| `email` | text | NO | null | User's email address |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |

## Authentication Integration

### Database Trigger for User Creation
```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, email, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    new.created_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Database Trigger for User Updates
```sql
-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET 
    first_name = COALESCE(new.raw_user_meta_data->>'first_name', old.raw_user_meta_data->>'first_name', ''),
    last_name = COALESCE(new.raw_user_meta_data->>'last_name', old.raw_user_meta_data->>'last_name', ''),
    email = new.email
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update user profile
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
```

### Database Trigger for User Deletion
```sql
-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically delete user profile
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
```

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Policy 1: Users Can View Their Own Profile
```sql
-- Allow users to view their own profile information
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
```
**Purpose**: Users can only see their own profile data, ensuring privacy

### Policy 2: System Can Create User Profiles
```sql
-- Allow system to create user profiles (via triggers)
CREATE POLICY "System can create user profiles" ON users
    FOR INSERT
    TO service_role
    WITH CHECK (true);
```
**Purpose**: Database triggers can automatically create user profiles

### Policy 3: Users Can Update Their Own Profile
```sql
-- Allow users to update their own profile information
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```
**Purpose**: Users can modify their own profile information (name, etc.)

### Policy 4: System Can Delete User Profiles
```sql
-- Allow system to delete user profiles (via triggers)
CREATE POLICY "System can delete user profiles" ON users
    FOR DELETE
    TO service_role
    USING (true);
```
**Purpose**: Database triggers can automatically delete user profiles when auth.users is deleted

### Policy 5: Service Role Full Access
```sql
-- Allow service role to manage all user profiles (for admin operations)
CREATE POLICY "Service role can manage all users" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables administrative operations and system management

### Policy 6: Public Read Access for Event Hosts (Optional)
```sql
-- Allow public read access to host information for events
CREATE POLICY "Public can view event host profiles" ON users
    FOR SELECT
    USING (true);
```
**Purpose**: Enables public event pages to show host names
**Note**: This policy should be used carefully - consider creating a view with limited fields instead

## Implementation Notes

### Authentication Requirements
- **User Operations**: All user operations require authentication (`TO authenticated`)
- **User ID Matching**: Uses `auth.uid() = id` for user-specific access
- **Service Operations**: Service role has full access for administrative operations

### Security Considerations
- **Data Isolation**: Users can only access their own profile data
- **Profile Privacy**: Personal information is protected from other users
- **Account Management**: Users have full control over their own profiles

### Usage Patterns

#### User Profile Flow
1. **Registration**: User creates profile during signup
2. **Profile Updates**: User can modify their name and other details
3. **Account Deletion**: User can delete their entire profile
4. **Data Access**: User can view their own profile information

#### Administrative Flow
1. **User Management**: Service role can manage all user profiles
2. **System Operations**: Service role can perform bulk operations
3. **Data Migration**: Service role can handle data imports/exports

#### Public Access Flow
1. **Event Hosts**: Public can see host names on event pages
2. **Event Discovery**: Host information available for event listings

## Auth Integration Workflow

### User Registration Flow
1. **User Signs Up**: User creates account via Supabase Auth
2. **Trigger Fires**: `on_auth_user_created` trigger automatically executes
3. **Profile Created**: New record inserted into `public.users` table
4. **Data Sync**: Profile data extracted from `auth.users.raw_user_meta_data`

### User Update Flow
1. **User Updates Profile**: User modifies their profile information
2. **Trigger Fires**: `on_auth_user_updated` trigger automatically executes
3. **Profile Updated**: `public.users` record updated with new information
4. **Data Sync**: Changes reflected in both auth and public tables

### User Deletion Flow
1. **User Deletes Account**: User account deleted from Supabase Auth
2. **Trigger Fires**: `on_auth_user_deleted` trigger automatically executes
3. **Profile Deleted**: `public.users` record removed
4. **Cascade Cleanup**: Related data in other tables may need cleanup

## Application Integration

### Key Operations
- **Automatic Profile Creation**: Profiles created automatically on signup
- **Profile Synchronization**: Changes in auth.users sync to public.users
- **Event Hosting**: Profile data used for event host information
- **Public Display**: Limited profile data for event pages

### Database Relationships
- **Events Table**: `host` field references `users.id`
- **RSVPs Table**: `user_id` field references `users.id`
- **Auth Integration**: `id` field matches `auth.users.id`
- **Automatic Sync**: Triggers keep tables synchronized

