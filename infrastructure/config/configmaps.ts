import * as k8s from "@pulumi/kubernetes";
import type * as pulumi from "@pulumi/pulumi";
import { getConfig } from "./config";

export interface ConfigMapData {
	[key: string]: string;
}

export function createConfigMap(
	name: string,
	namespace: pulumi.Output<string>,
	data: ConfigMapData,
	provider: k8s.Provider,
): k8s.core.v1.ConfigMap {
	return new k8s.core.v1.ConfigMap(
		name,
		{
			metadata: { namespace },
			data,
		},
		{ provider },
	);
}

export function createDatabaseConfigMap(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.ConfigMap {
	const config = getConfig("database");
	return createConfigMap(
		"postgres-config",
		namespace,
		{
			POSTGRES_DB: config.require("database"),
			POSTGRES_USER: config.require("username"),
			POSTGRES_HOST: config.require("host"),
			POSTGRES_PORT: config.require("port"),
		},
		provider,
	);
}

export function createMinioConfigMap(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.ConfigMap {
	const config = getConfig("minio");
	return createConfigMap(
		"minio-config",
		namespace,
		{
			MINIO_BUCKET: config.require("bucketName"),
			MINIO_REGION: "us-east-1", // Default region
			MINIO_BROWSER: "on",
		},
		provider,
	);
}

export function createGrafanaConfigMap(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.ConfigMap {
	const config = getConfig("grafana");
	return createConfigMap(
		"grafana-config",
		namespace,
		{
			GF_SERVER_ROOT_URL: `https://${config.require("domain")}`,
			GF_AUTH_DISABLE_LOGIN_FORM: "false",
			GF_AUTH_OAUTH_AUTO_LOGIN: "false",
			GF_INSTALL_PLUGINS:
				"grafana-clock-panel,grafana-simple-json-datasource,grafana-piechart-panel",
		},
		provider,
	);
}

export function createNatsConfigMap(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.ConfigMap {
	const config = getConfig("nats");
	return createConfigMap(
		"nats-config",
		namespace,
		{
			NATS_HOST: config.require("host"),
			NATS_PORT: config.require("port"),
			NATS_CLUSTER_NAME: "shallabuf-cluster",
			NATS_HTTP_PORT: "8222",
			NATS_JETSTREAM_ENABLED: "true",
		},
		provider,
	);
}

export function createRedisConfigMap(
	namespace: pulumi.Output<string>,
	provider: k8s.Provider,
): k8s.core.v1.ConfigMap {
	const config = getConfig("redis");
	return createConfigMap(
		"redis-config",
		namespace,
		{
			REDIS_HOST: config.require("host"),
			REDIS_PORT: config.require("port"),
			REDIS_DB: "0",
		},
		provider,
	);
}
