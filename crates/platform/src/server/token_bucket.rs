use std::time::Duration;

use tokio::time::Instant;

/// The per-connection token bucket. Every message read costs one token,
/// and one token comes back every `token_interval`, up to `capacity`.
pub(super) struct TokenBucket {
    /// Tokens available right now.
    tokens_left: u32,

    /// Most tokens the bucket holds.
    capacity: u32,

    /// How long one token takes to come back.
    token_interval: Duration,

    /// When the token being earned now started accruing.
    last_refill_at: Instant,
}

impl TokenBucket {
    /// Whole tokens earned since `last_refill_at`, at most `capacity`.
    fn tokens_earned(&self, now: Instant) -> u32 {
        let earned = self.last_refill_at.saturating_duration_since(now).as_nanos() / (self.token_interval.as_nanos());

        u32::try_from(earned).unwrap_or(u32::MAX).min(self.capacity)
    }

    /// Adds the tokens earned since `last_refill_at`, up to `capacity`.
    fn refill(&mut self, now: Instant) {
        let new_tokens = self.tokens_earned(now);

        if new_tokens == 0 {
            return;
        }

        self.tokens_left = self
            .tokens_left
            .saturating_add(new_tokens)
            .min(self.capacity);

        self.last_refill_at = if self.tokens_left == self.capacity {
            Instant::now()
        } else {
            self.last_refill_at + self.token_interval * new_tokens
        };
    }

    /// A full bucket holding `capacity` tokens, refilled at `refill_rate` tokens per second.
    pub(super) fn new(capacity: u32, refill_rate: u32) -> Self {
        Self {
            capacity,
            tokens_left: capacity,
            // above 10⁹/s the interval rounds down to 0 ns, and 1 ns is effectively unlimited
            token_interval: (Duration::from_secs(1) / refill_rate).max(Duration::from_nanos(1)),
            last_refill_at: Instant::now(),
        }
    }

    /// Takes a token if one is left.
    /// Returns:
    /// - `None` when a token was taken,
    /// - Some(wait duration for the next token) when the bucket is empty.
    pub(super) fn try_consume(&mut self) -> Option<Duration> {
        let now = Instant::now();
        self.refill(now);

        if self.tokens_left > 0 {
            self.tokens_left -= 1;

            return None;
        }

        Some(
            self.token_interval
                .saturating_sub(self.last_refill_at.saturating_duration_since(now)),
        )
    }

    /// Waits until a token is left, then takes it.
    /// Cancel-safe: dropped while waiting, it takes nothing.
    pub(super) async fn consume(&mut self) {
        while let Some(wait) = self.try_consume() {
            tokio::time::sleep(wait).await;
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;
    use tokio::time::{Instant, advance};

    use super::TokenBucket;

    const CAPACITY: u32 = 3;
    const RATE: u32 = 20;
    const INTERVAL: Duration = Duration::from_millis(50); // 1s / RATE

    fn empty_bucket(bucket: &mut TokenBucket) {
        for _ in 0..CAPACITY {
            assert_eq!(bucket.try_consume(), None);
        }
    }

    #[tokio::test(start_paused = true)]
    async fn starts_full() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
    }

    #[tokio::test(start_paused = true)]
    async fn empty_bucket_waits_one_interval() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        assert_eq!(bucket.try_consume(), Some(INTERVAL));
    }

    #[tokio::test(start_paused = true)]
    async fn wait_shrinks_as_time_passes() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        advance(Duration::from_millis(20)).await;

        assert_eq!(bucket.try_consume(), Some(Duration::from_millis(30)));
    }

    #[tokio::test(start_paused = true)]
    async fn token_comes_back_after_one_interval() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        advance(INTERVAL).await;

        assert_eq!(bucket.try_consume(), None);
        assert_eq!(bucket.try_consume(), Some(INTERVAL));
    }

    #[tokio::test(start_paused = true)]
    async fn several_tokens_come_back_together() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        advance(INTERVAL * 2).await;

        assert_eq!(bucket.try_consume(), None);
        assert_eq!(bucket.try_consume(), None);
        assert_eq!(bucket.try_consume(), Some(INTERVAL));
    }

    #[tokio::test(start_paused = true)]
    async fn keeps_partial_progress_toward_the_next_token() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        advance(Duration::from_millis(70)).await;

        assert_eq!(bucket.try_consume(), None);
        // 20 of the 70 ms already count toward the next token
        assert_eq!(bucket.try_consume(), Some(Duration::from_millis(30)));
    }

    #[tokio::test(start_paused = true)]
    async fn long_idle_refills_bucket_only_to_capacity() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        advance(Duration::from_hours(1)).await;

        empty_bucket(&mut bucket);
        assert_eq!(bucket.try_consume(), Some(INTERVAL));
    }

    #[tokio::test(start_paused = true)]
    async fn time_spent_when_bucket_is_full_earns_nothing() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        advance(Duration::from_hours(1)).await;

        empty_bucket(&mut bucket);
        assert_eq!(bucket.try_consume(), Some(INTERVAL));
    }

    #[tokio::test(start_paused = true)]
    async fn steady_client_below_rate_is_never_throttled() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        // 10 messages/s for 10s, half the rate
        for _ in 0..100 {
            assert_eq!(bucket.try_consume(), None);
            advance(Duration::from_millis(100)).await;
        }
    }

    #[tokio::test(start_paused = true)]
    async fn client_sending_flat_out_for_one_second_gets_capacity_plus_rate() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);
        let one_second_later = Instant::now() + Duration::from_secs(1);
        let mut sent = 0;

        // the client sends as many messages as it can for one second:
        // it sends while it has tokens, and again the moment the next one arrives
        loop {
            match bucket.try_consume() {
                None => sent += 1,
                Some(wait) if Instant::now() + wait <= one_second_later => advance(wait).await,
                Some(_) => break, // the next token would arrive after the second is over
            }
        }

        // the full bucket, then one token every 1s / RATE
        assert_eq!(sent, CAPACITY + RATE);
    }

    #[tokio::test(start_paused = true)]
    async fn huge_rate_does_not_panic() {
        let mut bucket = TokenBucket::new(1, u32::MAX);

        assert_eq!(bucket.try_consume(), None);
        assert_eq!(bucket.try_consume(), Some(Duration::from_nanos(1)));
        advance(Duration::from_millis(1)).await;
        assert_eq!(bucket.try_consume(), None);
    }

    #[tokio::test(start_paused = true)]
    async fn huge_capacity_does_not_overflow() {
        let mut bucket = TokenBucket::new(u32::MAX, 1);

        bucket.try_consume();
        advance(Duration::from_secs(2)).await;

        assert_eq!(bucket.try_consume(), None);
    }

    #[tokio::test(start_paused = true)]
    async fn consume_does_not_wait_until_bucket_is_empty() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);
        let start = Instant::now();

        for _ in 0..CAPACITY {
            bucket.consume().await;
        }

        assert_eq!(start.elapsed(), Duration::ZERO);
    }

    #[tokio::test(start_paused = true)]
    async fn consume_waits_for_the_next_token_and_takes_it() {
        let mut bucket = TokenBucket::new(CAPACITY, RATE);

        empty_bucket(&mut bucket);
        let start = Instant::now();
        bucket.consume().await;

        assert_eq!(start.elapsed(), INTERVAL);
        // the token that arrived was taken, not left for the next read
        assert_eq!(bucket.try_consume(), Some(INTERVAL));
    }
}
