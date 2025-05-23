use crate::extractors::session::Session;
use crate::extractors::{database_connection::DatabaseConnection, stripe::Stripe};
use axum::{Json, extract::Path};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePaymentIntentRequest {
    pub organization_id: Uuid,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePaymentIntentResponse {
    pub client_secret: String,
}

pub async fn create_payment_intent(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Stripe(stripe): Stripe,
    Json(payload): Json<CreatePaymentIntentRequest>,
) -> Result<Json<CreatePaymentIntentResponse>, (StatusCode, String)> {
    let customer = stripe
        .create_customer()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let setup_intent = stripe
        .setup_intent(&customer.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query!(
        r#"
        INSERT INTO stripe_configurations (organization_id, stripe_customer_id, stripe_payment_intent_id, stripe_client_secret)
        VALUES ($1, $2, $3, $4)
        "#,
        payload.organization_id,
        customer.id,
        setup_intent.id,
        setup_intent.client_secret,
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CreatePaymentIntentResponse {
        client_secret: setup_intent.client_secret,
    }))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentIntentResponse {
    pub payment_intent_id: String,
    pub payment_method_id: String,
    pub client_secret: String,
}

pub async fn get_payment_intent(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
) -> Result<Json<PaymentIntentResponse>, (StatusCode, String)> {
    let payment_intent = sqlx::query!(
        r#"
        SELECT
            stripe_payment_intent_id,
            stripe_payment_method_id,
            stripe_client_secret
        FROM
            stripe_configurations
        WHERE
            organization_id = $1
        "#,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(payment_intent) = payment_intent else {
        return Err((
            StatusCode::NOT_FOUND,
            "Payment intent not found".to_string(),
        ));
    };

    Ok(Json(PaymentIntentResponse {
        payment_intent_id: payment_intent.stripe_payment_intent_id,
        payment_method_id: payment_intent.stripe_payment_method_id.unwrap_or_default(),
        client_secret: payment_intent.stripe_client_secret,
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePaymentIntentRequest {
    pub payment_method_id: String,
}

pub async fn update_payment_intent(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
    Json(payload): Json<UpdatePaymentIntentRequest>,
) -> Result<Json<PaymentIntentResponse>, (StatusCode, String)> {
    let payment_intent = sqlx::query!(
        r#"
        UPDATE stripe_configurations
        SET stripe_payment_method_id = $1
        WHERE organization_id = $2
        RETURNING stripe_payment_intent_id, stripe_payment_method_id, stripe_client_secret
        "#,
        payload.payment_method_id,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(payment_intent) = payment_intent else {
        return Err((
            StatusCode::NOT_FOUND,
            "Payment intent not found".to_string(),
        ));
    };

    Ok(Json(PaymentIntentResponse {
        payment_intent_id: payment_intent.stripe_payment_intent_id,
        payment_method_id: payment_intent.stripe_payment_method_id.unwrap_or_default(),
        client_secret: payment_intent.stripe_client_secret,
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePortalSessionRequest {
    pub organization_id: Uuid,
    pub return_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePortalSessionResponse {
    pub url: String,
}

pub async fn create_portal_session(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Stripe(stripe): Stripe,
    Json(payload): Json<CreatePortalSessionRequest>,
) -> Result<Json<CreatePortalSessionResponse>, (StatusCode, String)> {
    // Get the Stripe customer ID for this organization
    let stripe_config = sqlx::query!(
        r#"
        SELECT stripe_customer_id
        FROM stripe_configurations
        WHERE organization_id = $1
        "#,
        payload.organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| {
        println!("Error fetching stripe configuration: {:?}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let Some(config) = stripe_config else {
        println!("Stripe configuration not found for this organization");
        return Err((
            StatusCode::NOT_FOUND,
            "Stripe configuration not found for this organization".to_string(),
        ));
    };

    // Create the customer portal session
    let portal_session = stripe
        .create_customer_portal_session(&config.stripe_customer_id, payload.return_url.as_deref())
        .await
        .map_err(|e| {
            println!("Error creating customer portal session: {e:?}");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    Ok(Json(CreatePortalSessionResponse {
        url: portal_session.url,
    }))
}
