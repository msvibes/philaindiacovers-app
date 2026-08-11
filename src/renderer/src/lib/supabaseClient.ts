import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check .env (see .env.example).'
  )
}

// Renderer-only client: anon key (safe to expose), session persisted to
// localStorage by default. No IPC/main-process involvement — the renderer
// is a plain browser SPA context, same as Admin's own browser client.
export const supabase = createClient(supabaseUrl, anonKey)
