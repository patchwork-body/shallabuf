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

        let response_text = String::from_utf8(response.body).expect("Failed to decode response");

        match serde_json::from_str::<OCRResponse>(&response_text) {
            Ok(parsed_response) => {
                // Extract text from all pages, but limit the amount of text per page
                // to avoid exceeding message size limits
                let max_chars_per_page = 5000; // Limit characters per page
                let max_pages = 10; // Limit number of pages

                let all_text = parsed_response
                    .pages
                    .iter()
                    .take(max_pages) // Limit number of pages
                    .map(|page| {
                        let truncated_text = if page.markdown.len() > max_chars_per_page {
                            format!(
                                "{}... (truncated, {} more characters)",
                                &page.markdown[0..max_chars_per_page],
                                page.markdown.len() - max_chars_per_page
                            )
                        } else {
                            page.markdown.clone()
                        };

                        format!("--- Page {} ---\n{}", page.index, truncated_text)
                    })
                    .collect::<Vec<String>>()
                    .join("\n\n");

                let total_pages = parsed_response.pages.len();
                let pages_included = std::cmp::min(total_pages, max_pages);

                json!({
                    "text": all_text,
                    "model": parsed_response.model,
                    "pages_processed": parsed_response.usage_info.pages_processed,
                    "pages_included": pages_included,
                    "total_pages": total_pages,
                    "truncated": total_pages > max_pages || parsed_response.pages.iter().any(|p| p.markdown.len() > max_chars_per_page),
                    "dimensions": parsed_response.pages.first().map(|p| &p.dimensions)
                })
                .to_string()
            }
            Err(e) => {
                // Return error information along with a limited portion of the raw response for debugging
                let truncated_response = if response_text.len() > 1000 {
                    format!("{}... (truncated)", &response_text[0..1000])
                } else {
                    response_text.clone()
                };

                json!({
                    "error": format!("Failed to parse JSON: {}", e),
                    "raw_response_preview": truncated_response,
                    "response_size_bytes": response_text.len()
                })
                .to_string()
            }
        }
    }
}

export!(Component);
