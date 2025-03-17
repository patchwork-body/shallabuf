# Load environment variables from .env file if it exists
set dotenv-load

# Export environment variables with defaults
export POSTGRES_USER := env_var_or_default("POSTGRES_USER", "shallabuf")
export POSTGRES_PASSWORD := env_var_or_default("POSTGRES_PASSWORD", "secret")
export POSTGRES_DB := env_var_or_default("POSTGRES_DB", "shallabuf")
export POSTGRES_HOST := env_var_or_default("POSTGRES_HOST", "localhost")
export POSTGRES_PORT := env_var_or_default("POSTGRES_PORT", "30432")
export MINIO_PORT := env_var_or_default("MINIO_PORT", "30900")
export MINIO_ROOT_USER := env_var_or_default("MINIO_ROOT_USER", "minio")
export MINIO_ROOT_PASSWORD := env_var_or_default("MINIO_ROOT_PASSWORD", "minioadmin")
export DATABASE_URL := env_var_or_default("DATABASE_URL", "postgresql://" + POSTGRES_USER + ":" + POSTGRES_PASSWORD + "@" + POSTGRES_HOST + ":" + POSTGRES_PORT + "/" + POSTGRES_DB)

# Default recipe to show help
default:
    @just --list

# Install Rust tools
install-rust-tools:
    cd backend && cargo install cargo-make
    cd backend && cargo make install-tools
    cd backend && rustup target add wasm32-wasip2

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
    brew install bufbuild/buf/buf || echo "Please install buf manually: https://buf.build/docs/installation"
    cd frontend && buf dep update
    brew install minio/stable/mc || echo "Please install MinIO Client (mc) manually: https://min.io/docs/minio/linux/reference/minio-mc.html"

# Create .env file if it doesn't exist
create-env:
    #!/usr/bin/env sh
    if [ ! -f .env ]; then
        if [ ! -f backend/.env.example ]; then
            echo "Error: backend/.env.example file not found"
            exit 1
        fi
        echo "Creating .env file from backend/.env.example..."
        cp backend/.env.example .env
    else
        echo ".env file already exists"
    fi

    # Create symlink in backend folder if it doesn't exist
    if [ ! -L backend/.env ]; then
        echo "Creating symlink for .env in backend folder..."
        ln -sf ../.env backend/.env
    else
        echo "Symlink for .env already exists in backend folder"
    fi

# Start all Docker containers
docker-up: create-env
    docker compose --env-file .env up -d

# Stop all Docker containers
docker-down:
    docker compose --env-file .env down

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
    cd backend/db && sqlx database create --database-url="{{DATABASE_URL}}"
    cd backend/db && sqlx migrate run --database-url="{{DATABASE_URL}}"

# Prepare sqlx offline mode
sqlx-prepare:
    cd backend && cargo sqlx prepare --workspace --database-url="{{DATABASE_URL}}"

# Seed the database with initial data
seed: wait-for-db
    cd backend && cargo run -p db --bin seed --features seed

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

    # Build and copy WASM files
    cd backend/builtins && cargo build --bin text-transformer --release --target wasm32-wasip2
    cd backend/builtins && cargo build --bin echo --release --target wasm32-wasip2
    cd backend/builtins && cargo build --bin btc-price --release --target wasm32-wasip2
    cd backend/builtins && cargo build --bin mistralai --release --target wasm32-wasip2

    # Create builtins directory and copy WASM files
    cp ./backend/target/wasm32-wasip2/release/text_transformer.wasm backend/builtins/
    cp ./backend/target/wasm32-wasip2/release/echo.wasm backend/builtins/
    cp ./backend/target/wasm32-wasip2/release/btc_price.wasm backend/builtins/
    cp ./backend/target/wasm32-wasip2/release/mistralai.wasm backend/builtins/

    # Upload WASM files to MinIO
    mc cp backend/builtins/*.wasm local/builtins/

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

# Generate TypeScript code from proto files
generate-proto:
    cd frontend && buf generate ../proto

# Install frontend dependencies
setup-frontend: generate-proto
    cd frontend && bun install

# Start the Next.js development server
dev-frontend: setup-frontend
    cd frontend && bun dev

# Start all Rust services in watch mode using cargo-make
dev-backend:
    cd backend && cargo make watch-all

# Start everything in development mode
dev: docker-up setup-db
    #!/usr/bin/env sh
    trap 'kill 0' INT
    just dev-frontend & just dev-backend
    wait

# Clean up everything (stop docker, clean database, etc.)
clean: docker-down
    rm -rf backend/target/
    rm -rf frontend/node_modules/
    rm -rf frontend/.next/
    rm -rf frontend/bun.lockb

# Run all tests
test:
    cd backend && cargo make test-all
    cd frontend && bun test

# Format all code (Rust and TypeScript)
fmt:
    cd backend && cargo make fmt
    cd frontend && bun run format

# Lint all code
lint:
    cd backend && cargo make lint
    cd frontend && bun run lint
