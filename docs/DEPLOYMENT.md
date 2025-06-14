# Fly.io Deployment with GitHub Actions

This guide explains how to set up continuous deployment to Fly.io using GitHub Actions for your multi-component application with Neon database migrations.

## Overview

The GitHub Actions workflow (`deploy.yml`) automatically deploys your application components to Fly.io when changes are pushed to the main branch. It includes:

- **Database migrations**: Automatically runs SQLx migrations to Neon before deploying services
- **Smart deployment**: Only deploys components that have changed
- **Multi-component support**: Handles API, Platform, Web, and NATS services
- **Manual deployment**: Option to deploy all components manually
- **Concurrency control**: Prevents multiple deployments from running simultaneously

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Neon Account**: Sign up at [neon.tech](https://neon.tech) for PostgreSQL database hosting
3. **Fly.io CLI**: Install locally for initial setup
4. **GitHub Repository**: Your code should be in a GitHub repository
5. **Fly.io Apps**: Each component (api, platform, web, nats) should have its own Fly.io app

## Setup Instructions

### 1. Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Linux/WSL
curl -L https://fly.io/install.sh | sh

# Windows
iwr https://fly.io/install.ps1 -useb | iex
```

### 2. Set up Neon Database

1. Create a Neon project at [console.neon.tech](https://console.neon.tech)
2. Copy your database connection string
3. The connection string format: `postgresql://username:password@host/database?sslmode=require`

### 3. Login to Fly.io

```bash
fly auth login
```

### 4. Initialize Fly.io Apps (if not already done)

For each component, navigate to its directory and run:

```bash
# Example for API component
cd api
fly launch --no-deploy

# Repeat for other components
cd ../platform
fly launch --no-deploy

cd ../web
fly launch --no-deploy

cd ../nats
fly launch --no-deploy
```

This creates `fly.toml` configuration files for each component.

### 5. Generate Fly.io Deploy Token

Create a deploy token that GitHub Actions can use:

```bash
fly tokens create deploy
```

Copy the generated token (including the `FlyV1` prefix).

### 6. Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

   - **Name**: `FLY_API_TOKEN`
   - **Value**: Your Fly.io deploy token from step 5

   - **Name**: `DATABASE_URL`
   - **Value**: Your Neon database connection string

### 7. Configure Workflow Triggers (Optional)

The workflow is configured to run on:

- Push to `main`
- Pull requests to `main` (for validation)
- Manual trigger via GitHub Actions UI

You can modify the triggers in `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
  # Add other branches as needed
```

## How It Works

### Database Migration Process

The deployment process now includes a dedicated database migration step:

1. **Change Detection**: Monitors changes in `db/` directory, `Cargo.toml`, and `Cargo.lock`
2. **Migration Job**: Runs before any service deployment if:
   - Database files have changed, OR
   - API or Platform components have changed (as they depend on the database)
3. **Migration Steps**:
   - Installs Rust toolchain and SQLx CLI
   - Runs `sqlx migrate run` against your Neon database
   - Verifies migration status with `sqlx migrate info`

### Change Detection

The workflow uses path filtering to detect which components have changed:

- **Database**: Changes in `db/` directory or root `Cargo.toml`/`Cargo.lock`
- **API**: Changes in `api/` directory or root `Cargo.toml`/`Cargo.lock`
- **Platform**: Changes in `platform/` directory or root `Cargo.toml`/`Cargo.lock`
- **Web**: Changes in `web/` directory
- **NATS**: Changes in `nats/` directory

### Deployment Jobs

Each component has its own deployment job that:

1. Waits for database migrations to complete successfully
2. Checks out the code
3. Sets up the Fly.io CLI
4. Deploys using the component's `fly.toml` configuration
5. Uses `--remote-only` flag for faster builds

### Manual Deployment

You can manually deploy all components including database migrations:

1. Go to **Actions** tab in your GitHub repository
2. Click **Deploy to Fly.io** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

This will run migrations first, then deploy all services.

## Database Migration Management

### Local Development

For local development with your database:

```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli --no-default-features --features postgres

# Set your database URL (use local or development Neon database)
export DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
# or set DATABASE_URL in .env file

# Run migrations
cd db
sqlx migrate run

# Check migration status
sqlx migrate info

# Create new migration
sqlx migrate add <migration_name>
```

### Migration Files

Your migration files are stored in `db/migrations/` and follow the naming convention:

- `YYYYMMDDHHMMSS_migration_name.up.sql` - Forward migration
- `YYYYMMDDHHMMSS_migration_name.down.sql` - Rollback migration

### Database Schema Updates

When you need to update your database structure:

1. Create a new migration file in `db/migrations/`
2. Write your SQL changes in the `.up.sql` file
3. Write the rollback SQL in the `.down.sql` file
4. Test locally with `sqlx migrate run`
5. Commit and push - the deployment will automatically apply the migration

## Monitoring Deployments

### GitHub Actions

1. Go to **Actions** tab in your repository
2. Click on a workflow run to see detailed logs
3. Database migration shows as a separate job before service deployments
4. Each component deployment shows as a separate job

### Database Migration Logs

The migration job provides detailed output:

- Migration files being applied
- Success/failure status for each migration
- Final migration status verification

### Fly.io Dashboard

1. Visit [fly.io/dashboard](https://fly.io/dashboard)
2. Monitor your applications' status and logs
3. Use `fly logs` command for real-time log streaming

### Neon Dashboard

1. Visit [console.neon.tech](https://console.neon.tech)
2. Monitor database performance and connections
3. View query logs and metrics

### Command Line Monitoring

```bash
# Check app status
fly status -a your-app-name

# View logs
fly logs -a your-app-name

# Monitor deployments
fly releases -a your-app-name

# Check database migration status locally
cd db && sqlx migrate info
```

## Troubleshooting

### Common Issues

1. **"Database connection failed" error**

   - Verify `DATABASE_URL` secret is set correctly in GitHub
   - Ensure Neon database is running and accessible
   - Check if database URL includes `?sslmode=require` for Neon

2. **"Migration failed" error**

   - Check migration SQL syntax
   - Verify migration files are properly named and located in `db/migrations/`
   - Check if migration conflicts with existing schema

3. **"App not found" error**

   - Ensure `fly.toml` files exist in each component directory
   - Verify app names in `fly.toml` match your Fly.io dashboard

4. **"Unauthorized" error**

   - Check that `FLY_API_TOKEN` secret is set correctly
   - Ensure the token hasn't expired

5. **"Build failures" in services**

   - Check if database migration completed successfully first
   - Verify service dependencies on database schema are met

### Debug Commands

```bash
# Test database connection locally
cd db
sqlx migrate info

# Test local migration
sqlx migrate run

# Rollback last migration (if needed)
sqlx migrate revert

# Test local deployment
cd api
fly deploy --config fly.toml

# Validate fly.toml configuration
fly validate

# Check app configuration
fly config show -a your-app-name
```

### Migration Rollback

If you need to rollback a migration in production:

1. **Immediate rollback**: Use `sqlx migrate revert` locally with production DATABASE_URL
2. **Planned rollback**: Create a new migration that undoes the changes
3. **Emergency**: Connect directly to Neon console and manually revert changes

**⚠️ Warning**: Be extremely careful with production database rollbacks. Always backup your data first.

## Customization

### Adding New Components

1. Create a new directory for your component
2. Add a `fly.toml` configuration
3. Update the workflow to include the new component:

```yaml
# Add to the changes job outputs
new-component: ${{ steps.changes.outputs.new-component }}

# Add to the path filter
new-component:
  - 'new-component/**'

# Add a new deployment job
deploy-new-component:
  needs: [changes, migrate-db]
  if: github.event_name == 'push' && needs.changes.outputs.new-component == 'true' && always() && (needs.migrate-db.result == 'success' || needs.migrate-db.result == 'skipped')
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    - name: Setup Fly CLI
      uses: superfly/flyctl-actions/setup-flyctl@master
    - name: Deploy New Component to Fly.io
      run: flyctl deploy --config ./new-component/fly.toml --remote-only
      env:
        FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Environment-Specific Deployments

For staging/production environments:

1. Create separate Neon databases for each environment
2. Use different `DATABASE_URL` secrets for each environment
3. Create environment-specific workflow files or use environment variables
4. Add branch-specific triggers:

```yaml
on:
  push:
    branches:
      - main # production
      - staging # staging
```

### Build Secrets

If your application needs build-time secrets:

1. Add secrets to GitHub repository secrets
2. Pass them to the deployment:

```yaml
- name: Deploy with build secrets
  run: |
    flyctl deploy \
      --config ./api/fly.toml \
      --remote-only \
      --build-secret DATABASE_URL="${{ secrets.DATABASE_URL }}"
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Migration Strategies

#### Blue-Green Deployments

For zero-downtime deployments:

1. Use separate Neon branches for blue/green environments
2. Test migrations on staging branch first
3. Promote staging to production after validation

#### Rolling Updates

For gradual schema changes:

1. Use backward-compatible migrations first
2. Deploy application changes
3. Remove deprecated columns/tables in subsequent migrations

## Security Best Practices

1. **Use deploy tokens**: Never use your personal auth token for CI/CD
2. **Limit token scope**: Deploy tokens have limited permissions
3. **Rotate tokens regularly**: Set expiration dates and rotate tokens
4. **Environment separation**: Use different databases for staging/production
5. **Secrets management**: Store sensitive data in GitHub Secrets
6. **Database security**: Use Neon's built-in security features (SSL, IP restrictions)
7. **Migration review**: Always review migration scripts before deployment
8. **Backup strategy**: Regular backups of production database

## Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Neon Documentation](https://neon.tech/docs)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fly.io GitHub Actions](https://github.com/superfly/flyctl-actions)
- [Fly.io Community](https://community.fly.io/)
- [Neon Community](https://neon.tech/community)
