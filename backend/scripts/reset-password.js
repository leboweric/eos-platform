import bcrypt from 'bcryptjs';
import db from '../src/config/database.js';

const resetPassword = async () => {
  const email = 'admin@sentientwealth.com';
  const newPassword = 'TempPass123!';
  
  try {
    // Generate hash for new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    const result = await db.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, first_name, last_name',
      [hashedPassword, email]
    );
    
    if (result.rowCount === 0) {
      console.error('User not found:', email);
      process.exit(1);
    }
    
    console.log('✅ Password reset successfully!');
    console.log('User:', result.rows[0].email);
    console.log('Name:', `${result.rows[0].first_name} ${result.rows[0].last_name}`);
    console.log('\n🔑 New password:', newPassword);
    console.log('\n⚠️  IMPORTANT: Change this password immediately after logging in!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
};

resetPassword();