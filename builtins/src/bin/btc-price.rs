#![no_main]

// Explicitly avoid any browser-specific dependencies
use serde_json::json;
// Use the correct wit-bindgen macro syntax
wit_bindgen::generate!("shallabuf");

use exports::shallabuf::component::run::Guest;

#[derive(Debug, serde::Deserialize)]
struct CoinGeckoResponse {
    bitcoin: BitcoinPrice,
}

#[derive(Debug, serde::Deserialize)]
struct BitcoinPrice {
    usd: f64,
}

struct Component;

impl Guest for Component {
    fn run(_input: String) -> String {
        let response = shallabuf::component::http_client::request(
            "GET",
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
            &[shallabuf::component::http_client::Headers {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            }],
            None,
        )
        .expect("Failed to make request");

        let response_text = String::from_utf8(response.body).expect("Failed to decode response");

        let response: CoinGeckoResponse =
            serde_json::from_str(&response_text).expect("Failed to parse JSON");

        json!({ "price": response.bitcoin.usd.to_string() }).to_string()
    }
}

export!(Component);
