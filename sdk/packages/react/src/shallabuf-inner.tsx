import {
  ShallabufClient,
  ConnectionState,
  ShallabufConfig,
  IWebSocketHandler,
} from "@shallabuf-sdk/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useShallabufWebSocketHandlerContext } from "./shallabuf-websocket-handler";

interface shallabufInnerContextType {
  client: ShallabufClient | null;
  connectionState: ConnectionState;
}

const ShallabufInnerContext = createContext<shallabufInnerContextType>({
  client: null,
  connectionState: "disconnected",
});

export interface ShallabufInnerProviderProps {
  children: React.ReactNode;
  config?: ShallabufConfig;
}

export const ShallabufProviderInner = ({
  config,
  children,
}: ShallabufInnerProviderProps) => {
  const isInitializing = useRef(false);
  const client = useRef<ShallabufClient | null>(null);
  const { connectionState, error, ...shallabufWebSocketHandler } =
    useShallabufWebSocketHandlerContext();

  const connect = useCallback(
    async (payload: Record<string, unknown> = {}) => {
      client.current = await new ShallabufClient(config, {
        ...shallabufWebSocketHandler,
      } as IWebSocketHandler).init(payload);

      isInitializing.current = false;
    },
    [shallabufWebSocketHandler, config]
  );

  useEffect(() => {
    if (!client.current && !isInitializing.current) {
      isInitializing.current = true;
      connect({ userId: config?.userId });
    }
  }, [connect, config?.userId]);

  const value = useMemo(
    () => ({
      client: client.current,
      connectionState,
    }),
    [connectionState]
  );

  return (
    <ShallabufInnerContext.Provider value={value}>
      {children}
    </ShallabufInnerContext.Provider>
  );
};

export const useShallabufInnerContext = () => {
  const context = useContext(ShallabufInnerContext);

  if (context === undefined) {
    throw new Error(
      "useShallabufInnerContext must be used within a ShallabufInnerContext"
    );
  }

  return context;
};

export const useShallabufClient = () => {
  const context = useShallabufInnerContext();

  if (!context) {
    throw new Error("useShallabufClient must be used within a ShallabufProvider");
  }

  return context;
};
