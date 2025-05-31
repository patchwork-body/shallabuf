# Fly.io Deployment with GitHub Actions

This guide explains how to set up continuous deployment to Fly.io using GitHub Actions for your multi-component application.

## Overview

The GitHub Actions workflow (`deploy.yml`) automatically deploys your application components to Fly.io when changes are pushed to the main branch. It includes:

- **Smart deployment**: Only deploys components that have changed
- **Multi-component support**: Handles API, Platform, Web, and NATS services
- **Manual deployment**: Option to deploy all components manually
- **Concurrency control**: Prevents multiple deployments from running simultaneously

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Fly.io CLI**: Install locally for initial setup
3. **GitHub Repository**: Your code should be in a GitHub repository
4. **Fly.io Apps**: Each component (api, platform, web, nats) should have its own Fly.io app

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

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Initialize Fly.io Apps (if not already done)

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

### 4. Generate Fly.io Deploy Token

Create a deploy token that GitHub Actions can use:

```bash
fly tokens create deploy
```

Copy the generated token (including the `FlyV1` prefix).

### 5. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FLY_API_TOKEN`
5. Value: Paste the token from step 4
6. Click **Add secret**

### 6. Configure Workflow Triggers (Optional)

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

### Change Detection

The workflow uses path filtering to detect which components have changed:

- **API**: Changes in `api/` directory or root `Cargo.toml`/`Cargo.lock`
- **Platform**: Changes in `platform/` directory or root `Cargo.toml`/`Cargo.lock`
- **Web**: Changes in `web/` directory
- **NATS**: Changes in `nats/` directory

### Deployment Jobs

Each component has its own deployment job that:

1. Checks out the code
2. Sets up the Fly.io CLI
3. Deploys using the component's `fly.toml` configuration
4. Uses `--remote-only` flag for faster builds

### Manual Deployment

You can manually deploy all components:

1. Go to **Actions** tab in your GitHub repository
2. Click **Deploy to Fly.io** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Monitoring Deployments

### GitHub Actions

1. Go to **Actions** tab in your repository
2. Click on a workflow run to see detailed logs
3. Each component deployment shows as a separate job

### Fly.io Dashboard

1. Visit [fly.io/dashboard](https://fly.io/dashboard)
2. Monitor your applications' status and logs
3. Use `fly logs` command for real-time log streaming

### Command Line Monitoring

```bash
# Check app status
fly status -a your-app-name

# View logs
fly logs -a your-app-name

# Monitor deployments
fly releases -a your-app-name
```

## Troubleshooting

### Common Issues

1. **"App not found" error**

   - Ensure `fly.toml` files exist in each component directory
   - Verify app names in `fly.toml` match your Fly.io dashboard

2. **"Unauthorized" error**

   - Check that `FLY_API_TOKEN` secret is set correctly
   - Ensure the token hasn't expired

3. **Build failures**

   - Check the GitHub Actions logs for specific error messages
   - Verify Docker configurations in each component

4. **Deployment timeouts**
   - Increase timeout in `fly.toml` if needed
   - Check Fly.io status page for service issues

### Debug Commands

```bash
# Test local deployment
cd api
fly deploy --config fly.toml

# Validate fly.toml configuration
fly validate

# Check app configuration
fly config show -a your-app-name
```

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
  needs: changes
  if: github.event_name == 'push' && needs.changes.outputs.new-component == 'true'
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

1. Create separate Fly.io apps for each environment
2. Use different `fly.toml` files or environment variables
3. Add branch-specific triggers:

```yaml
on:
  push:
    branches:
      - main # production
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

## Security Best Practices

1. **Use deploy tokens**: Never use your personal auth token for CI/CD
2. **Limit token scope**: Deploy tokens have limited permissions
3. **Rotate tokens regularly**: Set expiration dates and rotate tokens
4. **Environment separation**: Use different apps for staging/production
5. **Secrets management**: Store sensitive data in GitHub Secrets

## Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fly.io GitHub Actions](https://github.com/superfly/flyctl-actions)
- [Fly.io Community](https://community.fly.io/)
