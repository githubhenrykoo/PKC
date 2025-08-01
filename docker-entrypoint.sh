#!/bin/sh
set -e

# Generate runtime-env.js with all PUBLIC_ environment variables
echo "Generating runtime environment variables file..."

# Create the runtime-env.js file
cat > /app/dist/client/runtime-env.js << 'EOF'
// Auto-generated at container startup
window.RUNTIME_ENV = {
EOF

# Add all PUBLIC_ environment variables
env | grep '^PUBLIC_' | sort | while IFS='=' read -r name value; do
  # Escape quotes in the value
  escaped_value=$(echo "$value" | sed 's/"/\\"/g')
  echo "  \"$name\": \"$escaped_value\"," >> /app/dist/client/runtime-env.js
done

# Remove trailing comma and close the object
sed -i '$ s/,$//' /app/dist/client/runtime-env.js
echo "};
" >> /app/dist/client/runtime-env.js

# Also copy to the public directory for direct access
cp /app/dist/client/runtime-env.js /app/dist/runtime-env.js

# Show what was generated
echo "✅ Runtime environment variables written:"
cat /app/dist/client/runtime-env.js

# Start the application
exec npm start
