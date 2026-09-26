import {
  ShallabufClient,
  ShallabufConfig,
} from "@shallabuf-sdk/core";

export class App {
  private appElement: HTMLElement;
  private ShallabufClient!: ShallabufClient;

  constructor() {
    this.appElement = document.getElementById("app")!;
    this.init().then(() => {
      console.log("App initialized");
    });
  }

  private async init(): Promise<void> {
    this.appElement.innerHTML = `
            <div class="content">
                <h1>shallabuf SDK Demo</h1>
                <div id="counter">
                    <h2>Counter</h2>
                    <div id="counterValue">0</div>
                    <button id="decrement">-</button>
                    <button id="increment">+</button>
                </div>
            </div>
        `;

    await this.initializeShallabuf();
  }

  private async initializeShallabuf(): Promise<void> {
    const config: ShallabufConfig = {
      wsUrl: "ws://localhost:8080",
    };

    this.ShallabufClient = new ShallabufClient(config, {
      onError: (event: Event) => console.error("WebSocket error:", event),
      onClose: (event: CloseEvent) => console.log("WebSocket closed"),
      onOpen: (event: Event) => console.log("WebSocket opened"),
    });

    const client = await this.ShallabufClient.init();
    console.log("shallabuf client initialized");

    const channel = await client.initChannel<{ counter: number }, { name: string }>({
      channelId: "test",
      initState: {
        counter: 0,
      },
    });

    // Create a function to update the UI
    const updateUI = (nextState: { counter: number }) => {
      document.getElementById("counterValue")!.textContent = nextState.counter.toString();
    };

    // Subscribe to state changes
    channel.watchState(updateUI);

    // Initial UI update
    updateUI(channel.state);

    // Add event listeners for counter buttons
    document.getElementById("increment")!.addEventListener("click", () => {
      channel.state.counter++;
    });

    document.getElementById("decrement")!.addEventListener("click", () => {
      channel.state.counter--;
    });
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new App();
});
