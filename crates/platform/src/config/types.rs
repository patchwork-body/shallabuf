use std::time::Duration;

use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct NonZeroDuration(Duration);

impl NonZeroDuration {
    pub const fn new(duration: Duration) -> Option<Self> {
        if duration.is_zero() {
            None
        } else {
            Some(Self(duration))
        }
    }

    pub const fn get(self) -> Duration {
        self.0
    }
}

#[derive(Error, Debug, PartialEq, Eq)]
#[error("must be greater than zero")]
pub struct ZeroDuration;

impl TryFrom<Duration> for NonZeroDuration {
    type Error = ZeroDuration;

    fn try_from(duration: Duration) -> Result<Self, Self::Error> {
        Self::new(duration).ok_or(ZeroDuration)
    }
}
