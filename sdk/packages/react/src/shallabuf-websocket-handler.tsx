import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  useMemo,
} from "react";
import { ConnectionState, IWebSocketHandler } from "@shallabuf-sdk/core";

interface ShallabufWebSocketHandlerContextType extends IWebSocketHandler {
  connectionState: ConnectionState;
  error: Event | null;
}

const ShallabufWebSocketHandlerContext =
  createContext<ShallabufWebSocketHandlerContextType>({
    connectionState: "disconnected",
    error: null,
    onError: () => {},
    onClose: () => {},
    onOpen: () => {},
  });

export const ShallabufWebSocketHandlerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  const [error, setError] = useState<Event | null>(null);

  const onError = useCallback((event: Event) => {
    setError(event);
    setConnectionState("disconnected");
  }, []);

  const onClose = useCallback((event: CloseEvent) => {
    setConnectionState("disconnected");
  }, []);

  const onOpen = useCallback((event: Event) => {
    setConnectionState("connected");
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      connectionState,
      error,
      onError,
      onClose,
      onOpen,
    }),
    [connectionState, error, onError, onClose, onOpen]
  );

  return (
    <ShallabufWebSocketHandlerContext.Provider value={value}>
      {children}
    </ShallabufWebSocketHandlerContext.Provider>
  );
};

export const useShallabufWebSocketHandlerContext = () => {
  const context = useContext(ShallabufWebSocketHandlerContext);

  if (context === undefined) {
    throw new Error(
      "useShallabufWebSocketHandlerContext must be used within a shallabufWebSocketHandlerProvider"
    );
  }

  return context;
};
