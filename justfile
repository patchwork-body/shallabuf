components := "api platform"

[private]
_run action *targets:
    #!/usr/bin/env bash
    set -euo pipefail
    targets="{{targets}}"
    if [ -z "$targets" ]; then
        targets="{{components}}"
    fi
    pids=()
    for t in $targets; do
        just "_{{action}}-$t" &
        pids+=($!)
    done
    wait "${pids[@]}"

# Run one or more components in dev mode (parallel). Defaults to all.
dev *targets:
    just _run dev {{targets}}

# Lint one or more components (parallel). Defaults to all.
lint *targets:
    just _run lint {{targets}}

# Format one or more components (parallel). Defaults to all.
fmt *targets:
    just _run fmt {{targets}}

# crates/api
[private]
_dev-api:
    systemfd --no-pid -s http::8080 -- cargo watch -x 'run -p api'

[private]
_lint-api:
    cargo clippy -p api --all-targets --all-features -- -D warnings

[private]
_fmt-api:
    cargo clippy -p api --all-targets --all-features --fix --allow-dirty --allow-staged -- -D warnings
    cargo fmt -p api

# crates/platform
[private]
_dev-platform:
    systemfd --no-pid -s http::8000 -- cargo watch -x 'run -p platform'

[private]
_lint-platform:
    cargo clippy -p platform --all-targets --all-features -- -D warnings

[private]
_fmt-platform:
    cargo clippy -p platform --all-targets --all-features --fix --allow-dirty --allow-staged -- -D warnings
    cargo fmt -p platform
