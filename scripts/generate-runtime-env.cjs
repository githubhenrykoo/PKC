#!/usr/bin/env node
// Script to generate runtime environment configuration (CommonJS)

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Get all public environment variables (prefixed with PUBLIC_)
const publicEnv = {};
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('PUBLIC_')) {
    publicEnv[key] = String(process.env[key] ?? '');
  }
});

// Add build info
const buildInfo = {
  BUILD_TIMESTAMP: new Date().toISOString(),
};

// Combine all environment variables
const runtimeEnv = {
  ...publicEnv,
  ...buildInfo,
};

// Create the public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Skip generating static files - we use dynamic endpoint instead
console.log(`⏭️ Skipping static runtime environment files - using dynamic endpoint instead`);
