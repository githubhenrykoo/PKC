#!/bin/sh
set -e

# Generate runtime environment JS file from Docker environment variables
echo "// Auto-generated runtime environment variables - DO NOT EDIT" > /app/dist/client/runtime-env.js
echo "window.RUNTIME_ENV = {" >> /app/dist/client/runtime-env.js

# Extract all PUBLIC_ environment variables
env | grep "^PUBLIC_" | while read -r line; do
  key=$(echo "$line" | cut -d= -f1)
  value=$(echo "$line" | cut -d= -f2-)
  echo "  \"$key\": \"$value\"," >> /app/dist/client/runtime-env.js
done

echo "};" >> /app/dist/client/runtime-env.js

echo "✅ Runtime environment variables injected successfully"

# Start the application
exec npm start
