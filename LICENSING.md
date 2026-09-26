# Licensing

Shallabuf is **source-available**, not open source. Different parts of this
repository are licensed differently, so that you can build on our client SDK
without inheriting any restrictions.

| Path | License | Notes |
| --- | --- | --- |
| `api/`, `db/`, `platform/` | [Elastic License 2.0](LICENSE) | Rust server components |
| `web/` | [Elastic License 2.0](LICENSE) | Web frontend |
| `sdk/` | [Apache License 2.0](sdk/LICENSE) | Client SDK — permissive, embed freely |

## What you may do

Under the Elastic License 2.0, you may **use, copy, modify, distribute, and
self-host** Shallabuf — including for commercial purposes inside your own
company — free of charge. There is no user cap, no revenue threshold, and no
requirement to publish your modifications.

Concretely, all of the following are permitted:

- Running Shallabuf on your own infrastructure for your own product.
- Running it internally for your employees or customers.
- Modifying it, forking it, and deploying your changes.
- Redistributing it, as long as recipients also get a copy of these terms.

## What you may not do

There is essentially one restriction:

> You may not provide the software to third parties as a hosted or managed
> service, where the service provides users with access to any substantial set
> of the features or functionality of the software.

In other words: you can run Shallabuf *for yourself*, but you cannot resell
Shallabuf-as-a-service to others. Two smaller conditions also apply — you may
not circumvent license key functionality, and you may not strip copyright or
license notices.

## Commercial licensing

The hosting restriction above is waivable. If you want to offer Shallabuf as a
hosted or managed service — whether you are a cloud provider, a platform
vendor, or a consultancy packaging it for clients — we are open to negotiating
a separate commercial license.

Contact: **patchwork-body@proton.me**

A commercial agreement supersedes the Elastic License 2.0 for the parties and
scope it covers. Nothing in this file modifies the Elastic License 2.0 itself;
[LICENSE](LICENSE) is the controlling document.

## Client SDK

The packages under `sdk/` (`@shallabuf/core`, `@shallabuf/react`) are Apache
2.0 licensed on purpose. Integrating them into your application does **not**
subject your application to the Elastic License 2.0, and does not require legal
review on your side.

## Contributions

Contributions to the Elastic License 2.0 portions of this repository are
accepted under those same terms.
