# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Matrix Flow is a Next.js application for managing network flow matrices with versioning, audit trails, and role-based access control. It uses PostgreSQL for data persistence and Prisma as the ORM.

## Development Commands

### Quick Start
```bash
make install    # Full installation (dependencies + DB setup)
make dev        # Start development server (local without Docker)
make prod       # Start production with Docker Compose
```

### Database Operations
```bash
make db-push    # Apply Prisma schema to database
make db-seed    # Load initial data (creates admin user)
make db-reset   # Reset database (destructive!)
make db-studio  # Open Prisma Studio GUI
```

### Development Workflow
```bash
npm run dev        # Development server (in web/ directory)
npm run build      # Production build
npm run lint       # ESLint linting
npm run typecheck  # TypeScript type checking
npm test           # Run tests (Jest configured)
```

### Docker Operations
```bash
make up           # Start Docker services
make down         # Stop Docker services
make logs         # View all logs
make logs-web     # Web application logs only
make logs-db      # PostgreSQL logs only
```

## Architecture

### Core Technologies
- **Frontend**: Next.js 15.2.3 with App Router, React 18.2, TypeScript 5.5
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 17 with Prisma ORM 6.14
- **Authentication**: NextAuth.js 5.0 beta with credentials provider
- **Styling**: Tailwind CSS 3.4

### Key Directory Structure
```
web/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── auth/         # Authentication endpoints
│   │   ├── matrices/     # Matrix CRUD operations
│   │   ├── dashboard/    # Statistics endpoints
│   │   └── admin/        # Admin panel APIs
│   ├── matrices/         # Matrix management pages
│   ├── admin/            # Admin panel pages
│   └── login/            # Authentication pages
├── components/ui/         # Reusable UI components
├── lib/                  # Core utilities
│   ├── db.ts            # Prisma client singleton
│   ├── rbac.ts          # Role-based access control
│   ├── audit.ts         # Audit logging system
│   └── session.ts       # Session management
├── prisma/schema.prisma  # Database schema
└── middleware.ts         # Route protection
```

## Database Schema

### Key Models
- **User**: Authentication with global roles (admin/user/viewer)
- **Matrix**: Network flow matrices with ownership and permissions
- **FlowEntry**: Individual flow rules within matrices
- **MatrixVersion**: Versioning system with approval workflow
- **MatrixPermission**: Granular matrix-level permissions (owner/editor/viewer)
- **AuditLog**: Complete audit trail of all actions
- **ChangeRequest**: Workflow system for flow modifications

### RBAC System
- **Global Roles**: admin (full access), user (create/edit), viewer (read-only)
- **Matrix Permissions**: owner (full control), editor (modify entries), viewer (read-only)
- **Admin Panel**: Separate RBAC system for system management

## Key Files to Understand

### Authentication & Authorization
- `web/auth.ts` - NextAuth configuration with credentials provider
- `web/middleware.ts` - Route protection and session validation
- `web/lib/rbac.ts` - Permission checking utilities

### Database & Core Logic
- `web/lib/db.ts` - Prisma client singleton
- `web/prisma/schema.prisma` - Complete data model
- `web/lib/audit.ts` - Audit logging implementation

### API Structure
All API routes follow REST patterns:
- `GET /api/matrices` - List matrices
- `POST /api/matrices` - Create matrix
- `GET /api/matrices/[id]` - Get matrix details
- `PUT /api/matrices/[id]` - Update matrix
- Import/Export: `/api/matrices/[id]/import` and `/api/matrices/[id]/export`

## Default Credentials

After running `make db-seed`:
- Username: `admin`
- Password: `admin`

⚠️ Change these credentials immediately in production environments.

## Development Notes

### Testing
- Jest configured for unit testing
- Test files: `*.test.ts` or `*.spec.ts`
- Run with: `npm test` or `make test`

### Code Style
- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Prettier for code formatting
- Use `npm run lint` and `npm run typecheck` before committing

### Environment Variables
Required variables in `.env` or `.env.local`:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/matrixflow"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NODE_ENV="development"
```

### Component Patterns
- UI components in `components/ui/` with consistent props interfaces
- Use `clsx` and `tailwind-merge` for conditional styling
- Form validation with Zod schemas
- Error handling with try/catch and proper error responses

### Performance Considerations
- Prisma queries optimized with proper includes/selects
- API routes use proper HTTP status codes
- Client-side state management with React hooks
- Image optimization through Next.js built-in features