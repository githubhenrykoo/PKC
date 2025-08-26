// Runtime environment variables for the client
// This file is generated at build time and served as a static file

// Export environment variables as a global object
window.RUNTIME_ENV = {
  // Core configuration
  PUBLIC_API_URL: 'https://bmcard.pkc.pub/v1',
  
  // Authentication
  PUBLIC_AUTH_URL: 'https://auth.pkc.pub',
  
  // Feature flags
  ENABLE_EXPERIMENTAL_FEATURES: false,
  
  // Version info
  VERSION: '1.0.0',
  BUILD_TIMESTAMP: new Date().toISOString()
};

// Log that environment was loaded
console.log('✅ Runtime environment variables loaded:', window.RUNTIME_ENV);

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
