import * as grpc from "@grpc/grpc-js";
import type { ServiceError } from "@grpc/grpc-js";
import type { Metadata } from "@grpc/grpc-js";
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
import {
	CreatePipelineRequest,
	type CreatePipelineResponse,
	ListPipelinesRequest,
	type ListPipelinesResponse,
	PipelineServiceClient,
} from "~/generated/pipeline";
import {
	MeRequest,
	type MeResponse,
	UserServiceClient,
} from "~/generated/user";

export const authClient = new AuthServiceClient(
	`${env.AUTH_HOST}:${env.AUTH_PORT}`,
	grpc.credentials.createInsecure(),
);

type GrpcMethodCallback<I, O> = (
	error: ServiceError | null,
	response: O,
) => void;

type GrpcMethod<I, O> =
	| ((input: I, callback: GrpcMethodCallback<I, O>) => void)
	| ((
			input: I,
			metadata: Metadata,
			callback: GrpcMethodCallback<I, O>,
	  ) => void);

export const promisify = <I, O>(
	fn: GrpcMethod<I, O>,
	input: I,
	metadata?: Metadata,
): Promise<O> => {
	return new Promise((resolve, reject) => {
		if (metadata) {
			(
				fn as (
					input: I,
					metadata: Metadata,
					callback: GrpcMethodCallback<I, O>,
				) => void
			)(input, metadata, (error, response) => {
				if (error) reject(error);
				else resolve(response);
			});
		} else {
			(fn as (input: I, callback: GrpcMethodCallback<I, O>) => void)(
				input,
				(error, response) => {
					if (error) reject(error);
					else resolve(response);
				},
			);
		}
	});
};

export const auth = {
	login: async (
		input: LoginRequest,
		metadata?: Metadata,
	): Promise<LoginResponse> => {
		return await promisify(
			authClient.login.bind(authClient),
			LoginRequest.create(input),
			metadata,
		);
	},
	logout: async (metadata?: Metadata): Promise<LogoutResponse> => {
		return await promisify(
			authClient.logout.bind(authClient),
			LogoutRequest.create(),
			metadata,
		);
	},
	validateSession: async (
		metadata?: Metadata,
	): Promise<ValidateSessionResponse> => {
		return await promisify(
			authClient.validateSession.bind(authClient),
			ValidateSessionRequest.create(),
			metadata,
		);
	},
};

export const userClient = new UserServiceClient(
	`${env.USER_HOST}:${env.USER_PORT}`,
	grpc.credentials.createInsecure(),
);

export const user = {
	me: async (metadata?: Metadata): Promise<MeResponse> => {
		return await promisify(
			userClient.me.bind(userClient),
			MeRequest.create(),
			metadata,
		);
	},
};

export const pipelineClient = new PipelineServiceClient(
	`${env.PIPELINE_HOST}:${env.PIPELINE_PORT}`,
	grpc.credentials.createInsecure(),
);

export const pipeline = {
	list: async (
		input: ListPipelinesRequest,
		metadata?: Metadata,
	): Promise<ListPipelinesResponse> => {
		return await promisify(
			pipelineClient.list.bind(pipelineClient),
			ListPipelinesRequest.create(input),
			metadata,
		);
	},
	create: async (
		input: CreatePipelineRequest,
		metadata?: Metadata,
	): Promise<CreatePipelineResponse> => {
		return await promisify(
			pipelineClient.create.bind(pipelineClient),
			CreatePipelineRequest.create(input),
			metadata,
		);
	},
};
