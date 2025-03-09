use db::dtos;
use dotenvy::dotenv;
use futures::StreamExt;
use http_body_util::BodyExt;
use hyper::body::Bytes;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use std::{env, process};
use tokio::{signal::ctrl_c, task::block_in_place};
use tracing::{debug, error};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

use wasmtime::{
    component::{bindgen, Component, Linker},
    Config, Engine, Store,
};
use wasmtime_wasi::{IoView, ResourceTable, WasiCtx, WasiCtxBuilder, WasiView};
use wasmtime_wasi_http::{WasiHttpCtx, WasiHttpView};

async fn publish_exec_result(
    nats_client: &async_nats::Client,
    payload: &dtos::PipelineNodeExecResultPayload,
) {
    let payload_bytes = match serde_json::to_string(payload) {
        Ok(payload) => payload.into(),
        Err(error) => {
            error!("Failed to serialize payload: {error}");
            return;
        }
    };

    if let Err(error) = nats_client
        .publish("pipeline.node.result", payload_bytes)
        .await
    {
        error!("Failed to publish message to JetStream: {error:?}");
    } else {
        debug!(
            "Published message to JetStream for pipeline_node_exec_id {}",
            payload.pipeline_node_exec_id
        );
    }
}

bindgen!({
    path: "../builtins/wit/shallabuf.wit",
    world: "shallabuf",
});

struct WasiState {
    wasi: WasiCtx,
    table: ResourceTable,
    http: WasiHttpCtx,
}

impl IoView for WasiState {
    fn table(&mut self) -> &mut ResourceTable {
        &mut self.table
    }
}

impl WasiView for WasiState {
    fn ctx(&mut self) -> &mut WasiCtx {
        &mut self.wasi
    }
}

impl WasiHttpView for WasiState {
    fn ctx(&mut self) -> &mut WasiHttpCtx {
        &mut self.http
    }
}

impl shallabuf::component::http_client::Host for WasiState {
    fn request(
        &mut self,
        method: String,
        url: String,
        headers: Vec<shallabuf::component::http_client::Headers>,
        body: Option<Vec<u8>>,
    ) -> Result<shallabuf::component::http_client::Response, String> {
        let mut builder = hyper::Request::builder().method(method.as_str()).uri(url);

        // Add headers
        for header in headers {
            builder = builder.header(header.name, header.value);
        }

        // Create request body
        let body: http_body_util::Full<Bytes> = match body {
            Some(data) => http_body_util::Full::new(Bytes::from(data)),
            None => http_body_util::Full::new(Bytes::new()),
        };

        // Build the request
        let request = builder
            .body(body)
            .map_err(|error| format!("Failed to build request: {error}"))?;

        // Create HTTP client with TLS support
        let https = hyper_tls::HttpsConnector::new();
        let client = Client::builder(TokioExecutor::new()).build(https);

        // Execute request using the existing runtime
        let response = block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                client
                    .request(request)
                    .await
                    .map_err(|error| format!("Request failed: {error}"))
            })
        })?;

        // Extract response components
        let status = response.status().as_u16();
        let headers = response
            .headers()
            .iter()
            .map(|(name, value)| shallabuf::component::http_client::Headers {
                name: name.to_string(),
                value: String::from_utf8_lossy(value.as_bytes()).into_owned(),
            })
            .collect();

        // Get response body
        let body = block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                response
                    .into_body()
                    .collect()
                    .await
                    .map_err(|error| format!("Failed to read response body: {error}"))
                    .map(http_body_util::Collected::to_bytes)
            })
        })?;

        Ok(shallabuf::component::http_client::Response {
            status,
            headers,
            body: body.to_vec(),
        })
    }
}

#[tokio::main]
#[allow(clippy::too_many_lines)]
async fn main() -> Result<(), async_nats::Error> {
    dotenv().ok();

    let filter_layer = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer().with_target(false).with_line_number(true);

    let (loki_layer, loki_task) = tracing_loki::builder()
        .label("host", "mine")
        .expect("Failed to create Loki layer")
        .extra_field("pid", format!("{}", process::id()))
        .expect("Failed to add extra field to Loki layer")
        .build_url(
            env::var("LOKI_URL")
                .expect("LOKI_URL must be set")
                .parse()
                .expect("Failed to parse Loki URL"),
        )
        .expect("Failed to build Loki layer");

    tokio::spawn(loki_task);

    tracing_subscriber::registry()
        .with(filter_layer)
        .with(fmt_layer)
        .with(loki_layer)
        .init();

    let nats_url = std::env::var("NATS_URL").expect("NATS_URL must be set");
    let nats_client = async_nats::connect(nats_url)
        .await
        .expect("Failed to connect to NATS");

    let mut pipeline_node_execs_subscriber = nats_client.subscribe("pipeline.node.exec").await?;

    let minio_endpoint = std::env::var("MINIO_ENDPOINT").expect("MINIO_ENDPOINT must be set");
    let minio_access_key = std::env::var("MINIO_ACCESS_KEY").expect("MINIO_ACCESS_KEY must be set");
    let minio_secret_key = std::env::var("MINIO_SECRET_KEY").expect("MINIO_SECRET_KEY must be set");

    let s3_config = aws_sdk_s3::config::Builder::new()
        .endpoint_url(minio_endpoint)
        .force_path_style(true)
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            minio_access_key,
            minio_secret_key,
            None,
            None,
            "",
        ))
        .region(aws_sdk_s3::config::Region::new("us-east-1"))
        .behavior_version_latest()
        .build();

    let s3_client = aws_sdk_s3::Client::from_conf(s3_config);

    tokio::spawn(async move {
        while let Some(message) = pipeline_node_execs_subscriber.next().await {
            let payload =
                match serde_json::from_slice::<dtos::PipelineNodeExecPayload>(&message.payload) {
                    Ok(payload) => payload,
                    Err(error) => {
                        error!("Failed to deserialize message payload: {error:?}");
                        continue;
                    }
                };

            debug!("payload from worker {payload:?}");

            let mut config = Config::new();
            config.wasm_component_model(true);

            let engine = match Engine::new(&config) {
                Ok(engine) => engine,
                Err(error) => {
                    error!("Failed to create engine: {error}");
                    continue;
                }
            };

            let mut linker = Linker::new(&engine);

            // Add WASI interfaces
            if let Err(error) = wasmtime_wasi::add_to_linker_sync(&mut linker) {
                error!("Failed to add WASI to linker: {error}");
                continue;
            }

            // Add our custom HTTP interface
            if let Err(error) = shallabuf::component::http_client::add_to_linker(
                &mut linker,
                |state: &mut WasiState| state,
            ) {
                error!("Failed to add HTTP interface to linker: {error}");
                continue;
            }

            let table = ResourceTable::new();
            let wasi = WasiCtxBuilder::new()
                .inherit_stdio()
                .inherit_network()
                .build();

            let http = WasiHttpCtx::new();

            let state = WasiState { wasi, table, http };

            let mut store = Store::new(&engine, state);

            let parts = payload.path.split('@').collect::<Vec<&str>>();
            let bucket_name = parts[0];
            let object_key = parts[1];
            let object_extension = payload.container_type;

            let s3_object = match s3_client
                .get_object()
                .bucket(bucket_name)
                .key(format!("{object_key}.{object_extension}"))
                .send()
                .await
            {
                Ok(resp) => resp,
                Err(error) => {
                    error!("Failed to download module from S3: {error}");
                    continue;
                }
            };

            let module_bytes =
                match aws_sdk_s3::primitives::ByteStream::collect(s3_object.body).await {
                    Ok(bytes) => bytes.into_bytes(),
                    Err(error) => {
                        error!("Failed to read module bytes: {error}");
                        continue;
                    }
                };

            let component = match Component::new(&engine, module_bytes) {
                Ok(component) => component,
                Err(error) => {
                    error!("Failed to create component: {error}");
                    continue;
                }
            };

            let instance = match Shallabuf::instantiate(&mut store, &component, &linker) {
                Ok(instance) => instance,
                Err(error) => {
                    error!("Failed to instantiate component: {error}");
                    continue;
                }
            };

            let input = payload.params.to_string();
            debug!("Calling run with input: {input}");

            let output = match instance
                .shallabuf_component_run()
                .call_run(&mut store, &input)
            {
                Ok(output) => output,
                Err(error) => {
                    error!("Failed to call run function: {error}");
                    publish_exec_result(
                        &nats_client,
                        &dtos::PipelineNodeExecResultPayload {
                            pipeline_exec_id: payload.pipeline_execs_id,
                            pipeline_node_exec_id: payload.pipeline_node_exec_id,
                            outcome: dtos::ExecutionOutcome::Failure(format!(
                                "Failed to execute run function: {error}"
                            )),
                        },
                    )
                    .await;

                    continue;
                }
            };

            debug!(
                "Pipeline node exec {} completed with result: {output}",
                payload.pipeline_node_exec_id
            );

            let outcome = match serde_json::from_str(&output) {
                Ok(value) => dtos::ExecutionOutcome::Success(value),
                Err(error) => dtos::ExecutionOutcome::Failure(format!(
                    "Failed to deserialize result: {error}"
                )),
            };

            publish_exec_result(
                &nats_client,
                &dtos::PipelineNodeExecResultPayload {
                    pipeline_exec_id: payload.pipeline_execs_id,
                    pipeline_node_exec_id: payload.pipeline_node_exec_id,
                    outcome,
                },
            )
            .await;
        }
    });

    ctrl_c().await?;

    Ok(())
}
