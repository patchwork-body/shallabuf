use std::{fmt::Display, num::NonZeroUsize, time::Duration};

use serde::{Deserialize, Deserializer, de::Error};

const BYTES_PER_KIB: NonZeroUsize = NonZeroUsize::new(1024).unwrap();

/// # Errors
///
/// Returns an error if:
/// - the value is not a positive whole number of KiB;
/// - the value is too large to count in bytes;
pub(crate) fn deserialize_kib<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<NonZeroUsize, D::Error> {
    let kib = NonZeroUsize::deserialize(deserializer)?;

    kib.checked_mul(BYTES_PER_KIB)
        .ok_or_else(|| D::Error::custom(format!("{kib} KiB: too large to count in bytes")))
}

/// # Errors
///
/// Returns an error if:
/// - the value is not a non-negative, finite number of seconds;
/// - the field's type rejects the resulting `Duration`;
pub(crate) fn deserialize_secs<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: TryFrom<Duration, Error: Display>,
{
    let secs = f64::deserialize(deserializer)?;
    let duration =
        Duration::try_from_secs_f64(secs).map_err(|e| D::Error::custom(format!("{secs}: {e}")))?;

    T::try_from(duration).map_err(|e| D::Error::custom(format!("{secs}: {e}")))
}
