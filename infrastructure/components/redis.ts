import * as k8s from "@pulumi/kubernetes";

// Function to setup Redis
export function setupRedis(ns: k8s.core.v1.Namespace) {
  // Persistent Volume Claim for Redis data
  const redisPvc = new k8s.core.v1.PersistentVolumeClaim("redis-pvc", {
    metadata: { namespace: ns.metadata.name },
    spec: {
      accessModes: ["ReadWriteOnce"],
      resources: { requests: { storage: "1Gi" } },
    },
  });

  // Redis Deployment
  const redisDeployment = new k8s.apps.v1.Deployment("redis-deployment", {
    metadata: { namespace: ns.metadata.name, labels: { app: "redis" } },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: "redis" } },
      template: {
        metadata: { labels: { app: "redis" } },
        spec: {
          containers: [
            {
              name: "redis",
              image: "redis:latest",
              args: ["--save", "60", "1"], // Save every 60 seconds if at least 1 key changes
              ports: [{ containerPort: 6379 }],
              resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
              },
              volumeMounts: [
                { name: "redis-storage", mountPath: "/data" },
              ],
              livenessProbe: {
                exec: { command: ["redis-cli", "ping"] },
                initialDelaySeconds: 5,
                periodSeconds: 10,
              },
              readinessProbe: {
                exec: { command: ["redis-cli", "ping"] },
                initialDelaySeconds: 3,
                periodSeconds: 5,
              },
            },
          ],
          volumes: [
            {
              name: "redis-storage",
              persistentVolumeClaim: { claimName: redisPvc.metadata.name },
            },
          ],
        },
      },
    },
  });

  // Redis Service
  const redisService = new k8s.core.v1.Service("redis-svc", {
    metadata: { namespace: ns.metadata.name, labels: { app: "redis" } },
    spec: {
      type: "NodePort",
      selector: { app: "redis" },
      ports: [{ port: 6379, targetPort: 6379, nodePort: 30637 }],
    },
  });

  return { redisDeployment, redisService };
}
