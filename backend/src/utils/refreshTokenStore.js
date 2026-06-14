import crypto from 'crypto';
import { query } from '../config/database.js';

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshTokenHash(userId, refreshToken) {
  const hash = hashRefreshToken(refreshToken);
  await query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [hash, userId]);
}

/**
 * Returns true if the token matches the stored hash, or no hash is set yet (pre-migration users).
 */
export async function isRefreshTokenValid(userId, refreshToken) {
  const result = await query(
    'SELECT refresh_token_hash FROM users WHERE id = $1',
    [userId]
  );

  const storedHash = result.rows[0]?.refresh_token_hash;
  if (!storedHash) return true;

  return storedHash === hashRefreshToken(refreshToken);
}

export async function clearRefreshTokenHash(userId) {
  await query('UPDATE users SET refresh_token_hash = NULL WHERE id = $1', [userId]);
}