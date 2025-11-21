import { createClient } from '@supabase/supabase-js';

// Get environment variables - check both NEXT_PUBLIC_ and non-prefixed versions
// This allows runtime environment variables to work (though NEXT_PUBLIC_ should ideally be at build time)
function getEnvVar(name) {
  if (typeof window !== 'undefined') {
    // Client-side: NEXT_PUBLIC_ vars are embedded at build time
    return process.env[`NEXT_PUBLIC_${name}`] || process.env[name];
  } else {
    // Server-side: can read from runtime environment
    return process.env[`NEXT_PUBLIC_${name}`] || process.env[name];
  }
}

const SUPABASE_URL = getEnvVar('SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('SUPABASE_KEY');

// Create a function to get the client
// During build time, if env vars are missing, use placeholders to allow build to complete
// At runtime, actual env vars must be present for the app to work
function getSupabaseClient() {
  const url = SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = SUPABASE_KEY || 'placeholder-key';
  
  // Only throw at runtime if we're actually missing the real values
  // Check both client and server side
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (typeof window !== 'undefined') {
      // Client-side error
      throw new Error('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY must be set.');
    } else {
      // Server-side error
      throw new Error('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY must be set.');
    }
  }
  
  return createClient(url, key);
}

// Client-side Supabase client
export const supabase = getSupabaseClient();

// Server-side Supabase client (for API routes)
export function createServerClient() {
  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_KEY');
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY must be set.');
  }
  return createClient(url, key);
}

