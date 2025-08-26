#!/usr/bin/env node
// Script to generate runtime environment configuration

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Get all public environment variables (prefixed with PUBLIC_)
const publicEnv = {};
Object.keys(process.env).forEach(key => {
  if (key.startsWith('PUBLIC_')) {
    publicEnv[key] = process.env[key];
  }
});

// Add build info
const buildInfo = {
  BUILD_TIMESTAMP: new Date().toISOString(),
  // Add any other build-time variables here
};

// Combine all environment variables
const runtimeEnv = {
  ...publicEnv,
  ...buildInfo
};

// Create the public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write the runtime environment file
const outputPath = path.join(publicDir, 'runtime-env.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(runtimeEnv, null, 2),
  'utf8'
);

console.log(`✅ Generated runtime environment file at ${outputPath}`);

// Also create a .js version for direct inclusion
const jsOutputPath = path.join(publicDir, 'runtime-env.js');
fs.writeFileSync(
  jsOutputPath,
  `// This file is auto-generated at build time
window.RUNTIME_ENV = ${JSON.stringify(runtimeEnv, null, 2)};`,
  'utf8'
);

console.log(`✅ Generated runtime environment JS file at ${jsOutputPath}`);
