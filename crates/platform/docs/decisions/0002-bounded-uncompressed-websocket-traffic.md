# 0002. Bounded, uncompressed WebSocket traffic

> Time and experience show that negative consequences to interoperability
> accumulate over time if implementations silently accept faulty input.
>
> — Martin Thomson and David Schinazi, [*RFC 9413: Maintaining Robust Protocols*](https://www.rfc-editor.org/rfc/rfc9413), 2023

- **Status:** Accepted
- **Proposed:** 2026-09-28
- **Accepted:** 2026-10-01

## Context

A node has finite memory, and it serves clients it can't trust.
Whatever one client can make a node hold,
many clients can make every node hold at once.
So for everything a client can make a node hold,
the node must know the most it can ever be.

A client can make a node hold memory in several ways:

- **Connecting.**
  Every open connection costs memory, whether it's used or not.
- **Vanishing.**
  A client that disappears without closing (a dropped mobile network, a closed laptop)
  keeps its connection open on the node until something notices.
- **Sending big messages.**
  A WebSocket message can be almost any size,
  and the node must hold all of it before it can read it.
- **Not reading.**
  Everything the node sends to a client that has stopped reading piles up on the node.
- **Sending compressed data.**
  A compressed message is small on the wire but can expand to almost any size,
  so its real size isn't known until the node has already paid for it.
  Compressing secrets together with data an attacker controls also leaks the secrets
  through the compressed size (the CRIME and BREACH attacks).

Our messages are small and frequent,
so compression would save little anyway.

## Decision

1. **No compression.**
   The node never compresses or decompresses messages:
   not through a WebSocket extension (`permessage-deflate`),
   and not inside the protocol's own messages.
   A message is exactly as big as it looks on the wire.

2. **A node accepts a maximum number of connections.**
   When it's full, it rejects new connections before the WebSocket upgrade
   with HTTP 503 (Service Unavailable),
   and the client tries again with backoff ([0001](0001-crash-only-process-model.md)).

3. **Incoming messages have a maximum size.**
   Each connection has a maximum frame size and a maximum message size,
   set from the largest message the protocol legitimately sends.
   A peer that exceeds either limit has its connection closed with code 1009 (Message Too Big).

4. **Data waiting for a slow reader has a maximum size and age.**
   Unsent data per connection is bounded in size, and a stalled send is bounded in time.
   A peer that stops reading has its connection closed.

5. **Dead connections are detected and closed.**
   The node sends a ping at a fixed interval (e.g. every 25s).
   If nothing arrives from the client for longer than a timeout (e.g. 60s), not even a pong,
   the node closes the connection.
   A quiet but live client stays connected: browsers answer pings on their own, even in a background tab.

6. **Limits are mandatory configuration.**
   No limit has a default:
   if one is missing, or set to a value that turns it off (e.g. `0`),
   the node refuses to start.
   A misconfigured node fails loudly at startup ([0001](0001-crash-only-process-model.md))
   instead of running with a limit nobody chose.

## Alternatives considered

- **Compression with a fresh dictionary per message** (no "context takeover").
  Secrets and attacker-controlled data are then never compressed together.
  Rejected: a message's real size is still unknown until it's decompressed,
  every message costs extra CPU, and small messages barely shrink.

- **No connection limit; add nodes when load grows.**
  Rejected: autoscaling reacts in minutes,
  while a burst of connections can fill a node in seconds.
  A full node that turns clients away lets the load balancer send them elsewhere;
  a node that accepts them all runs out of memory and drops everyone.

- **The WebSocket library's default limits.**
  Rejected: they are tuned for general use,
  with messages of tens of MiB and no bound on outbound buffers,
  so a handful of clients could exhaust a node's memory.

- **Dropping outbound messages for slow readers.**
  Rejected: a CRDT update stream with gaps leaves the client in a broken state it can't detect,
  while closing the connection forces a clean resync.

- **Closing quiet connections (an idle timeout on application messages).**
  Rejected: a user reading a document sends nothing but still needs live updates.
  A quiet connection costs no more than any other,
  and the connection cap already bounds how many a node holds.

- **Relying on TCP keepalive to detect dead connections.**
  Rejected: with default settings it takes hours to notice,
  and a proxy between the client and the node can keep its side of the connection open.

## Consequences

- **Memory per node has a known ceiling.**
  Each connection can use at most one full incoming message and one full outgoing backlog,
  and a node holds at most its maximum number of connections.
  Even if every connection hits both limits at once,
  a node can't use more than their product
  (e.g. 2 MiB × 10,000 connections ≈ 20 GiB).
  Normal use is far below the ceiling,
  but machines must be sized for it, or an attacker can still exhaust them.

- **A dead connection holds its slot for at most the peer timeout.**
  The ping interval must also be shorter than the idle timeout of any proxy in front of the node,
  or the proxy closes quiet connections on its own.

- **A full node turns clients away.**
  The load balancer's per-node connection limit must be at or below the node's own,
  so it routes new clients to other nodes before any node has to reject them.
  The node keeps its own limit anyway, as a backstop:
  traffic can bypass the balancer, and the two configs can drift apart.

- **Protocol messages must fit the limits.**
  Any message that grows with the data, such as a full document sync,
  must be split into chunks that each fit under the message limit.

- **Clients must treat close code 1009 as a bug on their side.**
  Reconnecting and sending the same message would fail the same way,
  so the client surfaces an error instead of retrying it.

## References

- Ian Fette, Alexey Melnikov — [*RFC 6455: The WebSocket Protocol*](https://www.rfc-editor.org/rfc/rfc6455#section-10.4), §10.4, 2011.
  The protocol's own warning: a peer can exhaust memory with one huge frame or a long stream of small ones,
  so implementations should limit frame and message sizes.
- Ian Fette, Alexey Melnikov — [*RFC 6455: The WebSocket Protocol*](https://www.rfc-editor.org/rfc/rfc6455#section-5.5.2), §5.5.2, 2011.
  Ping frames, which "may serve either as a keepalive or as a means to verify that the remote endpoint is still responsive".
- Takeshi Yoshino — [*RFC 7692: Compression Extensions for WebSocket*](https://www.rfc-editor.org/rfc/rfc7692#section-8), §8, 2015.
  The `permessage-deflate` spec, whose security section points to CRIME.
- Juliano Rizzo, Thai Duong — [*CRIME*](https://en.wikipedia.org/wiki/CRIME), Ekoparty, 2012.
  Recovering secrets from the size of compressed, encrypted traffic.
- Yoel Gluck, Neal Harris, Angelo Prado — [*BREACH*](https://breachattack.com/), Black Hat USA, 2013.
  The same attack against compressed HTTP responses.
- OWASP — [*WebSocket Security Cheat Sheet: Denial-of-Service Protection*](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html#denial-of-service-protection).
  The same limits from a security checklist:
  total connections, message size, dead connections, backpressure.
  Its [*WebSocket Protocol Configuration*](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html#websocket-protocol-configuration) section
  recommends disabling `permessage-deflate` for the CRIME/BREACH reason.
- [`tungstenite::protocol::WebSocketConfig`](https://docs.rs/tungstenite/latest/tungstenite/protocol/struct.WebSocketConfig.html).
  The library settings for frame, message and write-buffer limits.
