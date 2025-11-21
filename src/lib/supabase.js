import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (for API routes only)
export function createServerClient() {
  // Use SUPABASE_URL and SUPABASE_KEY (without NEXT_PUBLIC_ prefix)
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
  }
  
  return createClient(url, key);
}

