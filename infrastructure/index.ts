import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const name = "shallabuf";

const engineVersion = gcp.container
	.getEngineVersions()
	.then((versions) => versions.latestMasterVersion);

const cluster = new gcp.container.Cluster(name, {
	initialNodeCount: 2,
	minMasterVersion: engineVersion,
	nodeVersion: engineVersion,
	location: "europe-central2-a",
	nodeConfig: {
		machineType: "e2-small",
		diskSizeGb: 20,
		diskType: "pd-standard",
		oauthScopes: [
			"https://www.googleapis.com/auth/compute",
			"https://www.googleapis.com/auth/devstorage.read_only",
			"https://www.googleapis.com/auth/logging.write",
			"https://www.googleapis.com/auth/monitoring",
		],
	},
});

export const clusterName = cluster.name;

// Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export const kubeconfig = pulumi
	.all([cluster.name, cluster.endpoint, cluster.masterAuth])
	.apply(([name, endpoint, masterAuth]) => {
		const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
		return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
        https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
      provideClusterInfo: true
`;
	});

const clusterProvider = new k8s.Provider(name, {
	kubeconfig: kubeconfig,
});

export const natsNamespace = new k8s.core.v1.Namespace(
	"nats",
	{
		metadata: {
			name: "nats",
		},
	},
	{ provider: clusterProvider },
);

export const natsNamespaceName = natsNamespace.metadata.apply(
	(metadata) => metadata.name,
);

// Deploy NATS using Helm
const nats = new k8s.helm.v3.Chart(
	`${name}-nats`,
	{
		chart: "nats",
		version: "1.2.11",
		namespace: natsNamespaceName,
		fetchOpts: {
			repo: "https://nats-io.github.io/k8s/helm/charts",
		},
		values: {
			nats: {
				image: {
					tag: "2.10.0",
				},
				jetstream: {
					enabled: true,
					memStorage: {
						enabled: true,
						size: "2Gi",
					},
					fileStorage: {
						enabled: true,
						size: "10Gi",
					},
				},
			},
			natsbox: {
				enabled: true,
			},
		},
	},
	{ provider: clusterProvider },
);

new k8s.helm.v3.Release(
	`${name}-nats-release`,
	{
		chart: "nats",
		repositoryOpts: {
			repo: "https://nats-io.github.io/k8s/helm/charts",
		},
		version: "1.2.11",
		namespace: natsNamespaceName,
		values: {
			replicaCount: 2,
			persistence: {
				enabled: true,
				size: "2Gi",
			},
		},
	},
	{ provider: clusterProvider },
);

export const natsServiceName = pulumi.interpolate`${name}-nats-client`;
export const natsService = nats.getResource("v1/Service", "nats/nats").status;
export const natsReleaseServiceName = pulumi.interpolate`${name}-nats-release`;

export const postgresNamespace = new k8s.core.v1.Namespace(
	"postgres",
	{
		metadata: {
			name: "postgres",
		},
	},
	{ provider: clusterProvider },
);

export const postgresNamespaceName = postgresNamespace.metadata.apply(
	(metadata) => metadata.name,
);

const postgres = new k8s.helm.v3.Chart(
	`${name}-postgresql-ha`,
	{
		chart: "postgresql-ha",
		version: "15.3.4",
		namespace: postgresNamespaceName,
		fetchOpts: {
			repo: "https://charts.bitnami.com/bitnami",
		},
		values: {
			global: {
				postgresql: {
					username: "shallabuf",
					database: "shallabuf",
					replicationPassword: new random.RandomPassword("repl-password", {
						length: 16,
						special: false,
					}).result,
				},
			},
			postgresql: {
				image: {
					tag: "17.4.0",
				},
				replicaCount: 3,
				resources: {
					requests: {
						memory: "1Gi",
						cpu: "500m",
					},
					limits: {
						memory: "2Gi",
						cpu: "1000m",
					},
				},
				persistence: {
					enabled: true,
					size: "10Gi",
					storageClass: "standard",
				},
				pgpool: {
					replicaCount: 2,
					resources: {
						requests: {
							memory: "512Mi",
							cpu: "250m",
						},
						limits: {
							memory: "1Gi",
							cpu: "500m",
						},
					},
				},
			},
			metrics: {
				enabled: true,
				serviceMonitor: {
					enabled: true,
				},
			},
		},
	},
	{ provider: clusterProvider },
);

export const postgresServiceName = pulumi.interpolate`${name}-postgresql-ha-pgpool`;
export const postgresService = postgres.getResource(
	"v1/Service",
	"postgres/postgresql-ha-pgpool",
).status;
