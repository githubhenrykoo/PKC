#!/bin/sh
set -e

# Generate runtime-env.js with all PUBLIC_ environment variables
echo "Generating runtime environment variables file..."

# Start building the content of the runtime-env.js file
ENV_CONTENT="// Auto-generated at container startup\nwindow.RUNTIME_ENV = {\n"

# Loop through all environment variables and extract those starting with PUBLIC_
for ENV_VAR in $(env | grep '^PUBLIC_' | sort); do
  # Extract name and value
  NAME=$(echo $ENV_VAR | cut -d= -f1)
  VALUE=$(echo $ENV_VAR | cut -d= -f2-)
  
  # Add to env content, properly escaped for JSON
  ENV_CONTENT="$ENV_CONTENT  \"$NAME\": \"$VALUE\",\n"
done

# Remove the trailing comma if there are variables and close the object
if [ $(env | grep -c '^PUBLIC_') -gt 0 ]; then
  ENV_CONTENT="${ENV_CONTENT%,\n}\n"
fi
ENV_CONTENT="$ENV_CONTENT};"

# Write to file in dist/client directory
echo "$ENV_CONTENT" > /app/dist/client/runtime-env.js

# Confirm environment variables are written
echo "✅ Runtime environment variables written to /app/dist/client/runtime-env.js"

# Start the application
exec npm start
