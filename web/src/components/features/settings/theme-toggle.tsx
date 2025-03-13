"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function ThemeToggle() {
	const { setTheme } = useTheme();

	const setLightTheme = useCallback(() => {
		setTheme("light");
	}, [setTheme]);

	const setDarkTheme = useCallback(() => {
		setTheme("dark");
	}, [setTheme]);

	const setSystemTheme = useCallback(() => {
		setTheme("system");
	}, [setTheme]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon">
					<SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={setLightTheme}>
					<SunIcon className="mr-2 h-4 w-4" />
					<span>Light</span>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={setDarkTheme}>
					<MoonIcon className="mr-2 h-4 w-4" />
					<span>Dark</span>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={setSystemTheme}>
					<MonitorIcon className="mr-2 h-4 w-4" />
					<span>System</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
