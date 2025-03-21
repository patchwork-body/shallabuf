use db::dtos;
use dotenvy::dotenv;
use futures::StreamExt;
use http_body_util::BodyExt;
use hyper::body::Bytes;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use std::{env, process, sync::Arc};
use tokio::signal::ctrl_c;
use tracing::{debug, error};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};
use wasmtime::{
    component::{bindgen, Component, Linker},
    Config, Engine, Store,
};
use wasmtime_wasi::{IoView, ResourceTable, WasiCtx, WasiCtxBuilder, WasiView};
use wasmtime_wasi_http::{WasiHttpCtx, WasiHttpView};

// Create a thread-safe HTTP client that can be reused
type HttpClient = Arc<
    Client<
        hyper_tls::HttpsConnector<hyper_util::client::legacy::connect::HttpConnector>,
        http_body_util::Full<Bytes>,
    >,
>;

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
    node_exec_id: String,
    wasi: WasiCtx,
    table: ResourceTable,
    http: WasiHttpCtx,
    http_client: HttpClient,
    s3_client: Arc<aws_sdk_s3::Client>,
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
        debug!("Making {method} request to {url}");

        // Build request
        let mut builder = hyper::Request::builder().method(method.as_str()).uri(url);

        // Add headers
        for header in &headers {
            builder = builder.header(&header.name, &header.value);
            debug!("Adding header: {}: {}", header.name, header.value);
        }

        // Create request body
        let body_data = if let Some(data) = &body {
            debug!("Request body size: {} bytes", data.len());
            http_body_util::Full::new(Bytes::from(data.clone()))
        } else {
            debug!("No request body");
            http_body_util::Full::new(Bytes::new())
        };

        // Build request
        let request = builder.body(body_data).map_err(|error| {
            error!("Failed to build request: {error}");
            format!("Failed to build request: {error}")
        })?;

        // Create a thread to handle the HTTP request
        let (tx, rx) = std::sync::mpsc::channel();
        let client = Arc::clone(&self.http_client);

        std::thread::spawn(move || {
            // Create a new runtime for this thread
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to build runtime");

            // Execute the request in the new runtime
            let result = rt.block_on(async {
                match client.request(request).await {
                    Ok(response) => {
                        let status = response.status().as_u16();
                        debug!("Response status: {status}");

                        let headers = response
                            .headers()
                            .iter()
                            .map(|(name, value)| shallabuf::component::http_client::Headers {
                                name: name.to_string(),
                                value: String::from_utf8_lossy(value.as_bytes()).into_owned(),
                            })
                            .collect();

                        // Collect the response body
                        match response.into_body().collect().await {
                            Ok(body) => {
                                let body_bytes = body.to_bytes();
                                debug!("Response body size: {} bytes", body_bytes.len());

                                Ok(shallabuf::component::http_client::Response {
                                    status,
                                    headers,
                                    body: body_bytes.to_vec(),
                                })
                            }
                            Err(error) => {
                                error!("Failed to read response body: {error}");
                                Err(format!("Failed to read response body: {error}"))
                            }
                        }
                    }
                    Err(error) => {
                        error!("Request failed: {error}");
                        Err(format!("Request failed: {error}"))
                    }
                }
            });

            // Send the result back through the channel
            let _ = tx.send(result);
        });

        // Wait for the result from the thread
        match rx.recv() {
            Ok(result) => result,
            Err(error) => {
                error!("Failed to receive response from thread: {error}");
                Err(format!("Failed to receive response from thread: {error}"))
            }
        }
    }

    fn upload_file(&mut self, filename: String, data: Vec<u8>) -> Result<String, String> {
        debug!(
            "Uploading file with key: {filename}, size: {} bytes",
            data.len()
        );

        // Get bucket and path from key (assuming format: bucket@path)
        let bucket_name = "node-execs-results";
        let object_key = format!("{}/{}", self.node_exec_id, filename);

        // Create a thread to handle the S3 upload
        let (tx, rx) = std::sync::mpsc::channel();
        let s3_client = Arc::clone(&self.s3_client);
        let data_clone = data.clone();

        std::thread::spawn(move || {
            // Create a new runtime for this thread
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to build runtime");

            // Execute the upload in the new runtime
            let result = rt.block_on(async {
                let body = aws_sdk_s3::primitives::ByteStream::from(data_clone);

                debug!("Uploading file to S3: {bucket_name}/{object_key}");

                match s3_client
                    .put_object()
                    .bucket(bucket_name)
                    .key(object_key.clone())
                    .body(body)
                    .send()
                    .await
                {
                    Ok(_) => {
                        debug!("Successfully uploaded file to {bucket_name}/{object_key}");
                        Ok(format!("{bucket_name}@{object_key}"))
                    }
                    Err(error) => {
                        error!("Failed to upload file to S3: {error}");
                        Err(format!("Failed to upload file to S3: {error}"))
                    }
                }
            });

            // Send the result back through the channel
            let _ = tx.send(result);
        });

        // Wait for the result from the thread
        match rx.recv() {
            Ok(result) => result,
            Err(error) => {
                error!("Failed to receive upload result from thread: {error}");
                Err(format!(
                    "Failed to receive upload result from thread: {error}"
                ))
            }
        }
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

    let s3_client = Arc::new(aws_sdk_s3::Client::from_conf(s3_config));

    // Create a reusable HTTPS client
    let https = hyper_tls::HttpsConnector::new();
    let http_client = Arc::new(Client::builder(TokioExecutor::new()).build(https));

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

            // Use the shared HTTP client
            let state = WasiState {
                node_exec_id: payload.pipeline_node_exec_id.to_string(),
                wasi,
                table,
                http,
                http_client: Arc::clone(&http_client),
                s3_client: Arc::clone(&s3_client),
            };

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
