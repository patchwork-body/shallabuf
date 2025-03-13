#![no_main]

use serde_json::json;

wit_bindgen::generate!("shallabuf");

use exports::shallabuf::component::run::Guest;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenAIResponseData {
    url: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenAIResponse {
    data: Vec<OpenAIResponseData>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Payload {
    prompt: String,
}

struct Component;

impl Guest for Component {
    fn run(input: String) -> String {
        // let payload: Payload = serde_json::from_str(&input).expect("Failed to parse input JSON");

        // let runtime = tokio::runtime::Builder::new_current_thread()
        //     .enable_all()
        //     .build()
        //     .expect("Failed to build runtime");

        // runtime.block_on(async {
        //     let api_key = std::env::var("OPENAI_API_KEY")
        //         .expect("OPENAI_API_KEY environment variable not set");

        //     let client = reqwest::Client::new();
        //     let body = json!({
        //         "model": "dall-e-3",
        //         "prompt": payload.prompt,
        //         "response_format": "url",
        //         "n": 1,
        //         "size": "1024x1024"
        //     });

        //     let response = client
        //         .post("https://api.openai.com/v1/images/generations")
        //         .bearer_auth(api_key)
        //         .json(&body)
        //         .send()
        //         .await
        //         .expect("Failed to send request to OpenAI");

        //     let response_json = response
        //         .json::<OpenAIResponse>()
        //         .await
        //         .expect("Failed to parse OpenAI response");

        //     let url = &response_json.data[0].url;
        // })
        json!({ "image": "https://www.google.com" }).to_string()
    }
}

export!(Component);
