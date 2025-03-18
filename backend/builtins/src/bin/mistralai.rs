#![no_main]

// Use the correct wit-bindgen macro syntax
wit_bindgen::generate!("shallabuf");

use exports::shallabuf::component::run::Guest;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
struct OCRRequest {
    document_url: String,
    include_image_base64: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
struct OCRResponse {
    pages: Vec<Page>,
    model: String,
    usage_info: UsageInfo,
}

#[derive(Debug, Deserialize, Serialize)]
struct Page {
    index: u32,
    markdown: String,
    images: Vec<String>, // Assuming images is an array of strings, adjust if needed
    dimensions: Dimensions,
}

#[derive(Debug, Deserialize, Serialize)]
struct Dimensions {
    dpi: u32,
    height: u32,
    width: u32,
}

#[derive(Debug, Deserialize, Serialize)]
struct UsageInfo {
    pages_processed: u32,
    doc_size_bytes: Option<u64>,
}

#[derive(Debug, Serialize)]
struct MistralOCRRequest {
    model: String,
    document: Document,
    include_image_base64: Option<bool>,
}

#[derive(Debug, Serialize)]
struct Document {
    #[serde(rename = "type")]
    doc_type: String,
    document_url: String,
}

struct Component;

impl Guest for Component {
    fn run(_input: String) -> String {
        let mistral_request = MistralOCRRequest {
            model: "mistral-ocr-latest".to_string(),
            document: Document {
                doc_type: "document_url".to_string(),
                document_url: "https://arxiv.org/pdf/2201.04234".to_string(),
            },
            include_image_base64: true.into(),
        };

        let request_body =
            serde_json::to_vec(&mistral_request).expect("Failed to serialize request");

        let headers = [
            shallabuf::component::http_client::Headers {
                name: "Authorization".to_string(),
                value: "Bearer kSsSruAe7A508dXay8PIsdtc82XMB16H".to_string(),
            },
            shallabuf::component::http_client::Headers {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
        ];

        let response = shallabuf::component::http_client::request(
            "POST",
            "https://api.mistral.ai/v1/ocr",
            &headers,
            Some(&request_body),
        )
        .expect("Failed to make request");

        let file_path = shallabuf::component::http_client::upload_file(
            "mistralai_ocr_response.json",
            &response.body,
        );

        json!({
            "response": file_path,
        })
        .to_string()
    }
}

export!(Component);
