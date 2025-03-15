import * as k8s from "@pulumi/kubernetes";
import type * as pulumi from "@pulumi/pulumi";

export function setupPostgres(
	config: pulumi.Config,
	ns: k8s.core.v1.Namespace,
	isDev: boolean,
) {
	const postgresConfig = new k8s.core.v1.ConfigMap("postgres-config", {
		metadata: { namespace: ns.metadata.name },
		data: {
			POSTGRES_HOST: "postgres-svc",
			POSTGRES_USER: "shallabuf",
			POSTGRES_DB: "shallabuf",
		},
	});

	if (isDev) {
		createPostgresDevSetup(ns, postgresConfig);
	} else {
		createPostgresProdSetup(ns, postgresConfig, config);
	}
}

function createPostgresDevSetup(
	ns: k8s.core.v1.Namespace,
	configMap: k8s.core.v1.ConfigMap,
) {
	const postgresSecret = new k8s.core.v1.Secret("postgres-secret", {
		metadata: { namespace: ns.metadata.name },
		stringData: {
			POSTGRES_PASSWORD: "secret",
			POSTGRES_REPLICATION_PASSWORD: "repl-secret",
		},
	});

	const postgresPvc = new k8s.core.v1.PersistentVolumeClaim(
		"postgres-pvc",
		{
			metadata: { namespace: ns.metadata.name },
			spec: {
				accessModes: ["ReadWriteOnce"],
				resources: { requests: { storage: "1Gi" } },
			},
		},
		{ dependsOn: ns },
	);

	const postgresVolumeName = "postgres-data";

	new k8s.apps.v1.Deployment("postgres-deployment", {
		metadata: {
			namespace: ns.metadata.name,
			labels: { app: "postgres", env: "dev" },
		},
		spec: {
			replicas: 1,
			selector: { matchLabels: { app: "postgres" } },
			template: {
				metadata: { labels: { app: "postgres" } },
				spec: {
					containers: [
						{
							name: "postgres",
							image: "postgres:17",
							env: [
								{
									name: "POSTGRES_HOST",
									valueFrom: {
										configMapKeyRef: {
											name: configMap.metadata.name,
											key: "POSTGRES_HOST",
										},
									},
								},
								{
									name: "POSTGRES_USER",
									valueFrom: {
										configMapKeyRef: {
											name: configMap.metadata.name,
											key: "POSTGRES_USER",
										},
									},
								},
								{
									name: "POSTGRES_DB",
									valueFrom: {
										configMapKeyRef: {
											name: configMap.metadata.name,
											key: "POSTGRES_DB",
										},
									},
								},
								{
									name: "PGDATA",
									value: "/var/lib/postgresql/data/pgdata",
								},
								{
									name: "POSTGRES_PASSWORD",
									valueFrom: {
										secretKeyRef: {
											name: postgresSecret.metadata.name,
											key: "POSTGRES_PASSWORD",
										},
									},
								},
								{
									name: "POSTGRES_REPLICATION_PASSWORD",
									valueFrom: {
										secretKeyRef: {
											name: postgresSecret.metadata.name,
											key: "POSTGRES_REPLICATION_PASSWORD",
										},
									},
								},
							],
							ports: [{ containerPort: 5432 }],
							resources: {
								requests: {
									cpu: "200m",
									memory: "256Mi",
								},
								limits: {
									cpu: "500m",
									memory: "512Mi",
								},
							},
							volumeMounts: [
								{
									name: postgresVolumeName,
									mountPath: "/var/lib/postgresql/data",
								},
							],
							livenessProbe: {
								exec: {
									command: ["pg_isready", "-U", "shallabuf"],
								},
								initialDelaySeconds: 30,
								periodSeconds: 10,
							},
						},
					],
					volumes: [
						{
							name: postgresVolumeName,
							persistentVolumeClaim: { claimName: postgresPvc.metadata.name },
						},
					],
				},
			},
		},
	});

	new k8s.core.v1.Service("postgres-svc", {
		metadata: { namespace: ns.metadata.name, labels: { app: "postgres" } },
		spec: {
			type: "NodePort",
			selector: { app: "postgres" },
			ports: [{ port: 5432, targetPort: 5432, nodePort: 30432 }],
		},
	});

	new k8s.apps.v1.Deployment("pgadmin-deployment", {
		metadata: {
			namespace: ns.metadata.name,
			labels: { app: "pgadmin", env: "dev" },
		},
		spec: {
			replicas: 1,
			selector: { matchLabels: { app: "pgadmin" } },
			template: {
				metadata: { labels: { app: "pgadmin" } },
				spec: {
					containers: [
						{
							name: "pgadmin",
							image: "dpage/pgadmin4:latest",
							env: [
								{ name: "PGADMIN_DEFAULT_EMAIL", value: "admin@email.com" },
								{ name: "PGADMIN_DEFAULT_PASSWORD", value: "admin" },
							],
							ports: [{ containerPort: 80 }],
						},
					],
				},
			},
		},
	});

	new k8s.core.v1.Service("pgadmin-svc", {
		metadata: { namespace: ns.metadata.name, labels: { app: "pgadmin" } },
		spec: {
			type: "NodePort",
			selector: { app: "pgadmin" },
			ports: [{ port: 80, targetPort: 80, nodePort: 30080 }],
		},
	});
}

function createPostgresProdSetup(
	ns: k8s.core.v1.Namespace,
	configMap: k8s.core.v1.ConfigMap,
	config: pulumi.Config,
) {
	const postgresSecret = new k8s.core.v1.Secret("postgres-secret", {
		metadata: { namespace: ns.metadata.name },
		stringData: {
			POSTGRES_PASSWORD: config.requireSecret("postgresPassword"),
			POSTGRES_REPLICATION_PASSWORD: config.requireSecret(
				"replicationPassword",
			),
		},
	});

	// Persistent Volume Claims
	const postgresPvc = new k8s.core.v1.PersistentVolumeClaim(
		"postgres-pvc",
		{
			metadata: { namespace: ns.metadata.name },
			spec: {
				accessModes: ["ReadWriteOnce"],
				resources: { requests: { storage: "10Gi" } },
			},
		},
		{ dependsOn: ns },
	);
}
