use crate::config::Config;
use resend_rs::{
    Resend, Result,
    types::{CreateEmailBaseOptions, CreateEmailResponse},
};

pub(crate) struct ResendService {
    from: String,
    client: Resend,
}

impl ResendService {
    pub(crate) fn new(config: &Config) -> Self {
        let client = Resend::new(&config.resend_api_key);

        Self {
            from: config.resend_from_email.clone(),
            client,
        }
    }

    pub(crate) async fn send_invites(
        &self,
        to: &str,
        magic_link: &str,
    ) -> Result<CreateEmailResponse> {
        let email =
            CreateEmailBaseOptions::new(self.from.clone(), vec![to], "Invitation to join the team")
                .with_html(&format!(
                    "<a href='{magic_link}'>Click here to accept the invitation</a>"
                ));

        let email = self.client.emails.send(email).await?;

        Ok(email)
    }
}
