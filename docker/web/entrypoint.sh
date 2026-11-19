#!/bin/sh
set -eu

BACKEND="${APP_BACKEND:-local}"
API_URL="${LOCAL_API_URL:-/api}"
TARGET=/usr/share/nginx/html/config/runtime.js

if [ "$BACKEND" = "local" ]; then
  printf 'window.__NORMALIZA_RUNTIME__ = {"backend":"local","local":{"apiBaseUrl":"%s"}};\n' "$API_URL" > "$TARGET"
else
  printf 'window.__NORMALIZA_RUNTIME__ = {"backend":"supabase"};\n' > "$TARGET"
fi
