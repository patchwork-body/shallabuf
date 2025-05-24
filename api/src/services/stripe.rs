use anyhow::Context;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;

use crate::config::Config;

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

#[derive(Debug)]
pub struct StripePortalSession {
    pub url: String,
}

impl StripeService {
    pub fn new(config: &Config) -> anyhow::Result<Self> {
        let secret_key = config.stripe_secret_key.clone();
        let api_url = config.stripe_api_url.clone();

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

    pub async fn create_customer_portal_session(
        &self,
        customer_id: &str,
        return_url: Option<&str>,
    ) -> anyhow::Result<StripePortalSession> {
        let mut params = HashMap::new();
        params.insert("customer", customer_id);

        if let Some(url) = return_url {
            params.insert("return_url", url);
        }

        let response = self
            .client
            .post(format!("{}/billing_portal/sessions", self.api_url))
            .basic_auth(&self.secret_key, Some(""))
            .form(&params)
            .send()
            .await
            .context("Failed to create customer portal session")?;

        // Check if the response is successful
        let status = response.status();
        let response_text = response
            .text()
            .await
            .context("Failed to read response body")?;

        if !status.is_success() {
            if response_text.contains("No configuration provided") {
                return Err(anyhow::anyhow!(
                    "Stripe Customer Portal is not configured. Please set up the Customer Portal in your Stripe Dashboard at https://dashboard.stripe.com/test/settings/billing/portal"
                ));
            }

            return Err(anyhow::anyhow!(
                "Stripe API returned error status {}: {}",
                status,
                response_text
            ));
        }

        let portal_session: Value = serde_json::from_str(&response_text)
            .context("Failed to parse customer portal session response")?;

        let url = portal_session["url"]
            .as_str()
            .context("Failed to get portal session URL from response")?
            .to_string();

        Ok(StripePortalSession { url })
    }
}
