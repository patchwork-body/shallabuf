import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { setupPostgres } from "./components/postgres";
import { setupNats } from "./components/nats";
import { setupMinio } from "./components/minio";
import { setupRedis } from "./components/redis";

// Stack and environment detection
const config = new pulumi.Config();
const stack = pulumi.getStack();
const isDev = stack === "dev";

// Namespace
const ns = new k8s.core.v1.Namespace("app-ns", {
  metadata: { name: "app" },
});

// Components
setupPostgres(config, ns, isDev);
setupNats(ns, isDev);
setupMinio(ns);
setupRedis(ns);
