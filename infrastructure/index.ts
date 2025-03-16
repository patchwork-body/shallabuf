import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const name = "shallabuf";
const config = new pulumi.Config("gcp");
const project = config.require("project");

const provider = new gcp.Provider("gcp", {
	project: project,
	region: "europe-central2",
	zone: "europe-central2-a",
});

const network = new gcp.compute.Network(`${name}-network`, {
	name: `${name}-network`,
	autoCreateSubnetworks: false,
});

const subnet = new gcp.compute.Subnetwork(`${name}-subnet`, {
	name: `${name}-subnet`,
	ipCidrRange: "10.0.0.0/20",
	network: network.id,
	region: "europe-central2",
	secondaryIpRanges: [
		{
			rangeName: "pods",
			ipCidrRange: "10.16.0.0/12",
		},
		{
			rangeName: "services",
			ipCidrRange: "10.32.0.0/16",
		},
	],
});

const engineVersion = gcp.container
	.getEngineVersions({
		location: "europe-central2-a",
		project: "hale-runner-453815-p5",
	})
	.then((versions) => versions.latestMasterVersion);

const cluster = new gcp.container.Cluster(name, {
	initialNodeCount: 2,
	minMasterVersion: engineVersion,
	nodeVersion: engineVersion,
	location: "europe-central2-a",
	deletionProtection: false,
	network: network.name,
	subnetwork: subnet.name,
	masterAuthorizedNetworksConfig: {
		cidrBlocks: [
			{
				cidrBlock: "178.148.164.243/32",
				displayName: "My IP",
			},
		],
	},
	privateClusterConfig: {
		enablePrivateNodes: true,
		enablePrivateEndpoint: false,
		masterIpv4CidrBlock: "172.16.0.0/28",
	},
	ipAllocationPolicy: {
		clusterSecondaryRangeName: "pods",
		servicesSecondaryRangeName: "services",
	},
	nodeConfig: {
		machineType: "e2-standard-2",
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

export const ns = new k8s.core.v1.Namespace(
	`${name}-ns`,
	{
		metadata: {
			name: `${name}-ns`,
		},
	},
	{ provider: clusterProvider },
);

export const namespaceName = ns.metadata.apply((metadata) => metadata.name);

const postgres = new k8s.helm.v3.Release(
	`${name}-postgres`,
	{
		chart: "bitnami/postgresql",
		version: "16.5.0",
		namespace: namespaceName,
		values: {
			global: {
				storageClass: "standard",
			},
			auth: {
				postgresPassword: "secret",
				database: "shallabuf",
			},
			primary: {
				persistence: {
					enabled: true,
					size: "10Gi",
					storageClass: "standard",
				},
				resources: {
					requests: {
						memory: "256Mi",
						cpu: "250m",
					},
					limits: {
						memory: "512Mi",
						cpu: "500m",
					},
				},
			},
			metrics: {
				enabled: false,
			},
			volumePermissions: {
				enabled: true,
			},
		},
		skipAwait: true,
	},
	{ provider: clusterProvider },
);

export const postgresService = postgres.status.apply((status) => status?.name);

const nats = new k8s.helm.v3.Release(
	`${name}-nats`,
	{
		chart: "bitnami/nats",
		version: "9.0.6",
		namespace: namespaceName,
		values: {
			jetstream: {
				enabled: true,
			},
			persistence: {
				enabled: true,
				size: "10Gi",
			},
			resources: {
				requests: {
					memory: "128Mi",
					cpu: "100m",
				},
				limits: {
					memory: "256Mi",
					cpu: "250m",
				},
			},
			startupProbe: {
				enabled: true,
				failureThreshold: 30,
				periodSeconds: 10,
			},
			livenessProbe: {
				enabled: true,
				initialDelaySeconds: 30,
				periodSeconds: 10,
				timeoutSeconds: 5,
				failureThreshold: 6,
			},
			readinessProbe: {
				enabled: true,
				initialDelaySeconds: 5,
				periodSeconds: 10,
				timeoutSeconds: 5,
				failureThreshold: 6,
			},
		},
	},
	{ provider: clusterProvider },
);

export const natsService = nats.status.apply((status) => status?.name);

const minio = new k8s.helm.v3.Release(
	`${name}-minio`,
	{
		chart: "bitnami/minio",
		version: "15.0.7",
		namespace: namespaceName,
		values: {
			auth: {
				rootUser: "admin",
				rootPassword: "supersecret",
			},
			mode: "standalone",
			persistence: {
				enabled: true,
				size: "10Gi",
				storageClass: "standard",
			},
			resources: {
				requests: {
					memory: "128Mi",
					cpu: "100m",
				},
				limits: {
					memory: "256Mi",
					cpu: "250m",
				},
			},
			startupProbe: {
				enabled: true,
				failureThreshold: 30,
				periodSeconds: 10,
			},
			livenessProbe: {
				enabled: true,
				initialDelaySeconds: 30,
				periodSeconds: 10,
				timeoutSeconds: 5,
				failureThreshold: 6,
			},
			readinessProbe: {
				enabled: true,
				initialDelaySeconds: 5,
				periodSeconds: 10,
				timeoutSeconds: 5,
				failureThreshold: 6,
			},
		},
		timeout: 600,
		skipAwait: true,
	},
	{ provider: clusterProvider },
);

export const minioService = minio.status.apply((status) => status?.name);

const redis = new k8s.helm.v3.Release(
	`${name}-redis`,
	{
		chart: "bitnami/redis",
		version: "20.11.3",
		namespace: namespaceName,
		values: {
			architecture: "standalone",
			auth: {
				enabled: true,
				password: "secret",
			},
			master: {
				persistence: {
					enabled: true,
					size: "10Gi",
					storageClass: "standard",
				},
				resources: {
					requests: {
						memory: "128Mi",
						cpu: "100m",
					},
					limits: {
						memory: "256Mi",
						cpu: "250m",
					},
				},
			},
			replica: {
				replicaCount: 0,
			},
			metrics: {
				enabled: false,
			},
		},
		timeout: 600,
		skipAwait: true,
	},
	{ provider: clusterProvider },
);

export const redisService = redis.status.apply((status) => status?.name);

const grafanaIp = new gcp.compute.GlobalAddress(`${name}-grafana-ip`, {
	name: `${name}-grafana-ip`,
});

const sslPolicy = new gcp.compute.SSLPolicy(`${name}-ssl-policy`, {
	name: "grafana-ssl-policy",
	minTlsVersion: "TLS_1_2",
	profile: "MODERN",
});

const managedCert = new k8s.apiextensions.CustomResource(
	`${name}-managed-cert`,
	{
		apiVersion: "networking.gke.io/v1",
		kind: "ManagedCertificate",
		metadata: {
			name: "grafana-certificate",
			namespace: namespaceName,
			annotations: {
				"networking.gke.io/certificates": "grafana-certificate",
			},
		},
		spec: {
			domains: ["grafana.shallabuf.com"],
		},
	},
	{ provider: clusterProvider },
);

const frontendConfig = new k8s.apiextensions.CustomResource(
	`${name}-frontend-config`,
	{
		apiVersion: "networking.gke.io/v1beta1",
		kind: "FrontendConfig",
		metadata: {
			name: "grafana-frontend-config",
			namespace: namespaceName,
		},
		spec: {
			sslPolicy: "grafana-ssl-policy",
			redirectToHttps: {
				enabled: true,
				responseCodeName: "MOVED_PERMANENTLY_DEFAULT",
			},
		},
	},
	{ provider: clusterProvider },
);

const oauthSecret = new k8s.core.v1.Secret(
	`${name}-oauth-secret`,
	{
		metadata: {
			name: "grafana-oauth-secret",
			namespace: namespaceName,
		},
		stringData: {
			client_id:
				"37115128573-46gu6b5k8k1i577qnqm644iv0217eodo.apps.googleusercontent.com",
			client_secret: "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",
		},
	},
	{ provider: clusterProvider },
);

const backendConfig = new k8s.apiextensions.CustomResource(
	`${name}-backend-config`,
	{
		apiVersion: "cloud.google.com/v1",
		kind: "BackendConfig",
		metadata: {
			name: "grafana-backend-config",
			namespace: namespaceName,
		},
		spec: {
			iap: {
				enabled: true,
				oauthclientCredentials: {
					secretName: "grafana-oauth-secret",
				},
			},
			healthCheck: {
				checkIntervalSec: 15,
				port: 3000,
				type: "HTTP",
				requestPath: "/api/health",
			},
			securityPolicy: {
				name: sslPolicy.name,
			},
		},
	},
	{ provider: clusterProvider },
);

// Create IAP Web IAM binding for the backend service
const iapSettings = new gcp.iap.WebBackendServiceIamBinding(
	`${name}-iap-binding`,
	{
		project: project,
		webBackendService:
			"k8s1-154d377f-shallabuf-n-shallabuf-grafana-a942d9-300-31871577",
		role: "roles/iap.httpsResourceAccessor",
		members: ["user:personal.gugfug@gmail.com"],
	},
	{ provider },
);

const grafana = new k8s.helm.v3.Release(
	`${name}-grafana`,
	{
		chart: "bitnami/grafana",
		version: "11.6.0",
		namespace: namespaceName,
		values: {
			admin: {
				user: "admin",
				password: "supersecret",
			},
			service: {
				type: "NodePort",
				annotations: {
					"cloud.google.com/backend-config": `{"default": "${backendConfig.metadata.name}"}`,
					"cloud.google.com/neg": `{"ingress": true}`,
				},
			},
			ingress: {
				enabled: true,
				hostname: "grafana.shallabuf.com",
				annotations: {
					"kubernetes.io/ingress.class": "gce",
					"networking.gke.io/managed-certificates": "grafana-certificate",
					"networking.gke.io/v1beta1.FrontendConfig": "grafana-frontend-config",
					"kubernetes.io/ingress.allow-http": "false",
				},
				tls: true,
			},
			persistence: {
				enabled: true,
				size: "10Gi",
				storageClass: "standard",
				accessModes: ["ReadWriteOnce"],
			},
			env: {
				GF_SERVER_ROOT_URL: "https://grafana.shallabuf.com",
				GF_AUTH_DISABLE_LOGIN_FORM: "false",
				GF_AUTH_OAUTH_AUTO_LOGIN: "false",
			},
			resources: {
				requests: {
					memory: "128Mi",
					cpu: "100m",
				},
				limits: {
					memory: "256Mi",
					cpu: "250m",
				},
			},
		},
		skipAwait: true,
		timeout: 600,
	},
	{ provider: clusterProvider },
);

export const grafanaService = grafana.status.apply((status) => status?.name);
