# syntax=docker/dockerfile:1
#
# Build context is the workspace root. See the root .dockerignore.
#
#   docker buildx build --allow network.host \
#     -f crates/platform/Dockerfile -t shallabuf-platform .
#
#   docker run --rm --network=host --env-file crates/platform/.env \
#     shallabuf-platform
#
# --allow network.host is mandatory.

# Kept in lockstep with rust-toolchain.toml.
ARG RUST_VERSION=1.96.0

###############################  STAGE 1 · chef  ###############################

FROM lukemathwalker/cargo-chef:latest-rust-${RUST_VERSION} AS chef

ARG RUST_VERSION
ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

ENV CARGO_INCREMENTAL=0 \
  CARGO_NET_RETRY=10 \
  CARGO_TERM_COLOR=never

WORKDIR /build

#############################  STAGE 2 · planner  ##############################
#
# Dependency graph only.

FROM chef AS planner

COPY . .

RUN cargo chef prepare --recipe-path recipe.json

#############################  STAGE 3 · builder  ##############################

FROM chef AS builder
ARG PKG=platform

COPY --from=planner /build/recipe.json recipe.json
RUN --network=host \
  cargo chef cook --release --locked --recipe-path recipe.json --bin "${PKG}"

COPY . .

# Resolve sqlx::query! against the checked-in .sqlx/ metadata.
ENV SQLX_OFFLINE=true

RUN --network=host \
  set -eux; \
  cargo build --release --locked --bin "${PKG}"; \
  objcopy --compress-debug-sections "target/release/${PKG}" /build/main

#############################  STAGE 4 · runtime  ##############################
#
# No HEALTHCHECK - dockerd never acts on it; liveness is the supervisor's job.

FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

LABEL org.opencontainers.image.title="shallabuf-platform" \
  org.opencontainers.image.description="Shallabuf realtime WebSocket platform" \
  org.opencontainers.image.licenses="Elastic-2.0" \
  org.opencontainers.image.source="https://github.com/patchwork-body/shallabuf"

WORKDIR /app

# 65532 is distroless' nonroot user; a numeric id needs no /etc/passwd.
COPY --from=builder --chown=65532:65532 /build/main /app/main

ENV PORT=8443 \
  RUST_ENV=prod \
  RUST_LOG=info

EXPOSE 8443

USER 65532:65532

ENTRYPOINT ["/app/main"]
