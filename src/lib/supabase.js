import { createClient } from '@supabase/supabase-js';

function getEnvVar(name) {
  // Check both NEXT_PUBLIC_ prefix and direct name
  // In browser, only NEXT_PUBLIC_ vars are available
  // On server, both are available
  if (typeof window !== 'undefined') {
    // Client-side: only NEXT_PUBLIC_ vars are available
    return process.env[`NEXT_PUBLIC_${name}`] || '';
  } else {
    // Server-side: check both
    return process.env[`NEXT_PUBLIC_${name}`] || process.env[name] || '';
  }
}

// Lazy client creation - checks env vars at runtime
let supabaseClient = null;

const getSupabaseClient = () => {
  if (!supabaseClient) {
    // Get env vars at runtime (lazy evaluation)
    const url = getEnvVar('SUPABASE_URL');
    const key = getEnvVar('SUPABASE_KEY');
    
    // Check if we have valid values (not empty and not placeholders)
    const hasValidUrl = url && url !== '' && url !== 'https://placeholder.supabase.co';
    const hasValidKey = key && key !== '' && key !== 'placeholder-key';
    
    if (!hasValidUrl || !hasValidKey) {
      console.error('Supabase environment variables not configured properly.');
      console.error('URL:', hasValidUrl ? '✓' : '✗', url || 'missing');
      console.error('KEY:', hasValidKey ? '✓' : '✗', key ? 'present' : 'missing');
      throw new Error('Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY');
    }
    
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

// Client-side Supabase client
// Lazy initialization - checks env vars at runtime when first accessed
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// Server-side Supabase client (for API routes)
export function createServerClient() {
  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_KEY');
  
  // At runtime, GCP env vars will be available
  const finalUrl = url || 'https://placeholder.supabase.co';
  const finalKey = key || 'placeholder-key';
  
  return createClient(finalUrl, finalKey);
}

