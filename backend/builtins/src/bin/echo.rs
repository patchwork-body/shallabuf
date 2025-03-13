#![no_main]

use serde_json::json;

wit_bindgen::generate!({
    world: "shallabuf",
    path: "wit"
});

use exports::shallabuf::component::run::Guest;

struct Component;

impl Guest for Component {
    fn run(input: String) -> String {
        let parsed: serde_json::Value =
            serde_json::from_str(&input).expect("Failed to parse input JSON");

        let message = parsed.get("message").expect("Missing 'message' field");

        json!({ "echoed": message }).to_string()
    }
}

export!(Component);
