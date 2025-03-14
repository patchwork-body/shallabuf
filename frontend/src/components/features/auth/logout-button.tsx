"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";

export const LogoutButton = () => {
	const router = useRouter();

	const logoutMutation = trpc.auth.logout.useMutation({
		onSuccess: () => {
			router.push("/auth/login");
		},
	});

	const logout = useCallback(async () => {
		await logoutMutation.mutateAsync();
	}, [logoutMutation.mutateAsync]);

	return (
		<Button variant="outline" onClick={logout}>
			Logout
		</Button>
	);
};
