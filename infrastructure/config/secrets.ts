import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { getConfig, getSecret } from "./config";

export interface SecretData {
	[key: string]: pulumi.Output<string>;
}

export function createSecret(
	name: string,
	namespace: pulumi.Output<string>,
	data: SecretData,
	provider: k8s.Provider,
): k8s.core.v1.Secret {
	return new k8s.core.v1.Secret(
		name,
		{
			metadata: { namespace },
			stringData: data,
		},
		{ provider },
	);
}

// Helper function to convert string to pulumi.Output<string>
function toOutput(value: string): pulumi.Output<string> {
	return pulumi.output(value);
}

// Create secrets for each service
export function createDatabaseSecrets(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.Secret {
	const config = getConfig("database");
	return createSecret(
		"postgres-secret",
		namespace,
		{
			POSTGRES_PASSWORD: getSecret(config, "password"),
			POSTGRES_REPLICATION_PASSWORD: getSecret(config, "replicationPassword"),
		},
		provider,
	);
}

export function createMinioSecrets(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.Secret {
	const config = getConfig("minio");
	return createSecret(
		"minio-secret",
		namespace,
		{
			MINIO_ROOT_USER: toOutput(config.require("rootUser")),
			MINIO_ROOT_PASSWORD: getSecret(config, "rootPassword"),
			MINIO_ACCESS_KEY: getSecret(config, "accessKey"),
			MINIO_SECRET_KEY: getSecret(config, "secretKey"),
		},
		provider,
	);
}

export function createGrafanaSecrets(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.Secret {
	const config = getConfig("grafana");
	return createSecret(
		"grafana-secret",
		namespace,
		{
			admin_password: getSecret(config, "adminPassword"),
			client_id: toOutput(config.require("oauthClientId")),
			client_secret: getSecret(config, "oauthClientSecret"),
		},
		provider,
	);
}

export function createNatsSecrets(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.Secret {
	const config = getConfig("nats");
	return createSecret(
		"nats-secret",
		namespace,
		{
			NATS_USER: toOutput(config.require("user")),
			NATS_PASSWORD: getSecret(config, "password"),
		},
		provider,
	);
}

export function createRedisSecrets(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.Secret {
	const config = getConfig("redis");
	return createSecret(
		"redis-secret",
		namespace,
		{
			REDIS_PASSWORD: getSecret(config, "password"),
		},
		provider,
	);
}
