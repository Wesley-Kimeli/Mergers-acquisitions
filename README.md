# Mergers & Acquisitions Application

A Node.js Express application with Neon Database integration, containerized with Docker for both development and production environments.

## Architecture Overview

This application supports two distinct environments:

- **Development**: Uses **Neon Local** via Docker for local database development with ephemeral branches
- **Production**: Connects directly to **Neon Cloud Database** for production workloads

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- A Neon project with API access

## Environment Setup

### Required Environment Variables

You'll need to obtain the following from your Neon console:

1. **NEON_API_KEY**: Your Neon API key (found in Account Settings → API Keys)
2. **NEON_PROJECT_ID**: Your project ID (found in Project Settings → General)
3. **PARENT_BRANCH_ID**: The branch to create ephemeral branches from (usually `main`)
4. **ARCJET_KEY**: Your Arcjet API key for security middleware

## Docker Script Usage

### Using the setup-docker.sh Script

The `setup-docker.sh` script provides a convenient interface for all Docker operations:

```bash
# First-time setup
./setup-docker.sh setup-dev    # Setup development environment
./setup-docker.sh setup-prod   # Setup production environment
./setup-docker.sh setup-all    # Setup both environments

# Development operations
./setup-docker.sh dev-start    # Start development environment
./setup-docker.sh dev-logs     # View logs
./setup-docker.sh dev-stop     # Stop environment
./setup-docker.sh dev-clean    # Clean up everything

# Production operations
./setup-docker.sh prod-start   # Start production environment
./setup-docker.sh prod-logs    # View logs
./setup-docker.sh prod-stop    # Stop environment

# Utility commands
./setup-docker.sh status       # Show Docker status
./setup-docker.sh health       # Check app health
./setup-docker.sh clean-all    # Clean all Docker resources
./setup-docker.sh help         # Show help
```

**Windows Users**: On Windows, you can run the script using:
- **Git Bash**: `./setup-docker.sh <command>`
- **WSL**: `./setup-docker.sh <command>`
- **PowerShell**: `bash ./setup-docker.sh <command>` (requires Git Bash or WSL)

## Development Environment

### Quick Start (Development)

1. **Clone and navigate to the project:**
   ```bash
   git clone <your-repo-url>
   cd mergers-acquisitions
   ```

2. **Configure development environment:**
   ```bash
   # Copy and edit the development environment file
   cp .env.development .env.development.local
   ```

3. **Update `.env.development.local` with your Neon credentials:**
   ```env
   # Required for Neon Local
   NEON_API_KEY=your_actual_neon_api_key
   NEON_PROJECT_ID=your_actual_project_id
   PARENT_BRANCH_ID=main
   ARCJET_KEY=your_arcjet_key
   ```

4. **Start the development environment:**
   ```bash
   # This will start both Neon Local and your application
   docker-compose -f docker-compose.dev.yml --env-file .env.development.local up --build
   ```

5. **Access your application:**
   - Application: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - Direct Database Access: `localhost:5432` (postgres://neon:npg@localhost:5432/neondb)

### Development Features

- **Hot Reloading**: Source code changes are automatically reflected
- **Ephemeral Database Branches**: Each container restart creates a fresh database branch
- **Debug Logging**: Enhanced logging for development
- **Database Studio**: Run `npm run db:studio` to access Drizzle Studio

### Development Commands

```bash
# Using the setup-docker.sh script (recommended)
./setup-docker.sh setup-dev           # Setup development environment
./setup-docker.sh dev-start            # Start development environment
./setup-docker.sh dev-start -d -b      # Start in detached mode with rebuild
./setup-docker.sh dev-logs             # View application logs
./setup-docker.sh dev-stop             # Stop containers
./setup-docker.sh dev-clean            # Stop and remove containers with volumes
./setup-docker.sh dev-shell            # Open shell in app container

# Using npm scripts
npm run setup:dev              # Copy environment template
npm run docker:dev              # Start development environment
npm run docker:dev:detached     # Start in detached mode
npm run docker:dev:logs         # View application logs
npm run docker:dev:stop         # Stop containers
npm run docker:dev:clean        # Stop and remove containers with volumes

# Using docker-compose directly
docker-compose -f docker-compose.dev.yml --env-file .env.development.local up --build
docker-compose -f docker-compose.dev.yml --env-file .env.development.local up -d
docker-compose -f docker-compose.dev.yml logs -f app
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml down -v
```

## Production Environment

### Quick Start (Production)

1. **Configure production environment:**
   ```bash
   # Copy and edit the production environment file
   cp .env.production .env.production.local
   ```

2. **Update `.env.production.local` with your production Neon Cloud URL:**
   ```env
   # Replace with your actual Neon Cloud connection string
   DATABASE_URL=postgresql://username:password@ep-your-endpoint.neon.tech/dbname?sslmode=require&channel_binding=require
   ARCJET_KEY=your_production_arcjet_key
   ```

3. **Start the production environment:**
   ```bash
   # This connects directly to Neon Cloud
   docker-compose -f docker-compose.prod.yml --env-file .env.production.local up --build -d
   ```

4. **Verify deployment:**
   ```bash
   # Check health
   curl http://localhost:3000/health
   
   # View logs
   docker-compose -f docker-compose.prod.yml logs -f app
   ```

### Production Features

- **Security Hardened**: Read-only filesystem, non-root user, resource limits
- **Health Checks**: Built-in health monitoring
- **Logging**: Structured logging with rotation
- **Resource Management**: CPU and memory limits configured
- **Direct Neon Cloud**: No proxy, direct connection to production database

### Production Commands

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Update application (rebuild and restart)
docker-compose -f docker-compose.prod.yml up --build -d

# Stop production environment
docker-compose -f docker-compose.prod.yml down
```

## Database Management

### Development Database

When using Neon Local:
- Ephemeral branches are created automatically
- Database is reset on each container restart
- Perfect for testing and development
- Schema changes can be tested safely

```bash
# Generate migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:generate

# Run migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Access Drizzle Studio
docker-compose -f docker-compose.dev.yml exec app npm run db:studio
```

### Production Database

For production:
- Connects directly to your Neon Cloud database
- Persistent data storage
- Use Neon console for branch management
- Run migrations carefully

```bash
# Run production migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
```

## Environment Variables Reference

### Development Environment (.env.development)
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgres://neon:npg@neon-local:5432/neondb?sslmode=require
NEON_API_KEY=your_neon_api_key
NEON_PROJECT_ID=your_project_id
PARENT_BRANCH_ID=main
ARCJET_KEY=your_arcjet_key
```

### Production Environment (.env.production)
```env
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://username:password@ep-your-endpoint.neon.tech/dbname?sslmode=require
ARCJET_KEY=your_production_arcjet_key
```

## Troubleshooting

### Development Issues

**Neon Local won't start:**
- Verify your `NEON_API_KEY`, `NEON_PROJECT_ID`, and `PARENT_BRANCH_ID`
- Check if port 5432 is already in use
- Ensure your Neon API key has the required permissions

**Application can't connect to database:**
- Wait for Neon Local health check to pass
- Check the DATABASE_URL format
- Verify the `neon-local` service is running

**Hot reloading not working:**
- Ensure volumes are properly mounted in `docker-compose.dev.yml`
- Check if you're running the development target in the Dockerfile

### Production Issues

**Application won't start:**
- Verify your production `DATABASE_URL` is correct
- Check if the Neon Cloud database is accessible
- Review application logs: `docker-compose -f docker-compose.prod.yml logs app`

**Performance issues:**
- Adjust resource limits in `docker-compose.prod.yml`
- Monitor resource usage: `docker stats`
- Check database connection pooling settings

### General Issues

**Port conflicts:**
- Change the port mapping in docker-compose files
- Use `docker ps` to check what's running on your ports

**Permission issues:**
- Ensure your user can access Docker
- Check file permissions for mounted volumes

## Deployment

### Local Development Deployment

```bash
# Full development setup
git clone <repo>
cd mergers-acquisitions
cp .env.development .env.development.local
# Edit .env.development.local with your credentials
docker-compose -f docker-compose.dev.yml --env-file .env.development.local up --build
```

### Production Deployment

```bash
# Production deployment
cp .env.production .env.production.local
# Edit .env.production.local with production credentials
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up --build -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
```

## Contributing

1. Use the development environment for all development work
2. Test your changes with ephemeral branches
3. Ensure migrations work in both environments
4. Update documentation for any new environment variables

## Support

For issues with:
- **Neon Local**: Check the [Neon Local documentation](https://neon.com/docs/local/neon-local)
- **Neon Cloud**: Visit the [Neon Console](https://console.neon.tech)
- **Application**: Check the application logs and health endpoint

---

**Note**: Never commit real environment variables to version control. Always use `.local` versions of environment files for actual credentials.