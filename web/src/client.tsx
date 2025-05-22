/// <reference types="vinxi/types/client" />
import { hydrateRoot, createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start";
import { createRouter } from "./router";

export const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);

// Initialize stagewise toolbar in development mode
if (import.meta.env.DEV) {
  const initStagewise = async () => {
    const { StagewiseToolbar } = await import("@stagewise/toolbar-react");

    // Create stagewise config
    const stagewiseConfig = {
      plugins: [],
    };

    // Create a separate container for stagewise toolbar
    const stagewiseContainer = document.createElement("div");
    stagewiseContainer.id = "stagewise-toolbar-root";
    document.body.appendChild(stagewiseContainer);

    // Render stagewise toolbar in separate React root
    const stagewiseRoot = createRoot(stagewiseContainer);
    stagewiseRoot.render(<StagewiseToolbar config={stagewiseConfig} />);
  };

  initStagewise().catch(console.error);
}
