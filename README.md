# Foco - Project Management System

A modern, full-featured project management application built with Next.js 14, React 18, TypeScript, and Supabase.

## 🚀 Features

- **Multi-tenant Organizations** - Support for multiple organizations with role-based access
- **Project Management** - Complete CRUD operations for projects with team assignments
- **Task & Milestone Tracking** - Organize work with tasks, milestones, and goals
- **Real-time Collaboration** - Live updates using Supabase real-time subscriptions
- **AI-Powered Insights** - Smart suggestions and project intelligence
- **Mobile Responsive** - Fully responsive design with mobile-optimized components
- **WCAG 2.1 AA Compliant** - Accessible design with proper contrast and keyboard navigation
- **Dark/Light Theme** - Semantic color system with theme switching
- **Internationalization** - Support for English and Spanish

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, Radix UI components
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Validation:** Zod schemas
- **Testing:** Vitest, Playwright, React Testing Library
- **Deployment:** Netlify

## 📋 Prerequisites

- Node.js 18.x or 20.x
- npm or yarn
- Supabase account and project

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd focofixfork
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run database migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Run migrations
   supabase db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:run

# Run tests with UI
npm run test:ui

# Run contract tests
npm run test:contract

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run accessibility tests
npm run test:accessibility

# Generate coverage report
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # API endpoints (53 routes)
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── projects/          # Project management pages
│   │   └── organizations/     # Organization pages
│   ├── components/            # React components (82+ components)
│   │   ├── ui/               # Base UI components (Radix UI based)
│   │   ├── projects/         # Project-specific components
│   │   ├── dashboard/        # Dashboard components
│   │   └── dialogs/          # Modal dialogs
│   ├── lib/                   # Core libraries and utilities
│   │   ├── services/         # Business logic services (28 services)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── middleware/       # Authorization middleware
│   │   ├── validation/       # Zod validation schemas
│   │   └── supabase/         # Supabase client configuration
│   └── __tests__/            # Test files (48 test files)
├── database/                  # Database scripts and migrations
│   ├── migrations/           # Numbered migration files
│   └── archived/             # Historical SQL files
├── scripts/                   # Utility scripts
│   ├── testing/              # Test scripts
│   ├── database/             # Database utility scripts
│   └── verification/         # Verification scripts
├── public/                    # Static assets
└── .github/                   # GitHub Actions workflows
```

## 🔒 Security

### Authentication
- Session-based authentication via Supabase
- Middleware protection on all routes
- API routes secured with user ID headers

### Authorization
- Role-based access control (RBAC)
- Organization-level permissions (owner, admin, member, guest)
- Project-level permissions with team assignments
- Authorization middleware for all protected operations

### Important Security Notes
⚠️ **Row Level Security (RLS) is currently disabled** on database tables. Security is enforced at the application layer only. See [DATABASE_STATUS.md](database/DATABASE_STATUS.md) for details.

## 📊 Database

The application uses Supabase (PostgreSQL) with 47 tables across multiple domains:

- **Organizations:** Multi-tenant organization support
- **Projects:** Project management with team assignments
- **Tasks & Milestones:** Work item tracking
- **Goals:** Goal management and tracking
- **Users:** User profiles and preferences
- **Comments:** Commenting system
- **Files:** File attachments
- **Activity:** Activity logs and audit trails
- **AI:** AI suggestions and intelligence
- **Real-time:** Real-time collaboration support

For detailed database documentation, see [database/DATABASE_STATUS.md](database/DATABASE_STATUS.md).

## 🚀 Deployment

### Netlify
The project is configured for Netlify deployment with serverless functions.

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
Ensure all required environment variables are set in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📚 Documentation

- [Comprehensive Codebase Analysis](COMPREHENSIVE_CODEBASE_ANALYSIS.md)
- [Database Status](database/DATABASE_STATUS.md)
- [Testing Guide](TESTING.md)
- [API Documentation](API_AUTH_VALIDATION_SUMMARY.md)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `npm run test:run && npm run test:contract`
5. Create a pull request

## 📈 Current Status

**Production Readiness: 75%**

### ✅ Complete
- Authentication system
- Frontend architecture
- API validation
- Mobile responsiveness
- WCAG compliance
- Basic testing infrastructure

### 🚧 In Progress
- Authorization layer (role checks being added)
- Test coverage expansion (currently 17%)
- Missing database tables for some features

### 📋 Planned
- Row Level Security re-implementation
- Performance monitoring activation
- Enhanced testing coverage (target: 70%+)
- Complete documentation

## 📝 Recent Changes (October 2025)

### Security Fixes
- ✅ Fixed invitation acceptance vulnerability
- ✅ Added authorization middleware
- ✅ Implemented role-based permission checks
- ✅ Removed demo user fallbacks

### Database Cleanup
- ✅ Organized 18 SQL files into proper structure
- ✅ Dropped duplicate `organization_invites` table
- ✅ Moved 45+ test scripts to `scripts/` directory
- ✅ Created database migration system

### Infrastructure
- ✅ Added GitHub Actions CI/CD workflows
- ✅ Organized project structure
- ✅ Created comprehensive documentation

## 🐛 Known Issues

See [COMPREHENSIVE_CODEBASE_ANALYSIS.md](COMPREHENSIVE_CODEBASE_ANALYSIS.md) for a complete list of known issues and planned improvements.

## 📄 License

[Your License Here]

## 👥 Team

[Your Team Information]

---

**Built with ❤️ using Next.js, React, and Supabase**
