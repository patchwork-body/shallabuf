import type * as k8s from "@pulumi/kubernetes";
import type * as pulumi from "@pulumi/pulumi";
import {
	createDatabaseConfigMap,
	createGrafanaConfigMap,
	createMinioConfigMap,
	createNatsConfigMap,
	createRedisConfigMap,
} from "../config/configmaps";
import {
	createDatabaseSecrets,
	createGrafanaSecrets,
	createMinioSecrets,
	createNatsSecrets,
	createRedisSecrets,
} from "../config/secrets";

interface ComponentsConfig {
	namespace: pulumi.Output<string>;
	provider: k8s.Provider;
}

export function setupComponents(config: ComponentsConfig) {
	// Create ConfigMaps
	const dbConfig = createDatabaseConfigMap(config.namespace, config.provider);
	const redisConfig = createRedisConfigMap(config.namespace, config.provider);
	const minioConfig = createMinioConfigMap(config.namespace, config.provider);
	const natsConfig = createNatsConfigMap(config.namespace, config.provider);
	const grafanaConfig = createGrafanaConfigMap(
		config.namespace,
		config.provider,
	);

	// Create Secrets
	const dbSecrets = createDatabaseSecrets(config.namespace, config.provider);
	const redisSecrets = createRedisSecrets(config.namespace, config.provider);
	const minioSecrets = createMinioSecrets(config.namespace, config.provider);
	const natsSecrets = createNatsSecrets(config.namespace, config.provider);
	const grafanaSecrets = createGrafanaSecrets(
		config.namespace,
		config.provider,
	);

	return {
		configMaps: {
			database: dbConfig,
			redis: redisConfig,
			minio: minioConfig,
			nats: natsConfig,
			grafana: grafanaConfig,
		},
		secrets: {
			database: dbSecrets,
			redis: redisSecrets,
			minio: minioSecrets,
			nats: natsSecrets,
			grafana: grafanaSecrets,
		},
	};
}
