import * as k8s from "@pulumi/kubernetes";

// Function to set up MinIO in Kubernetes
export function setupMinio(ns: k8s.core.v1.Namespace) {
  // MinIO Secret for credentials
  const minioSecret = new k8s.core.v1.Secret("minio-secret", {
    metadata: { namespace: ns.metadata.name },
    stringData: {
      MINIO_ROOT_USER: "admin",
      MINIO_ROOT_PASSWORD: "password",
    },
  });

  // Persistent Volume Claim for MinIO storage
  const minioPvc = new k8s.core.v1.PersistentVolumeClaim("minio-pvc", {
    metadata: { namespace: ns.metadata.name },
    spec: {
      accessModes: ["ReadWriteOnce"],
      resources: { requests: { storage: "5Gi" } },
    },
  });

  // MinIO Deployment
  const minioDeployment = new k8s.apps.v1.Deployment("minio-deployment", {
    metadata: { namespace: ns.metadata.name, labels: { app: "minio" } },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: "minio" } },
      template: {
        metadata: { labels: { app: "minio" } },
        spec: {
          containers: [
            {
              name: "minio",
              image: "minio/minio:latest",
              args: ["server", "/data", "--console-address", ":9001"],
              env: [
                {
                  name: "MINIO_ROOT_USER",
                  valueFrom: {
                    secretKeyRef: {
                      name: minioSecret.metadata.name,
                      key: "MINIO_ROOT_USER",
                    },
                  },
                },
                {
                  name: "MINIO_ROOT_PASSWORD",
                  valueFrom: {
                    secretKeyRef: {
                      name: minioSecret.metadata.name,
                      key: "MINIO_ROOT_PASSWORD",
                    },
                  },
                },
              ],
              ports: [
                { containerPort: 9000 }, // S3 API
                { containerPort: 9001 }, // MinIO Console
              ],
              resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
              },
              volumeMounts: [
                { name: "minio-storage", mountPath: "/data" },
              ],
            },
          ],
          volumes: [
            {
              name: "minio-storage",
              persistentVolumeClaim: { claimName: minioPvc.metadata.name },
            },
          ],
        },
      },
    },
  });

  // MinIO Service
  const minioService = new k8s.core.v1.Service("minio-svc", {
    metadata: { namespace: ns.metadata.name, labels: { app: "minio" } },
    spec: {
      type: "NodePort",
      selector: { app: "minio" },
      ports: [
        { name: "s3-api", port: 9000, targetPort: 9000, nodePort: 30900 },
        { name: "console", port: 9001, targetPort: 9001, nodePort: 30901 },
      ],
    },
  });

  return { minioDeployment, minioService };
}
