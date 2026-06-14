import jwt from 'jsonwebtoken';

export function generateOAuthTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}