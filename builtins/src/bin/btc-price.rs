#![no_main]

// Explicitly avoid any browser-specific dependencies
use serde_json::json;
// Use the correct wit-bindgen macro syntax
wit_bindgen::generate!("shallabuf");

use exports::shallabuf::component::run::Guest;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoinDeskBpi {
    #[serde(rename = "USD")]
    usd: CoinDeskUSD,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoinDeskUSD {
    rate: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoinDeskResponse {
    bpi: CoinDeskBpi,
}

struct Component;

impl Guest for Component {
    fn run(_input: String) -> String {
        // Use the host's HTTP implementation through the imported interface
        let response = shallabuf::component::http::request(
            "GET",
            "https://api.coindesk.com/v1/bpi/currentprice.json",
            &[shallabuf::component::http::Headers {
                name: "Host".to_string(),
                value: "api.coindesk.com".to_string(),
            }],
            None,
        )
        .expect("Failed to make request");

        let response_text = String::from_utf8(response.body).expect("Failed to decode response");

        let response: CoinDeskResponse =
            serde_json::from_str(&response_text).expect("Failed to parse JSON");

        json!({ "price": response.bpi.usd.rate }).to_string()
    }
}

export!(Component);
