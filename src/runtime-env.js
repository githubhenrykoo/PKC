// Runtime environment script that runs at container startup
// This script will be mounted into the container and served as a static file

// Import required modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Extract all PUBLIC_ environment variables from process.env
const env = {};
Object.keys(process.env).forEach(key => {
  if (key.startsWith('PUBLIC_')) {
    env[key] = process.env[key];
  }
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the output directory exists
const outputDir = path.resolve(process.env.RUNTIME_ENV_OUTPUT_DIR || '/app/dist/client');

try {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create the runtime-env.js file
  const content = `// Auto-generated at container startup
window.RUNTIME_ENV = ${JSON.stringify(env, null, 2)};`;
  
  fs.writeFileSync(path.join(outputDir, 'runtime-env.js'), content);
  console.log(`✅ Runtime environment variables written to ${path.join(outputDir, 'runtime-env.js')}`);
} catch (error) {
  console.error('❌ Failed to write runtime environment variables:', error);
}
