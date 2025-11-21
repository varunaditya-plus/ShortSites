#!/bin/sh
set -e

# Export environment variables if they're set
# This ensures they're available to the Node.js process
if [ -n "$SUPABASE_URL" ]; then
  export SUPABASE_URL="$SUPABASE_URL"
fi

if [ -n "$SUPABASE_KEY" ]; then
  export SUPABASE_KEY="$SUPABASE_KEY"
fi

if [ -n "$OPENAI_API_KEY" ]; then
  export OPENAI_API_KEY="$OPENAI_API_KEY"
fi

# Execute the main command
exec "$@"

