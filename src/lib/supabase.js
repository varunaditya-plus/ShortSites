import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

// Create a function to get the client
// During build time, if env vars are missing, use placeholders to allow build to complete
// At runtime, actual env vars must be present for the app to work
function getSupabaseClient() {
  const url = SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = SUPABASE_KEY || 'placeholder-key';
  
  // Only throw at runtime if we're actually missing the real values
  if ((!SUPABASE_URL || !SUPABASE_KEY) && typeof window !== 'undefined') {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

// Client-side Supabase client
export const supabase = getSupabaseClient();

// Server-side Supabase client (for API routes)
export function createServerClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

