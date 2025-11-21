import { createClient } from '@supabase/supabase-js';

function getEnvVar(name) {
  return process.env[`NEXT_PUBLIC_${name}`] || process.env[name] || '';
}

// Get env vars at module load time
const SUPABASE_URL = getEnvVar('SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('SUPABASE_KEY');

// Create client with fallback to placeholders during build
// At runtime, GCP will provide the actual env vars
const createSupabaseClient = () => {
  const url = SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = SUPABASE_KEY || 'placeholder-key';
  return createClient(url, key);
};

// Client-side Supabase client
// Use placeholder during build, real values at runtime
export const supabase = createSupabaseClient();

// Server-side Supabase client (for API routes)
export function createServerClient() {
  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_KEY');
  
  // At runtime, GCP env vars will be available
  const finalUrl = url || 'https://placeholder.supabase.co';
  const finalKey = key || 'placeholder-key';
  
  return createClient(finalUrl, finalKey);
}

