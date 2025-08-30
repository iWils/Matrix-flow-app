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

### HTTPS & SSL Operations
```bash
make https        # Start with HTTPS auto-signed certificates
make https-custom # Start with custom SSL certificates
make ssl-dev      # Generate SSL certificates for development
```

### ACME Multi-CA Certificate Management
```bash
make acme-letsencrypt # Configure ACME with Let's Encrypt
make acme-zerossl     # Configure ACME with ZeroSSL
make acme-buypass     # Configure ACME with Buypass
make acme-google      # Configure ACME with Google Trust Services
make acme-step-ca     # Configure ACME with Step-CA (private CA)
```

## Architecture

### Core Technologies
- **Frontend**: Next.js 15.2.3 with App Router, React 18.2, TypeScript 5.5
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 17 with Prisma ORM 6.14
- **Authentication**: NextAuth.js 5.0 beta with credentials provider
- **Caching**: Redis with ioredis 5.4.1 (optional, graceful fallback)
- **Styling**: Tailwind CSS 3.4
- **HTTPS/SSL**: Native HTTPS support with multi-CA ACME integration
- **Security**: Comprehensive CSP headers and security middleware

### Key Directory Structure
```
web/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── auth/         # Authentication endpoints
│   │   ├── matrices/     # Matrix CRUD operations
│   │   │   └── [id]/entries/
│   │   │       ├── batch/      # Phase 2: Batch operations
│   │   │       └── search/     # Phase 2: Advanced search
│   │   ├── dashboard/    # Statistics endpoints (cached)
│   │   └── admin/        # Admin panel APIs
│   ├── matrices/         # Matrix management pages
│   ├── admin/            # Admin panel pages
│   └── login/            # Authentication pages
├── components/ui/         # Reusable UI components
│   ├── AdvancedSearch.tsx     # Phase 2: Multi-field search
│   ├── BatchActions.tsx       # Phase 2: Bulk operations
│   ├── Toast.tsx              # Phase 2: Notification system
│   ├── MatrixSkeletons.tsx    # Phase 2: Loading states
│   └── index.ts               # Centralized exports
├── lib/                  # Core utilities
│   ├── db.ts            # Prisma client singleton
│   ├── cache.ts         # Phase 2: Redis caching system
│   ├── rbac.ts          # Role-based access control
│   ├── audit.ts         # Audit logging system
│   ├── session.ts       # Session management
│   └── security/        # Security utilities
│       ├── headers.ts   # CSP and security headers
│       └── rateLimit.ts # Rate limiting with Redis fallback
├── prisma/schema.prisma  # Database schema
├── middleware.ts         # Route protection
├── server.js            # Custom HTTPS server with SSL support
└── start.sh             # Docker startup script with HTTPS/ACME
```

### Project Root Structure
```
scripts/
├── acme-init.sh         # ACME multi-CA initialization script
ACME_MULTI_CA_GUIDE.md   # Comprehensive ACME setup guide
STEP_CA_SETUP.md         # Step-CA specific setup guide
docker-compose.yml       # Unified Docker configuration
Makefile                 # Development and deployment commands
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

## Phase 2 Architecture (New Features)

### Batch Operations System
- **API**: `POST /api/matrices/[id]/entries/batch` - Handles delete, update, export operations
- **Components**: `BatchActions.tsx` - Floating action bar with confirmation modals
- **Logic**: Multiple entry selection with checkbox UI, supports workflow requests for non-admins

### Advanced Search System
- **API**: `GET|POST /api/matrices/[id]/entries/search` - Full-text search with filters
- **Components**: `AdvancedSearch.tsx` - Collapsible multi-section filter interface
- **Features**: Field-specific filters, date ranges, pagination, result caching

### Caching Layer (Redis)
- **Implementation**: `lib/cache.ts` - MatrixCache class with automatic invalidation
- **Strategy**: Dashboard stats (5min), matrices (30min), search results (10min)
- **Graceful degradation**: Works without Redis, logs warnings only
- **APIs**: `/api/dashboard/stats-cached` - Optimized endpoint with cache-first approach

### Toast Notification System
- **Provider**: Global `ToastProvider` in `LayoutContent.tsx`
- **Hook**: `useToast()` - success, error, warning, info variants
- **Features**: Auto-dismiss, action buttons, responsive positioning

### Enhanced Loading States
- **Components**: `MatrixSkeletons.tsx` - Specialized skeleton screens
- **Variants**: Table, form, dashboard stats, modal skeletons
- **Usage**: Replace spinners for better perceived performance

## Key Files to Understand

### Authentication & Authorization
- `web/auth.ts` - NextAuth configuration with credentials provider
- `web/middleware.ts` - Route protection and session validation
- `web/lib/rbac.ts` - Permission checking utilities

### Database & Core Logic
- `web/lib/db.ts` - Prisma client singleton
- `web/prisma/schema.prisma` - Complete data model
- `web/lib/audit.ts` - Audit logging implementation
- `web/lib/cache.ts` - Redis caching with MatrixCache utilities

### HTTPS & Certificate Management
- `web/server.js` - Custom Node.js server with native HTTPS support
- `web/start.sh` - Startup script with SSL certificate detection
- `scripts/acme-init.sh` - ACME multi-CA certificate provisioning
- `ACME_MULTI_CA_GUIDE.md` - Complete ACME setup documentation
- `STEP_CA_SETUP.md` - Step-CA private CA integration guide

### Security Infrastructure
- `web/lib/security/headers.ts` - CSP and security headers configuration
- `web/lib/security/rateLimit.ts` - Rate limiting with Redis fallback
- `web/middleware.ts` - Comprehensive request filtering and protection

### API Structure
All API routes follow REST patterns:
- `GET /api/matrices` - List matrices
- `POST /api/matrices` - Create matrix
- `GET /api/matrices/[id]` - Get matrix details
- `PUT /api/matrices/[id]` - Update matrix
- Import/Export: `/api/matrices/[id]/import` and `/api/matrices/[id]/export`

**Phase 2 API Extensions:**
- `POST /api/matrices/[id]/entries/batch` - Bulk operations (delete, update, export)
- `GET /api/matrices/[id]/entries/search` - Advanced search with pagination
- `POST /api/matrices/[id]/entries/search` - Search with complex filters
- `GET /api/dashboard/stats-cached` - Cached dashboard statistics

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

# Phase 2 - Cache Redis (optionnel mais recommandé pour les performances)
# En développement local: redis://localhost:6379
# En Docker: redis://redis:6379
REDIS_URL="redis://redis:6379"

# HTTPS & SSL Configuration (optional)
ENABLE_HTTPS=false              # Enable native HTTPS support
HTTP_PORT=3000                  # HTTP port
HTTPS_PORT=443                  # HTTPS port
GENERATE_SELF_SIGNED=true       # Auto-generate self-signed certificates
SSL_CERTS_PATH=./ssl           # Path to SSL certificates

# ACME Multi-CA Configuration (optional)
ACME_CA_SERVER=letsencrypt     # letsencrypt, zerossl, buypass, google, step-ca
ACME_EMAIL=admin@localhost     # Email for ACME registration
CHALLENGE_METHOD=http          # http, dns, standalone, alpn
SSL_KEY_SIZE=4096             # SSL key size

# Step-CA Configuration (if using Step-CA)
STEP_CA_URL=https://ca.example.com:9000
STEP_CA_ROOT=fingerprint-of-root-ca
STEP_CA_PROVISIONER=acme
```

### Component Patterns
- UI components in `components/ui/` with consistent props interfaces
- Centralized exports via `components/ui/index.ts`
- Use `clsx` and `tailwind-merge` for conditional styling
- Form validation with Zod schemas
- Error handling with try/catch and proper error responses
- Toast notifications via `useToast()` hook for user feedback

### Performance Considerations
- Redis caching for frequently accessed data (dashboard stats, search results)
- Prisma queries optimized with proper includes/selects
- Skeleton loading states instead of spinners
- API routes use proper HTTP status codes
- Client-side state management with React hooks
- Image optimization through Next.js built-in features

### Matrix Entry Operations
- Batch operations support for improved productivity
- Advanced search with field-specific filters and full-text search
- Workflow system for non-admin users (change requests)
- Real-time permission checking with RBAC integration
- Audit trail for all operations including batch actions

### Cache Management
- Automatic cache invalidation on data modifications
- Hash-based search result caching
- Per-user dashboard statistics caching
- Cache health monitoring via API endpoints (admin only)

## HTTPS & Certificate Management

### Native HTTPS Support
Matrix Flow includes native HTTPS support with automatic certificate management:

- **Multi-source certificate detection**: Let's Encrypt, ZeroSSL, Buypass, Google Trust Services, Step-CA, custom certificates
- **Automatic certificate provisioning**: ACME protocol support for 7+ certificate authorities
- **Self-signed certificate generation**: Automatic fallback for development environments
- **Certificate renewal**: Automated renewal via acme.sh integration
- **HTTP to HTTPS redirection**: Configurable forced HTTPS mode

### ACME Multi-CA Integration
Supports multiple Certificate Authorities:

1. **Let's Encrypt** - Most popular free CA
2. **ZeroSSL** - Alternative with commercial features
3. **Buypass** - Norwegian CA, European alternative
4. **Google Trust Services** - Google's new CA (Beta)
5. **SSL.com** - Commercial CA with extended validation
6. **Step-CA** - Private certificate authority for internal infrastructure
7. **Staging/Test** environments for all CAs

### Quick HTTPS Setup
```bash
# Enable HTTPS with auto-signed certificates
ENABLE_HTTPS=true make https

# Use Let's Encrypt
ACME_CA_SERVER=letsencrypt make acme-letsencrypt

# Use Step-CA for private infrastructure
ACME_CA_SERVER=step-ca make acme-step-ca
```

### Security Headers & CSP
Comprehensive Content Security Policy implementation:

- **CSP Headers**: Configurable directives for script, style, and resource origins
- **HSTS**: HTTP Strict Transport Security with preload support
- **Frame Protection**: X-Frame-Options and CSP frame-ancestors
- **Content Type Protection**: X-Content-Type-Options and MIME validation
- **Cross-Origin Policies**: CORP, COOP, COEP configuration
- **Development Mode**: Relaxed CSP for development with hot reload support

### SSL/TLS Configuration
- **Key Sizes**: Support for RSA 2048/3072/4096 and ECC P-256/P-384
- **Cipher Suites**: Modern TLS 1.2+ with secure cipher preferences  
- **Certificate Chains**: Full chain validation with intermediate certificates
- **SNI Support**: Server Name Indication for multiple domains