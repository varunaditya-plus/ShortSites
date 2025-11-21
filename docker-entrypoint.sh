#!/bin/sh
set -e

# Export environment variables if they're set
# This ensures they're available to the Node.js process
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  export NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_KEY" ]; then
  export NEXT_PUBLIC_SUPABASE_KEY="$NEXT_PUBLIC_SUPABASE_KEY"
fi

if [ -n "$OPENAI_API_KEY" ]; then
  export OPENAI_API_KEY="$OPENAI_API_KEY"
fi

# Execute the main command
exec "$@"

