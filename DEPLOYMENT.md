# EOS Platform Deployment Guide

This guide provides step-by-step instructions for deploying the EOS Platform to production environments.

## 🎯 Deployment Overview

The EOS Platform consists of three main components:
1. **Frontend** (React/Vite) → Deploy to Netlify
2. **Backend** (Node.js/Express) → Deploy to Railway
3. **Database** (PostgreSQL) → Railway PostgreSQL

## 🗄️ Database Deployment (Railway PostgreSQL)

### 1. Create PostgreSQL Service
1. Log in to [Railway](https://railway.app)
2. Create a new project
3. Click "Add Service" → "Database" → "PostgreSQL"
4. Railway will provision a PostgreSQL instance

### 2. Get Database Connection Details
1. Click on the PostgreSQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL` (it looks like: `postgresql://user:pass@host:port/db`)

### 3. Run Database Migrations
```bash
# Install PostgreSQL client locally if not already installed
# On macOS: brew install postgresql
# On Ubuntu: sudo apt-get install postgresql-client

# Connect to your Railway database and run migrations
psql "your-database-url-here" -f backend/database/migrations/001_initial_schema.sql
```

## 🚀 Backend Deployment (Railway)

### 1. Prepare Repository
```bash
# Ensure your code is in a Git repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/eos-platform.git
git push -u origin main
```

### 2. Deploy to Railway
1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set the **Root Directory** to `backend`
5. Railway will automatically detect it's a Node.js project

### 3. Configure Environment Variables
In Railway dashboard, go to your backend service → Variables tab and add:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-super-secure-jwt-secret-here-make-it-long-and-random
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here-also-long-and-random
JWT_REFRESH_EXPIRES_IN=7d
OPENAI_API_KEY=your-openai-api-key-if-you-have-one
```

### 4. Get Backend URL
1. After deployment, Railway will provide a public URL
2. It will look like: `https://your-app-name.up.railway.app`
3. Save this URL for frontend configuration

## 🌐 Frontend Deployment (Netlify)

### 1. Build the Frontend
```bash
cd frontend

# Update the API URL for production
echo "VITE_API_URL=https://your-backend-url.up.railway.app/api/v1" > .env.production

# Build the application
pnpm build
```

### 2. Deploy to Netlify

#### Option A: Drag and Drop (Quickest)
1. Go to [Netlify](https://netlify.com)
2. Drag the `frontend/dist` folder to the deploy area
3. Your site will be live immediately

#### Option B: Git Integration (Recommended)
1. Push your code to GitHub
2. Go to Netlify → "New site from Git"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `pnpm build`
   - **Publish directory**: `frontend/dist`
5. Add environment variable:
   - `VITE_API_URL`: `https://your-backend-url.up.railway.app/api/v1`

### 3. Configure Custom Domain (Optional)
1. In Netlify dashboard → Domain settings
2. Add your custom domain
3. Configure DNS records as instructed

## 🔧 Production Configuration

### Backend Security Checklist
- [ ] Strong JWT secrets (32+ characters)
- [ ] Database connection over SSL
- [ ] CORS configured for your frontend domain
- [ ] Rate limiting enabled
- [ ] Environment variables secured
- [ ] No sensitive data in logs

### Frontend Configuration
- [ ] API URL points to production backend
- [ ] Error tracking configured (optional)
- [ ] Analytics configured (optional)
- [ ] PWA features enabled (optional)

## 🔍 Testing Deployment

### 1. Test Backend API
```bash
# Test health endpoint
curl https://your-backend-url.up.railway.app/api/v1/health

# Test registration
curl -X POST https://your-backend-url.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "organizationName": "Test Org"
  }'
```

### 2. Test Frontend
1. Visit your Netlify URL
2. Try registering a new account
3. Test login functionality
4. Navigate through different pages
5. Test responsive design on mobile

## 🚨 Troubleshooting

### Common Backend Issues

**Database Connection Failed**
```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Test connection manually
psql "$DATABASE_URL" -c "SELECT 1;"
```

**CORS Errors**
- Ensure frontend URL is added to CORS whitelist in backend
- Check that API URL in frontend matches backend URL

**JWT Errors**
- Verify JWT_SECRET is set and consistent
- Check token expiration times

### Common Frontend Issues

**API Calls Failing**
- Check VITE_API_URL environment variable
- Verify backend is accessible from browser
- Check browser network tab for errors

**Build Failures**
- Ensure all dependencies are installed
- Check for TypeScript/ESLint errors
- Verify environment variables are set

## 📊 Monitoring & Maintenance

### Backend Monitoring
- Monitor Railway logs for errors
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Monitor database performance

### Frontend Monitoring
- Monitor Netlify deploy logs
- Set up error tracking (Sentry)
- Monitor Core Web Vitals

### Regular Maintenance
- [ ] Update dependencies monthly
- [ ] Monitor security vulnerabilities
- [ ] Backup database regularly
- [ ] Review and rotate secrets quarterly

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          # Railway automatically deploys on git push
          echo "Backend deployed via Railway"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install and Build
        run: |
          cd frontend
          npm install
          npm run build
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v1.2
        with:
          publish-dir: './frontend/dist'
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🎉 Go Live Checklist

- [ ] Database deployed and migrated
- [ ] Backend deployed and tested
- [ ] Frontend deployed and tested
- [ ] Environment variables configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates active
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Team access configured
- [ ] Documentation updated

## 📞 Support

If you encounter issues during deployment:
1. Check the troubleshooting section above
2. Review Railway and Netlify logs
3. Test each component individually
4. Contact support if needed

---

**Happy Deploying!** 🚀

