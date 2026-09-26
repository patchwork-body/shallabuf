use std::time::Duration;

use serde::{Deserialize, Deserializer, de::Error};

/// Deserializes a (possibly fractional) number of seconds into a `Duration`,
/// for use with `#[serde(deserialize_with = "...")]`.
///
/// # Errors
///
/// Fails if the value is not a non-negative, finite number of seconds.
pub fn deserialize_secs<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Duration, D::Error> {
    let secs = f64::deserialize(deserializer)?;
    Duration::try_from_secs_f64(secs).map_err(|e| D::Error::custom(format!("{secs}: {e}")))
}
