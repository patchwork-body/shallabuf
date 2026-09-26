import { StrictMode, startTransition } from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});

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
