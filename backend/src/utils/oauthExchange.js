import crypto from 'crypto';
import { query } from '../config/database.js';

const CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function createOAuthExchangeCode({ accessToken, refreshToken, userId, provider }) {
  const code = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await query(
    `INSERT INTO oauth_exchange_codes (code, access_token, refresh_token, user_id, provider, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [code, accessToken, refreshToken, userId, provider, expiresAt]
  );

  return code;
}

export async function consumeOAuthExchangeCode(code) {
  const result = await query(
    `UPDATE oauth_exchange_codes
     SET consumed_at = NOW()
     WHERE code = $1
       AND consumed_at IS NULL
       AND expires_at > NOW()
     RETURNING access_token, refresh_token, user_id, provider`,
    [code]
  );

  return result.rows[0] || null;
}