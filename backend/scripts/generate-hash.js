import bcrypt from 'bcryptjs';

const password = 'abc123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
  } else {
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nSQL to update password:');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@sentientwealth.com';`);
  }
});