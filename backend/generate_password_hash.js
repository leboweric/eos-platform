import bcrypt from 'bcryptjs';

// Generate a bcrypt hash for a test password
async function generateHash() {
  const password = 'TestPassword123!';
  const saltRounds = 12;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Bcrypt hash:', hash);
    console.log('\nYou can use this hash in your database for testing.');
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();