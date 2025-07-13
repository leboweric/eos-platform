import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function ensureUploadsDirectory() {
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const todosDir = path.join(uploadsDir, 'todos');
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }
  
  // Create todos subdirectory if it doesn't exist
  if (!fs.existsSync(todosDir)) {
    fs.mkdirSync(todosDir, { recursive: true });
    console.log('Created uploads/todos directory');
  }
  
  return todosDir;
}