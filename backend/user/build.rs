fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure().build_server(true).compile_protos(
        &["../../proto/user.proto", "../../proto/auth.proto"],
        &["../../proto"],
    )?;

    Ok(())
}
