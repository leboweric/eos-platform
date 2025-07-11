import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run migrations first
console.log('🔄 Running database migrations...');
const migrate = spawn('node', [join(__dirname, 'migrate.js')], {
  stdio: 'inherit',
  env: process.env
});

migrate.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Migration failed with code ${code}`);
    process.exit(1);
  }
  
  console.log('✅ Migrations completed successfully');
  console.log('🚀 Starting server...');
  
  // Start the server
  const server = spawn('node', [join(__dirname, 'server.js')], {
    stdio: 'inherit',
    env: process.env
  });
  
  server.on('close', (code) => {
    process.exit(code);
  });
});