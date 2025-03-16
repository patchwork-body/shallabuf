import * as pulumi from "@pulumi/pulumi";

export interface ServiceConfig {
	name: string;
	namespace: string;
	version: string;
}

export interface DatabaseConfig {
	host: string;
	port: number;
	database: string;
	username: string;
	password: pulumi.Output<string>;
}

export interface RedisConfig {
	host: string;
	port: number;
	password: pulumi.Output<string>;
}

export interface MinioConfig {
	accessKey: string;
	secretKey: pulumi.Output<string>;
	bucketName: string;
}

export interface GrafanaConfig {
	adminUser: string;
	adminPassword: pulumi.Output<string>;
	domain: string;
}

export interface NatsConfig {
	host: string;
	port: number;
	user: string;
	password: pulumi.Output<string>;
}

export interface GlobalConfig {
	project: string;
	region: string;
	zone: string;
	clusterName: string;
}

// Helper function to get config with proper typing
export function getConfig(name: string): pulumi.Config {
	return new pulumi.Config(name);
}

// Helper function to get secret from config
export function getSecret(
	config: pulumi.Config,
	name: string,
): pulumi.Output<string> {
	return config.requireSecret(name);
}
