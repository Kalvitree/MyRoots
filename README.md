# Roots React + Supabase

This app is now converted to a React + Vite frontend with Supabase backend integration.

## What’s included

- React UI built from the original Roots PWA design
- Supabase auth with email magic links
- Supabase database support for memories and family members
- PWA manifest and service worker preserved

## Setup

1. Copy `.env.example` to `.env`.
2. Create a Supabase project.
3. Set these values in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## Supabase tables

Create these tables in your Supabase database:

### `members`
- `id` (uuid, primary key, default `uuid_generate_v4()`)
- `circle_id` (int)
- `user_id` (text)
- `name` (text)
- `relationship` (text)
- `joined_at` (timestamp)

### `memories`
- `id` (uuid, primary key, default `uuid_generate_v4()`)
- `circle_id` (int)
- `author_id` (text)
- `author_name` (text)
- `title` (text)
- `content` (text)
- `category` (text)
- `type` (text)
- `tags` (text[])
- `created_at` (timestamp)

## Notes

- The app uses Supabase auth magic links for login.
- The first time you sign in, you can provide a name and relationship to join the family circle.
- The UI includes dashboard, add memory, detail, and circle screens.

## Deploy

Use Vite build for production:
```bash
npm run build
```

Then deploy the contents of `dist` to your static host.
