use std::collections::BTreeMap;

/// Runs `f` in the environment from `.env.test`,
/// with `overrides` replacing individual values.
pub(crate) fn with_test_env<R>(overrides: &[(&str, &str)], f: impl FnOnce() -> R) -> R {
    let mut vars: BTreeMap<String, String> = dotenvy::from_read_iter(
        include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/.env.test")).as_slice(),
    )
    .map(Result::unwrap)
    .collect();

    vars.extend(overrides.iter().map(|&(k, v)| (k.to_owned(), v.to_owned())));

    let vars: Vec<_> = vars.into_iter().map(|(k, v)| (k, Some(v))).collect();

    temp_env::with_vars(vars, f)
}
