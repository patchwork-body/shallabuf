FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

################################################################################

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json --bin api

################################################################################

FROM chef AS builder
WORKDIR /build
COPY --from=planner /app/recipe.json recipe.json

ARG BUILD_MODE=release
ARG PKG=api

RUN cargo chef cook $([ "$BUILD_MODE" = "release" ] && echo "--release") --recipe-path recipe.json --bin $PKG
# Copy the entire workspace to handle relative dependencies
COPY . .

# Enable SQLx offline mode for the build
ENV SQLX_OFFLINE=true

RUN --mount=type=cache,target=/build/target \
  --mount=type=cache,target=/usr/local/cargo/registry \
  --mount=type=cache,target=/usr/local/cargo/git \
  set -eux; \
  cargo build $([ "$BUILD_MODE" = "release" ] && echo "--release") --bin $PKG; \
  objcopy --compress-debug-sections target/${BUILD_MODE}/$PKG ./main

################################################################################

FROM docker.io/debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libssl3 && rm -rf /var/lib/apt/lists/*
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /build/main ./

RUN chown appuser:appgroup ./main
USER appuser

# Set default environment variables
ENV LISTEN_ADDR=0.0.0.0:8000
ENV PORT=8000
ENV RUST_ENV=prod
ENV RUST_LOG=info
ENV FRONTEND_URL='https://shallabuf-web.pages.dev'

EXPOSE 8000

CMD ["./main"]
