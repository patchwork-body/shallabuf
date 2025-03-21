"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "~/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormFieldMessage,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { loginSchema } from "~/lib/schemas";
import { trpc } from "~/trpc/client";

type FormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
	const router = useRouter();
	const form = useForm<FormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const loginMutation = trpc.auth.login.useMutation({
		onSuccess: () => {
			// Redirect to pipelines page on successful login
			router.push("/orgs");
		},
	});

	const submit = useCallback(
		async (values: FormValues) => {
			await loginMutation.mutateAsync(values);
		},
		[loginMutation.mutateAsync],
	);

	return (
		<main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
			<Card className="min-w-[400px] border border-primary/10 shadow-xl backdrop-blur-sm bg-card/80">
				<CardHeader className="space-y-1">
					<h2 className="text-2xl font-bold text-primary">Welcome Back</h2>
					<p className="text-sm text-muted-foreground">
						Sign in to your account
					</p>
				</CardHeader>

				<CardContent>
					<Form {...form}>
						<form
							className="flex flex-col items-center gap-4"
							onSubmit={form.handleSubmit(submit)}
						>
							<FormField
								name="email"
								control={form.control}
								render={({ field }) => (
									<FormItem className="min-w-full">
										<FormLabel className="text-primary">Email</FormLabel>

										<FormControl>
											<Input
												{...field}
												autoComplete="email"
												className="border-primary/10 focus:border-primary/30 bg-background/50 focus:bg-background/80 transition-colors"
											/>
										</FormControl>

										<FormFieldMessage />
									</FormItem>
								)}
							/>

							<FormField
								name="password"
								control={form.control}
								render={({ field }) => (
									<FormItem className="min-w-full">
										<FormLabel className="text-primary">Password</FormLabel>

										<FormControl>
											<Input
												type="password"
												{...field}
												autoComplete="current-password"
												className="border-primary/10 focus:border-primary/30 bg-background/50 focus:bg-background/80 transition-colors"
											/>
										</FormControl>

										<FormFieldMessage />
									</FormItem>
								)}
							/>

							<FormMessage />

							<Button
								type="submit"
								className="mt-4 min-w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
								disabled={loginMutation.isPending}
							>
								{loginMutation.isPending ? "Signing in..." : "Sign in"}
							</Button>
						</form>
					</Form>
				</CardContent>

				<CardFooter>
					<Button
						variant="link"
						asChild
						className="text-primary hover:text-primary/80 transition-colors"
					>
						<Link href="/auth/registration" className="mt-4">
							Don't have an account? Sign up
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}
