"use client";

import React from "react";
import { ShallabufConfig } from "@shallabuf-sdk/core";
import { ShallabufWebSocketHandlerProvider } from "./shallabuf-websocket-handler";
import { ShallabufProviderInner } from "./shallabuf-inner";

export interface shallabufProviderProps {
  children: React.ReactNode;
  config?: ShallabufConfig;
}

export const ShallabufProvider = ({ children, config }: shallabufProviderProps) => {
  return (
    <ShallabufWebSocketHandlerProvider>
      <ShallabufProviderInner config={config}>{children}</ShallabufProviderInner>
    </ShallabufWebSocketHandlerProvider>
  );
};

export { useShallabufClient } from "./shallabuf-inner";
export { useChannel } from "./use-channel";
export { useWatchMembers } from "./use-watch-members";
export { useWatchState } from "./use-watch-state";