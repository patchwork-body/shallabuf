FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

################################################################################

FROM chef AS planner
# Copy workspace configuration
COPY Cargo.toml Cargo.lock ./
# Copy all workspace member Cargo.toml files for dependency resolution
COPY api/Cargo.toml ./api/
COPY db/Cargo.toml ./db/
COPY platform/Cargo.toml ./platform/
COPY cron/Cargo.toml ./cron/
RUN cargo chef prepare --recipe-path recipe.json --bin platform

################################################################################

FROM chef AS builder
WORKDIR /build
COPY --from=planner /app/recipe.json recipe.json

ARG BUILD_MODE=release
ARG PKG=platform

RUN cargo chef cook $([ "$BUILD_MODE" = "release" ] && echo "--release") --recipe-path recipe.json --bin $PKG
# Copy the entire workspace to handle relative dependencies
COPY . .

RUN --mount=type=cache,target=/build/target \
  --mount=type=cache,target=/usr/local/cargo/registry \
  --mount=type=cache,target=/usr/local/cargo/git \
  set -eux; \
  cargo build $([ "$BUILD_MODE" = "release" ] && echo "--release") --bin $PKG; \
  objcopy --compress-debug-sections target/${BUILD_MODE}/$PKG ./main

################################################################################

FROM docker.io/debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /build/main ./

RUN chown appuser:appgroup ./main
USER appuser

# Set default environment variables
ENV PORT=8443
ENV RUST_ENV=prod
ENV RUST_LOG=info

EXPOSE 8443

CMD ["./main"]
