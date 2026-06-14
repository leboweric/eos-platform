import { query } from '../config/database.js';
import { consumeOAuthExchangeCode } from '../utils/oauthExchange.js';
import { getUserAccessibleTeams } from '../utils/teamUtils.js';
import { storeRefreshTokenHash } from '../utils/refreshTokenStore.js';

export const exchangeOAuthCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Exchange code is required'
      });
    }

    const record = await consumeOAuthExchangeCode(code);
    if (!record) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired exchange code'
      });
    }

    const userResult = await query(
      `SELECT id, email, first_name, last_name, role, organization_id, is_consultant
       FROM users WHERE id = $1`,
      [record.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const teams = await getUserAccessibleTeams(user.id, user.organization_id);

    await storeRefreshTokenHash(user.id, record.refresh_token);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organizationId: user.organization_id,
          organization_id: user.organization_id,
          is_consultant: user.is_consultant,
          teams
        },
        accessToken: record.access_token,
        refreshToken: record.refresh_token,
        provider: record.provider
      }
    });
  } catch (error) {
    console.error('OAuth exchange error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete OAuth login'
    });
  }
};