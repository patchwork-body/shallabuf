# Load environment variables from .env file if it exists
set dotenv-load

# Export environment variables with defaults
export POSTGRES_USER := env_var_or_default("POSTGRES_USER", "shallabuf")
export POSTGRES_PASSWORD := env_var_or_default("POSTGRES_PASSWORD", "secret")
export POSTGRES_DB := env_var_or_default("POSTGRES_DB", "shallabuf")
export POSTGRES_HOST := env_var_or_default("POSTGRES_HOST", "localhost")
export POSTGRES_PORT := env_var_or_default("POSTGRES_PORT", "30432")
export DATABASE_URL := env_var_or_default("DATABASE_URL", "postgresql://" + POSTGRES_USER + ":" + POSTGRES_PASSWORD + "@" + POSTGRES_HOST + ":" + POSTGRES_PORT + "/" + POSTGRES_DB)

# Default recipe to show help
default:
    @just --list

# Install Rust tools
install-rust-tools:
    cargo install cargo-make
    cargo make install-tools

# Install Bun using asdf
install-bun:
    #!/usr/bin/env sh
    if command -v bun &> /dev/null; then
        echo "Bun is already installed"
        exit 0
    fi
    if ! command -v asdf &> /dev/null; then
        echo "asdf is not installed. Please install it first: https://asdf-vm.com/"
        exit 1
    fi
    asdf plugin add bun || true
    asdf install bun latest
    asdf global bun latest

# Install all required tools and dependencies
install-tools: install-rust-tools
    @echo "Run 'just install-bun' if you need to install bun via asdf"
    brew install minio/stable/mc || echo "Please install MinIO Client (mc) manually: https://min.io/docs/minio/linux/reference/minio-mc.html"

# Create .env file if it doesn't exist
create-env:
    #!/usr/bin/env sh
    if [ ! -f .env ]; then
        if [ ! -f .env.example ]; then
            echo "Error: .env.example file not found"
            exit 1
        fi
        echo "Creating .env file from .env.example..."
        cp .env.example .env
    else
        echo ".env file already exists"
    fi

# Start all Docker containers
docker-up: create-env
    docker compose up -d

# Stop all Docker containers
docker-down:
    docker compose down

# Wait for PostgreSQL to be ready
wait-for-db:
    #!/usr/bin/env sh
    echo "Waiting for PostgreSQL to be ready..."
    until psql "{{DATABASE_URL}}" -c '\q' 2>/dev/null; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 1
    done
    echo "PostgreSQL is up and ready!"

# Run database migrations
migrate: wait-for-db
    cd db && sqlx database create --database-url="{{DATABASE_URL}}"
    cd db && sqlx migrate run --database-url="{{DATABASE_URL}}"

# Prepare sqlx offline mode
sqlx-prepare:
    cargo sqlx prepare --workspace --database-url="{{DATABASE_URL}}"

# Seed the database with initial data
seed: wait-for-db
    cargo run -p db --bin seed --features seed

# Setup MinIO with proper access keys
setup-minio:
    #!/usr/bin/env sh
    echo "Setting up MinIO..."
    # Wait for MinIO to be ready
    until curl -sf http://localhost:${MINIO_PORT}/minio/health/ready; do
        echo "Waiting for MinIO to be ready..."
        sleep 1
    done
    # Configure MinIO client with root credentials
    mc alias set local http://localhost:${MINIO_PORT} ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

    # Create builtins bucket and enable versioning
    mc mb local/builtins --ignore-existing
    mc version enable local/builtins

    # Create an access key and store the credentials
    echo "Creating access key..."
    CREDENTIALS=$(mc admin user svcacct add local ${MINIO_ROOT_USER} --access-key $(openssl rand -hex 8))
    echo "Generated credentials:"
    echo "$CREDENTIALS"

    # Extract access key and secret key from plain text output
    ACCESS_KEY=$(echo "$CREDENTIALS" | grep "Access Key:" | cut -d' ' -f3)
    SECRET_KEY=$(echo "$CREDENTIALS" | grep "Secret Key:" | cut -d' ' -f3)
    echo "Extracted ACCESS_KEY: $ACCESS_KEY"
    echo "Extracted SECRET_KEY: $SECRET_KEY"

    # Update the .env file using perl (works on macOS)
    perl -pi -e "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=$ACCESS_KEY|" .env
    perl -pi -e "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$SECRET_KEY|" .env

    echo "Updated .env file. Verifying contents:"
    grep MINIO_ .env

    # Create placeholder WASM files
    mkdir -p builtins
    dd if=/dev/zero of=builtins/echo.wasm bs=1024 count=1
    dd if=/dev/zero of=builtins/text-transformer.wasm bs=1024 count=1
    dd if=/dev/zero of=builtins/btc-price.wasm bs=1024 count=1
    echo "MinIO setup complete with new access keys and builtins bucket"

# Setup database (create, migrate, and seed)
setup-db: setup-minio
    #!/usr/bin/env sh
    # Source the updated .env file
    set -a
    source .env
    set +a
    echo "Environment reloaded with MinIO credentials:"
    echo "MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}"
    echo "MINIO_SECRET_KEY=${MINIO_SECRET_KEY}"
    just migrate
    just sqlx-prepare
    just seed

# Install frontend dependencies
setup-frontend:
    cd web && bun install

# Start the Next.js development server
dev-frontend: setup-frontend
    cd web && bun dev

# Start all Rust services in watch mode using cargo-make
dev-backend:
    cargo make watch-all

# Start everything in development mode
dev: docker-up setup-db
    #!/usr/bin/env sh
    trap 'kill 0' INT
    just dev-frontend & just dev-backend
    wait

# Clean up everything (stop docker, clean database, etc.)
clean: docker-down
    rm -rf target/
    rm -rf web/node_modules/
    rm -rf web/.next/
    rm -rf web/bun.lockb

# Run all tests
test:
    cargo make test-all
    cd web && bun test

# Format all code (Rust and TypeScript)
fmt:
    cargo make fmt
    cd web && bun run format

# Lint all code
lint:
    cargo make lint
    cd web && bun run lint
