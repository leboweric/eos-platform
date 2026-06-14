import { createOAuthExchangeCode } from './oauthExchange.js';
import { resolveOAuthRedirectBase } from './oauthRedirect.js';

/**
 * Redirect to frontend with a one-time exchange code (never put JWTs in the URL).
 */
export async function redirectAfterOAuthLogin(res, { accessToken, refreshToken, user, provider, state }) {
  const baseUrl = resolveOAuthRedirectBase(state);
  const exchangeCode = await createOAuthExchangeCode({
    accessToken,
    refreshToken,
    userId: user.id,
    provider
  });

  const callbackUrl = `${baseUrl}/auth/callback?code=${exchangeCode}&provider=${provider}`;
  res.redirect(callbackUrl);
}