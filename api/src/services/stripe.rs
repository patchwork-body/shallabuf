use anyhow::Context;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;

pub struct StripeService {
    client: Client,
    api_url: String,
    secret_key: String,
}

#[derive(Debug)]
pub struct StripeCustomer {
    pub id: String,
}

#[derive(Debug)]
pub struct StripeSetupIntent {
    pub id: String,
    pub client_secret: String,
}

impl StripeService {
    pub fn new() -> anyhow::Result<Self> {
        let secret_key = std::env::var("STRIPE_SECRET_KEY")
            .context("STRIPE_SECRET_KEY environment variable not set")?;
        let api_url = std::env::var("STRIPE_API_URL")
            .context("STRIPE_API_URL environment variable not set")?;

        Ok(Self {
            client: Client::new(),
            api_url,
            secret_key,
        })
    }

    pub async fn create_customer(&self) -> anyhow::Result<StripeCustomer> {
        let response = self
            .client
            .post(format!("{}/customers", self.api_url))
            .basic_auth(&self.secret_key, Some(""))
            .send()
            .await
            .context("Failed to create Stripe customer")?;

        let customer: Value = response
            .json()
            .await
            .context("Failed to parse Stripe customer response")?;

        let customer_id = customer["id"]
            .as_str()
            .context("Failed to get customer ID from response")?
            .to_string();

        Ok(StripeCustomer { id: customer_id })
    }

    pub async fn setup_intent(&self, customer_id: &str) -> anyhow::Result<StripeSetupIntent> {
        let mut params = HashMap::new();
        params.insert("customer", customer_id);
        params.insert("automatic_payment_methods[enabled]", "true");

        let response = self
            .client
            .post(format!("{}/setup_intents", self.api_url))
            .basic_auth(&self.secret_key, Some(""))
            .form(&params)
            .send()
            .await
            .context("Failed to create Setup Intent")?;

        let setup_intent: Value = response
            .json()
            .await
            .context("Failed to parse Setup Intent response")?;

        let id = setup_intent["id"]
            .as_str()
            .context("Failed to get Setup Intent ID from response")?
            .to_string();

        let client_secret = setup_intent["client_secret"]
            .as_str()
            .context("Failed to get Client Secret from response")?
            .to_string();

        Ok(StripeSetupIntent { id, client_secret })
    }
}
