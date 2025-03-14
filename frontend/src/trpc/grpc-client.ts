import * as grpc from "@grpc/grpc-js";
import type { ServiceError } from "@grpc/grpc-js";
import { env } from "~/env";
import {
	AuthServiceClient,
	LoginRequest,
	type LoginResponse,
	LogoutRequest,
	type LogoutResponse,
	ValidateSessionRequest,
	type ValidateSessionResponse,
} from "~/generated/auth";

export const authClient = new AuthServiceClient(
	`${env.AUTH_HOST}:${env.AUTH_PORT}`,
	grpc.credentials.createInsecure(),
);

export const promisify = <I, O>(
	fn: (
		input: I,
		callback: (error: ServiceError | null, response: O) => void,
	) => void,
	input: I,
): Promise<O> => {
	return new Promise((resolve, reject) => {
		fn(input, (error, response) => {
			if (error) reject(error);
			else resolve(response);
		});
	});
};

export const auth = {
	login: async (input: LoginRequest): Promise<LoginResponse> => {
		return await promisify(
			authClient.login.bind(authClient),
			LoginRequest.create(input),
		);
	},
	logout: async (input: LogoutRequest): Promise<LogoutResponse> => {
		return await promisify(
			authClient.logout.bind(authClient),
			LogoutRequest.create(input),
		);
	},
	validateSession: async (
		input: ValidateSessionRequest,
	): Promise<ValidateSessionResponse> => {
		return await promisify(
			authClient.validateSession.bind(authClient),
			ValidateSessionRequest.create(input),
		);
	},
};
