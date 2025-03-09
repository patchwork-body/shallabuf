wit_bindgen::generate!("shallabuf");

use exports::shallabuf::component::run::Guest;

#[derive(Default)]
pub struct RunOutput;

impl Guest for RunOutput {
    fn run(input: String) -> String {
        input
    }
}

export!(RunOutput);
