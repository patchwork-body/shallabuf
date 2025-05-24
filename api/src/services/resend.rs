use crate::config::Config;
use resend_rs::{
    Resend, Result,
    types::{CreateEmailBaseOptions, CreateEmailResponse},
};

pub struct ResendService {
    from: String,
    client: Resend,
}

impl ResendService {
    pub fn new(config: &Config) -> anyhow::Result<Self> {
        let client = resend_rs::Resend::new(&config.resend_api_key);
        Ok(Self {
            from: config.resend_from_email.clone(),
            client,
        })
    }

    pub async fn send_invites(
        &self,
        to: Vec<String>,
        magic_link: &str,
    ) -> Result<CreateEmailResponse> {
        let email =
            CreateEmailBaseOptions::new(self.from.clone(), to, "Invitation to join the team")
                .with_html(&format!(
                    "<a href='{}'>Click here to accept the invitation</a>",
                    magic_link
                ));

        let email = self.client.emails.send(email).await?;

        Ok(email)
    }
}
