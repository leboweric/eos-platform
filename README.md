# Strategic Execution Platform - Version 1.0

A comprehensive strategic execution management platform built with Next.js, Node.js, and PostgreSQL. This platform provides all the tools needed to implement and manage proven business strategies for organizations and their teams.

## 🚀 Features

### Core Strategic Components
- **Business Blueprint** - Complete vision and strategy management
- **Quarterly Priorities** - Quarterly goal setting and tracking
- **Scorecard** - KPI monitoring and analytics
- **Accountability Meetings** - Structured meeting management
- **Issues List** - Issue identification and resolution
- **To-Dos** - Action item tracking

### Platform Features
- **Multi-tenant Architecture** - Complete organization separation
- **Real-time Collaboration** - Live updates and team collaboration
- **Mobile-first Design** - Responsive design optimized for all devices
- **AI Integration Ready** - OpenAI integration for smart insights
- **Secure Authentication** - JWT-based authentication system
- **Professional UI** - Built with shadcn/ui and Tailwind CSS

## 🏗️ Architecture

### Frontend (React/Next.js)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios with interceptors

### Backend (Node.js/Express)
- **Framework**: Express.js with ES modules
- **Database**: PostgreSQL with native pg driver
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Express Validator
- **Password Hashing**: bcryptjs

### Database Schema
- **Multi-tenant**: Organization-based data separation
- **Comprehensive**: All EOS components modeled
- **Scalable**: Optimized indexes and relationships
- **Secure**: Row-level security ready

## 📦 Project Structure

```
eos-platform/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand state stores
│   │   └── App.jsx         # Main application component
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── config/         # Configuration files
│   │   └── server.js       # Main server file
│   ├── database/
│   │   └── migrations/     # Database migration files
│   └── package.json        # Backend dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- pnpm (recommended) or npm

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb eos_platform

# Run the initial migration
psql -d eos_platform -f backend/database/migrations/001_initial_schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your database credentials:
# DATABASE_URL=postgresql://username:password@localhost:5432/eos_platform
# JWT_SECRET=your-super-secret-jwt-key
# JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Start the development server
npm run dev
```

The backend will start on http://localhost:3001

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The frontend will start on http://localhost:5173

### 4. Access the Application

1. Open http://localhost:5173 in your browser
2. Click "Get Started" to create a new account
3. Fill in your organization details
4. Start using the EOS platform!

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/eos_platform

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI Configuration (Optional)
OPENAI_API_KEY=your-openai-api-key-here
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api/v1
```

## 🚀 Deployment

### Frontend (Netlify)
1. Build the frontend: `cd frontend && pnpm build`
2. Deploy the `dist` folder to Netlify
3. Set environment variable: `VITE_API_URL=https://your-backend-url.com/api/v1`

### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set the root directory to `backend`
3. Configure environment variables in Railway dashboard
4. Railway will automatically deploy on git push

### Database (Railway PostgreSQL)
1. Add PostgreSQL service in Railway
2. Copy the connection string to your backend environment
3. Run migrations against the production database

## 📊 Database Schema

The platform uses a comprehensive multi-tenant database schema:

- **Organizations** - Tenant root with complete data isolation
- **Users** - User accounts with role-based access
- **Teams** - Hierarchical team structure
- **Business Blueprint Components** - Core values, focus, targets, strategy
- **Quarterly Priorities** - Quarterly goals with milestones and updates
- **Scorecard** - KPIs and measurable tracking
- **Meetings** - Accountability meetings with agendas and attendance
- **Issues** - Issue tracking and resolution
- **To-Dos** - Action items and task management

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Password Hashing** using bcryptjs
- **Rate Limiting** to prevent abuse
- **CORS Protection** for cross-origin requests
- **Helmet Security** headers
- **Input Validation** on all endpoints
- **Multi-tenant Isolation** at database level

## 🎨 UI/UX Features

- **Mobile-first Design** - Optimized for mobile devices
- **Dark/Light Mode** - Theme switching support
- **Responsive Layout** - Works on all screen sizes
- **Professional Design** - Clean, modern interface
- **Accessibility** - WCAG compliant components
- **Loading States** - Smooth user experience

## 🔮 Future Enhancements

### Phase 2 Features
- **AI-Powered Insights** - Smart goal recommendations
- **Advanced Analytics** - Performance dashboards
- **Mobile Apps** - Native iOS and Android apps
- **Integrations** - Slack, Microsoft Teams, Google Workspace
- **Advanced Reporting** - Custom reports and exports

### Phase 3 Features
- **Video Conferencing** - Built-in meeting capabilities
- **Document Management** - File sharing and collaboration
- **Workflow Automation** - Custom automation rules
- **Advanced Permissions** - Granular access control
- **API Platform** - Public API for integrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

## 🏆 Credits

Built with ❤️ for EOS implementers and their clients.

### Technologies Used
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Zustand
- **Backend**: Node.js, Express, PostgreSQL
- **Authentication**: JWT, bcryptjs
- **Deployment**: Netlify (Frontend), Railway (Backend)
- **Development**: ESLint, Prettier, Git

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready

