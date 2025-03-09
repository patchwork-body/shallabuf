#![no_main]

use serde_json::json;

wit_bindgen::generate!("shallabuf");

use exports::shallabuf::component::run::Guest;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum TransformerVariant {
    Uppercase,
    Lowercase,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Payload {
    message: String,
    transformer: TransformerVariant,
}

struct Component;

impl Guest for Component {
    fn run(input: String) -> String {
        let payload: Payload = serde_json::from_str(&input).expect("Failed to parse input JSON");

        let message = match payload.transformer {
            TransformerVariant::Uppercase => payload.message.to_uppercase(),
            TransformerVariant::Lowercase => payload.message.to_lowercase(),
        };

        json!({ "transformed": message }).to_string()
    }
}

export!(Component);
