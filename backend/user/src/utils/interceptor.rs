use crate::proto::{ValidateSessionRequest, auth_service_client::AuthServiceClient};
use std::pin::Pin;
use std::task::Context;
use std::task::Poll;
use tonic::{Request, Status};
use tower::{Layer, Service};
use uuid::Uuid;

#[derive(Clone)]
pub struct AuthMiddlewareLayer {
    auth_client: AuthServiceClient<tonic::transport::Channel>,
}

impl AuthMiddlewareLayer {
    pub fn new(auth_client: AuthServiceClient<tonic::transport::Channel>) -> Self {
        Self { auth_client }
    }
}

#[derive(Debug, Clone)]
pub struct AuthMiddleware<S> {
    inner: S,
    auth_client: AuthServiceClient<tonic::transport::Channel>,
}

impl<S> Layer<S> for AuthMiddlewareLayer {
    type Service = AuthMiddleware<S>;

    fn layer(&self, service: S) -> Self::Service {
        AuthMiddleware {
            inner: service,
            auth_client: self.auth_client.clone(),
        }
    }
}

type BoxFuture<'a, T> = Pin<Box<dyn std::future::Future<Output = T> + Send + 'a>>;

impl<S, ReqBody, ResBody> Service<http::Request<ReqBody>> for AuthMiddleware<S>
where
    S: Service<http::Request<ReqBody>, Response = http::Response<ResBody>> + Clone + Send + 'static,
    S::Future: Send + 'static,
    ReqBody: Send + 'static,
    S::Error: From<std::io::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, mut request: http::Request<ReqBody>) -> Self::Future {
        let inner = self.inner.clone();
        let mut inner = std::mem::replace(&mut self.inner, inner);
        let mut auth_client = self.auth_client.clone();

        Box::pin(async move {
            let token = request
                .headers()
                .get("authorization")
                .and_then(|val| val.to_str().ok())
                .ok_or_else(|| Status::unauthenticated("Missing authorization token"))
                .map_err(|status| {
                    std::io::Error::new(std::io::ErrorKind::Other, status.to_string())
                })?;

            let mut validate_req = Request::new(ValidateSessionRequest {});
            validate_req
                .metadata_mut()
                .insert("authorization", token.parse().unwrap());

            let response = auth_client
                .validate_session(validate_req)
                .await
                .map_err(|status| {
                    std::io::Error::new(std::io::ErrorKind::Other, status.to_string())
                })?
                .into_inner();

            let user_id = Uuid::parse_str(&response.user_id).map_err(|status| {
                std::io::Error::new(std::io::ErrorKind::Other, status.to_string())
            })?;

            request.extensions_mut().insert(AuthExtension { user_id });
            let response = inner.call(request).await?;

            Ok(response)
        })
    }
}

#[derive(Clone, Debug)]
pub struct AuthExtension {
    pub user_id: Uuid,
}
