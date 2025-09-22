#!/bin/bash
set -e

echo "🚀 Starting PKC with dynamic .env loading..."
echo "📁 .env file mounted at: /app/.env"
echo "🔧 Environment variables will be loaded dynamically via API endpoint"
echo ""

# Start the application
exec npm start
