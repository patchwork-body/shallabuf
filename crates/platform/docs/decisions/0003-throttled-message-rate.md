# 0003. Throttled message rate per connection

> It is unacceptable for the component under stress to fail catastrophically
> or to drop messages in an uncontrolled fashion.
> Since it can’t cope and it can’t fail
> it should communicate the fact that it is under stress to upstream components
> and so get them to reduce the load.
>
> — Jonas Bonér, Dave Farley, Roland Kuhn and Martin Thompson, [*The Reactive Manifesto*](https://www.reactivemanifesto.org/glossary#Back-Pressure), 2014

- **Status:** Accepted
- **Proposed:** 2026-09-28
- **Accepted:** 2026-10-03

## Context

[0002](0002-bounded-uncompressed-websocket-traffic.md) caps how big each message can be,
but not how many messages a client can send.
So one message can't overload a node, but many can:
each one costs CPU to parse, check and fan out,
and a client sending as fast as it can takes CPU from every other connection on its node.

The forces:

- Clients don't send at a steady rate.
  A paste or a resync after a reconnect sends many messages at once,
  and a limit must let those bursts through.
- Messages are CRDT updates.
  Dropping one leaves the document in a broken state nobody can detect.
- The check runs on every message,
  so it can't wait on a store shared between nodes.
  Each connection has to be limited on its own.

## Decision

1. **Each connection has a token bucket.**
   The bucket holds up to *B* tokens and refills at *R* tokens per second.
   Every message read costs one token. The bucket starts full.

   With *B* = 100 and *R* = 20:

   | Client behavior         | What happens                                                                                                           |
   |-------------------------|------------------------------------------------------------------------------------------------------------------------|
   | Steady 10 messages/s    | The bucket refills faster than it drains; nothing is ever slowed                                                       |
   | 100 messages at once    | Will empty the bucket; the 101st message will wait (1 ÷ *R* = 50ms)                                                    |
   | Sustained 50 messages/s | The bucket drains at 30/s (faster than it refills) and is empty after ~3.3s; then each message waits (1 ÷ *R* = 50ms)  |
   | Quiet for 5s            | If the bucket was empty, it'll fully refill again (*B* ÷ *R* = 5s)                                                     |

   Over any *T* seconds, a client gets at most *B* + *R* × *T* messages through.

2. **A client over its rate is slowed down, not disconnected.**
   When the bucket is empty, the node waits for the next token before reading the next message.
   Unread data stays in the socket, and TCP flow control slows the client down.
   No message is dropped, and nothing is closed.

3. **Messages are counted, not bytes.**
   [0002](0002-bounded-uncompressed-websocket-traffic.md) already bounds each message's size,
   so bytes per second are bounded too: at most *R* × the maximum message size.

4. **The limit is per connection.**
   The bucket lives in the connection's own task, as two numbers:
   the current tokens and the time of the last refill.

5. ***R* and *B* are mandatory configuration**,
   like every other limit ([0002](0002-bounded-uncompressed-websocket-traffic.md), rule 6).

## Alternatives considered

- **A fixed window** (at most *N* messages per calendar second).
  Rejected: a client can send *N* at the end of one second and *N* more at the start of the next,
  twice the limit in a moment.
  A token bucket has no window edges.

- **A sliding window log** (remember the time of every recent message).
  Rejected: exact, but it stores one timestamp per message,
  so memory per connection grows with the limit.

- **A leaky bucket** (queue messages and process them at a fixed rate).
  Rejected: it allows no bursts, so a paste is always delayed,
  and the queue itself is memory the node has to hold.

- **Closing the connection when a client exceeds its rate.**
  Rejected: real users send bursts,
  and closing would disconnect them for normal behavior.

- **Dropping messages over the rate.**
  Rejected: it leaves gaps in the CRDT stream.

- **Rate limits per user, per IP or per app, shared across nodes.**
  Rejected for now: every message would wait on a store shared between nodes.
  A per-connection rate
  and the connection cap from [0002](0002-bounded-uncompressed-websocket-traffic.md)
  already bound what one node does;
  limits across nodes, if needed, belong at the edge.

- **Counting bytes instead of messages.**
  Rejected: CPU cost is driven mostly by the number of messages,
  and bytes are already bounded through the message size limit.

## Consequences

- **CPU per node has a known ceiling.**
  Each connection sends at most *R* messages per second, plus bursts of up to *B*.
  At *R* = 20, a node with 10,000 connections handles at most 200,000 messages/s,
  so its CPU can be sized up front.

- **A throttled client sees latency, not errors.**
  A flooding client only slows itself down, and can't take CPU from other clients on its node.

- **Throttling never looks like a dead connection.**
  A paused read waits at most 1 ÷ *R* seconds for the next token (50ms at *R* = 20).
  That wait must stay below the peer timeout from [0002](0002-bounded-uncompressed-websocket-traffic.md).

- **Clients should batch their updates.**
  A client that sends one message per keystroke will hit the rate during fast typing.
  CRDT updates can be merged, so the SDK should combine them into fewer, larger messages.

## References

- [*Token bucket*](https://en.wikipedia.org/wiki/Token_bucket), Wikipedia.
  The algorithm, and how it differs from a leaky bucket.
- The Go Authors — [*Package rate*](https://pkg.go.dev/golang.org/x/time/rate#Limiter).
  The whole algorithm in one sentence: a bucket of size *b*, initially full, refilled at *r* tokens per second.
  Its `Wait` blocks until a token arrives instead of rejecting the event, as rule 2 does.
- Linux man-pages — [*tc-tbf(8)*](https://man7.org/linux/man-pages/man8/tc-tbf.8.html).
  The kernel's token bucket for network traffic.
  When the bucket is empty, it holds packets back until tokens arrive, as rule 2 holds back reads.
- OWASP — [*WebSocket Security Cheat Sheet: Denial-of-Service Protection*](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html#denial-of-service-protection).
  Recommends rate limiting to prevent message flooding.
