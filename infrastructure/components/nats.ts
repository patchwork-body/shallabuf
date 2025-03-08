import * as k8s from "@pulumi/kubernetes";

// Function to set up NATS in Kubernetes
export function setupNats(ns: k8s.core.v1.Namespace, isDev: boolean) {
  // Define the NATS ConfigMap (if needed for environment variables)
  new k8s.core.v1.ConfigMap("nats-config", {
    metadata: { namespace: ns.metadata.name },
    data: {
      NATS_SERVER_NAME: "nats-server",
    },
  });

  // Create the NATS Deployment
  const natsDeployment = new k8s.apps.v1.Deployment("nats-deployment", {
    metadata: { namespace: ns.metadata.name, labels: { app: "nats" } },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: "nats" } },
      template: {
        metadata: { labels: { app: "nats" } },
        spec: {
          containers: [
            {
              name: "nats",
              image: "nats:latest",
              args: ["-js", "-m", "8222"], // Enable JetStream and Monitoring
              ports: [
                { containerPort: 4222 }, // Client port
                { containerPort: 8222 }, // Monitoring port
              ],
              resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
              },
            },
          ],
        },
      },
    },
  });

  // Create a Service to expose NATS
  const natsService = new k8s.core.v1.Service("nats-svc", {
    metadata: { namespace: ns.metadata.name, labels: { app: "nats" } },
    spec: {
      type: "NodePort",
      selector: { app: "nats" },
      ports: [
        { name: "client", port: 4222, targetPort: 4222, nodePort: 30422 },
        { name: "monitor", port: 8222, targetPort: 8222, nodePort: 30822 },
      ],
    },
  });

  if (isDev) {
    new k8s.apps.v1.Deployment("nats-box", {
      metadata: {
        namespace: ns.metadata.name,
        labels: { app: "nats-box" },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: "nats-box" } },
        template: {
          metadata: { labels: { app: "nats-box" } },
          spec: {
            containers: [
              {
                name: "nats-box",
                image: "natsio/nats-box:latest",
                command: ["tail", "-f", "/dev/null"],
                resources: {
                  requests: {
                    cpu: "100m",
                    memory: "128Mi",
                  },
                  limits: {
                    cpu: "200m",
                    memory: "256Mi",
                  },
                },
              },
            ],
          },
        },
      },
    });
  }

  return { natsDeployment, natsService };
}
