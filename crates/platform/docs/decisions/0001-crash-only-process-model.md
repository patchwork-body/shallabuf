# 0001. Crash-only process model

> If you can’t do what you want to do, die.
>
> — Joe Armstrong, [*Making reliable distributed systems in the presence of software errors*](https://erlang.org/download/armstrong_thesis_2003.pdf), 2003

- **Status:** Proposed
- **Date:** 2026-09-27

## Context

The platform runs as many identical nodes behind a load balancer and scales horizontally.
Eventually a long-running network service will reach states it wasn't designed for:

- a dependency drops;
- a bug corrupts shared in-memory state;
- a task panics.

There are two common ways to respond:

- repair the state inside the running process;
- throw the process away and start a fresh one.

In-process recovery code is the least-tested code in any system.
It runs rarely, under conditions that are hard to reproduce,
and it has to deal with partially broken state.

Startup code, by contrast, runs on every deploy and in every test.

With many interchangeable nodes, a node that crashes costs little:
its clients reconnect to the other nodes within seconds.
A node that stays up in a broken state costs much more:
the load balancer keeps sending it new clients,
and each of them gets wrong or missing results.

## Decision

The platform is crash-only:
the only way to recover from a failure is to stop and start again,
and the only way to stop is to crash.

1. **The failure unit is the smallest thing that owns the broken state.**
   - Per-connection state is broken
     (bad frame, handshake timeout, peer not reading, panic in the connection task):
     that connection's task ends. Other connections are unaffected.

   - Shared, process-wide state is broken
     (a critical background task died, a required dependency is gone, an invariant is violated):
     the process exits with a non-zero status, and the supervisor restarts it.

   For panics, this means:
    - A panic in the main path kills the process, which then gets restarted.
    - A panic in one connection kills only that connection.

2. **No repair loops.**
   Code does not rebuild shared state, re-initialise subsystems, or reconnect indefinitely.
   Retrying is allowed only when the failure is transient *and* retrying needs no repair.
   For example:

   ```text
   loop:
       accept a new connection
       on "too many open files":     // clears on its own as other connections close
           wait briefly, try again   // allowed: nothing to repair

   on lost dependency:
       recreate the client, resubscribe, rebuild caches   // not allowed: this is repair, exit instead (rule 6)
   ```

3. **Startup is the recovery path.**
   Everything the node needs is set up and checked at startup:
   config, the listening port, and connections to dependencies.
   Any failure there is fatal. There is no separate "recover" code path.

4. **Correctness never depends on a clean shutdown.**
   The node must be correct if it is SIGKILLed at any instant.
   The graceful shutdown on SIGTERM/SIGINT
   (telling clients to reconnect, waiting for open connections to finish)
   is a courtesy that makes deploys smoother,
   not something other components may rely on.

5. **Crash by returning an error from `main`, not with `std::process::exit`.**
   Calling exit directly is forbidden.
   Returning lets destructors run, including the log writer's, which flushes buffered logs;
   without it, the log lines explaining the crash are lost.

6. **A required dependency that stays unavailable past a bounded grace period is fatal.**
   Client libraries' built-in reconnects may absorb short blips.
   Past the grace period, the node exits instead of serving in a degraded state.

## Alternatives considered

- **Self-healing in process**
  (supervision trees inside the process, re-initialising subsystems, retrying forever).
  Rejected: this is exactly the rare, hard-to-test code described above,
  and a node that heals incorrectly keeps serving wrong results.
  The horizontal fleet already provides redundancy at the process level.

- **`panic = "abort"` in the release profile.**
  It guarantees that any panic kills the process.
  Rejected: a panic triggered by one client's input would disconnect every client on the node,
  and because any client can send that input to every node,
  a single panic bug becomes a fleet-wide remote kill switch.
  Abort also skips destructors, so buffered logs are lost.
  Instead, tokio contains panics in per-connection tasks,
  and panics in critical tasks are escalated explicitly (see Consequences).

- **Degraded mode**
  (keep serving while a dependency is down, e.g. accept connections but drop broadcasts).
  Rejected for now: clients can't tell they are on a broken node,
  and every feature gains a second, rarely exercised code path.

## Consequences

- **The deployment must supervise the process.**
  It must restart the process when it exits,
  take nodes that aren't ready out of the load balancer,
  and kill nodes that stop responding.

- **Critical background tasks need explicit escalation.**
  Tokio catches panics in spawned tasks, so a dead task does not kill the process.
  Any task the node cannot function without must be watched:
  its task handle completing or failing must trigger shutdown and make `main` return an error.

- **All state that matters lives outside the process.**
  In-process state, such as sessions and in-memory CRDT documents,
  must be either rebuildable from external storage or acceptable to lose.

- **Clients must reconnect with capped exponential backoff and jitter.**
  A crash or a deploy disconnects every client on the node at once.
  Backoff means waiting longer after each failed attempt;
  exponential backoff doubles the wait each time.
  This keeps a long outage from turning into constant retry load,
  and the cap keeps clients from waiting long after the service is back.
  Jitter adds a random amount to each wait.
  Without it, clients that disconnected at the same moment also retry at the same moment,
  and the remaining nodes take every round of retries as one spike.
  The first retry comes quickly, so clients of a crashed node are back within seconds.
  Clients must treat a dropped connection as normal, not as an error:
  a node can disappear at any moment, with or without a close frame.

- **Startup must be fast, and crash loops must be visible.**
  Slow startup means a long outage per crash.
  Startup failures (bad config, port in use) produce a crash loop,
  which must show up in monitoring rather than being retried silently.

- **Readiness reflects startup and required dependencies.**
  A node reports ready only once startup has finished,
  and reports not ready while a required dependency is unavailable,
  so the load balancer stops sending it new clients during the grace period.
  Readiness never restarts anything: a node that can't recover exits on its own (rule 6).

- **Liveness only catches hangs.**
  A node that deadlocks can't crash itself,
  so the deployment must kill a node that stops responding.

- **A crashed process can't be inspected afterwards.**
  It is gone by the time anyone looks,
  so everything needed to diagnose it must be recorded before it exits:
  error context, logs, metrics and panic backtraces.

## References

- George Candea, Armando Fox — [*Crash-Only Software*](https://www.usenix.org/conference/hotos-ix/crash-only-software), HotOS IX, 2003
  ([PDF](https://www.usenix.org/legacy/events/hotos03/tech/full_papers/candea/candea.pdf)).
  The paper this decision is named after: the only way to stop is to crash, and the only way to start is to recover.
- Eugene Letuchy — [*Facebook Chat*](https://engineering.fb.com/2008/05/13/web/facebook-chat/), Engineering at Meta, 2008.
  How Facebook built its chat servers in Erlang, chosen partly for its "crash and recover" philosophy.
- Joe Armstrong — [*Making reliable distributed systems in the presence of software errors*](https://erlang.org/download/armstrong_thesis_2003.pdf),
  PhD thesis, KTH, 2003.
  The origin of Erlang's "let it crash": isolate failures, crash the smallest unit, and let a supervisor restart it.
